import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { flushProviderLocation, queueProviderLocation } from '../services/providerLocationOutbox';
import {
  startProviderBackgroundTracking,
  stopProviderBackgroundTracking,
} from '../services/backgroundLocation';
import { RescueDistance, RescueTiming } from '../config/operational';
import { isValidProviderAccuracy } from '../services/locationAccuracy';

export function useProviderTracking(requestId: string, enabled: boolean) {
  const sending = useRef(false);
  const [state, setState] = useState<'idle' | 'requesting' | 'tracking' | 'denied' | 'error'>('idle');

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      void stopProviderBackgroundTracking().catch(() => undefined);
      return;
    }
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;
    setState('requesting');

    void Location.requestForegroundPermissionsAsync()
      .then(async (permission) => {
        if (!mounted) return;
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setState('denied');
          return;
        }
        await flushProviderLocation(requestId).catch(() => undefined);
        await startProviderBackgroundTracking(requestId).catch(() => false);
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: RescueTiming.activeLocationIntervalMs,
            distanceInterval: RescueDistance.activeLocationMeters,
          },
          async (position) => {
            if (sending.current) return;
            if (!isValidProviderAccuracy(position.coords.accuracy)) {
              if (mounted) setState('error');
              return;
            }
            sending.current = true;
            const point = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyM: position.coords.accuracy,
              recordedAt: new Date(position.timestamp).toISOString(),
            };
            try {
              await queueProviderLocation(requestId, point);
              const result = await flushProviderLocation(requestId);
              if (mounted) setState(result === 'sent' ? 'tracking' : 'error');
            } catch {
              if (mounted) setState('error');
            } finally {
              sending.current = false;
            }
          },
        );
      })
      .catch(() => {
        if (mounted) setState('error');
      });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [enabled, requestId]);

  return state;
}
