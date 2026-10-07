import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClientError } from '../api/client';
import { rescueKeys } from './useRescueQueries';
import { RescueDistance, RescueTiming } from '../config/operational';
import { isValidProviderAccuracy } from '../services/locationAccuracy';
import {
  startAvailabilityBackgroundTracking,
  stopAvailabilityBackgroundTracking,
  publishAvailabilityPosition,
} from '../services/availabilityBackgroundLocation';

export function useAvailableProviderLocation(enabled: boolean) {
  const client = useQueryClient();
  const [state, setState] = useState<
    'idle' | 'tracking' | 'foreground_only' | 'denied' | 'error' | 'outside_area'
  >('idle');
  const [previouslyEnabled, setPreviouslyEnabled] = useState(enabled);
  if (enabled !== previouslyEnabled) {
    setPreviouslyEnabled(enabled);
    if (enabled || state !== 'outside_area') setState('idle');
  }

  useEffect(() => {
    if (!enabled) {
      void stopAvailabilityBackgroundTracking().catch(() => undefined);
      return;
    }
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let sending = false;
    let background = false;
    let stoppedForArea = false;
    const publish = async (position: Location.LocationObject) => {
      if (!mounted || sending || stoppedForArea) return;
      if (!isValidProviderAccuracy(position.coords.accuracy)) {
        setState('error');
        return;
      }
      sending = true;
      try {
        const sent = await publishAvailabilityPosition(position);
        if (mounted) setState(sent ? (background ? 'tracking' : 'foreground_only') : 'error');
      } catch (error) {
        if (error instanceof ApiClientError && error.code === 'PROVIDER_OUTSIDE_SERVICE_AREA') {
          stoppedForArea = true;
          if (mounted) setState('outside_area');
          subscription?.remove();
          if (heartbeat) clearInterval(heartbeat);
          await stopAvailabilityBackgroundTracking().catch(() => undefined);
          void client.invalidateQueries({ queryKey: rescueKeys.providerStatus });
          void client.invalidateQueries({ queryKey: rescueKeys.offers });
        } else if (mounted) setState('error');
      } finally {
        sending = false;
      }
    };
    void Location.requestForegroundPermissionsAsync()
      .then(async (permission) => {
        if (!mounted) return;
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          if (mounted) setState('denied');
          return;
        }
        background = await startAvailabilityBackgroundTracking().catch(() => false);
        if (!mounted) return;
        if (!background) setState('foreground_only');
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: RescueTiming.availabilityLocationIntervalMs,
            distanceInterval: RescueDistance.availabilityLocationMeters,
          },
          (position) => void publish(position),
        );
        if (!mounted || stoppedForArea) {
          subscription.remove();
          return;
        }
        // Stationary providers also need a fresh sample, not only distance-based events.
        heartbeat = setInterval(() => {
          if (AppState.currentState !== 'active') return;
          void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
            .then(publish)
            .catch(() => {
              if (mounted) setState('error');
            });
        }, RescueTiming.availabilityLocationIntervalMs);
      })
      .catch(() => {
        if (mounted) setState('error');
      });
    return () => {
      mounted = false;
      subscription?.remove();
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [enabled, client]);

  return state;
}
