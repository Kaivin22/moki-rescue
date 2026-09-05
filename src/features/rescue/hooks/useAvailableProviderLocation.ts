import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { RescueDistance, RescueTiming } from '../config/operational';
import { isValidProviderAccuracy } from '../services/locationAccuracy';
import {
  startAvailabilityBackgroundTracking,
  stopAvailabilityBackgroundTracking,
  publishAvailabilityPosition,
} from '../services/availabilityBackgroundLocation';

export function useAvailableProviderLocation(enabled: boolean) {
  const [state, setState] = useState<'idle' | 'tracking' | 'foreground_only' | 'denied' | 'error'>('idle');

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      void stopAvailabilityBackgroundTracking().catch(() => undefined);
      return;
    }
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let sending = false;
    let background = false;
    const publish = async (position: Location.LocationObject) => {
      if (!mounted || sending) return;
      if (!isValidProviderAccuracy(position.coords.accuracy)) {
        setState('error');
        return;
      }
      sending = true;
      try {
        const sent = await publishAvailabilityPosition(position);
        if (mounted) setState(sent ? (background ? 'tracking' : 'foreground_only') : 'error');
      } catch {
        if (mounted) setState('error');
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
        if (!mounted) {
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
  }, [enabled]);

  return state;
}
