import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { rescueApi } from '../api/rescueApi';
import { RescueDistance, RescueTiming } from '../config/operational';
import { isValidProviderAccuracy } from '../services/locationAccuracy';

export function useAvailableProviderLocation(enabled: boolean) {
  const [state, setState] = useState<'idle' | 'tracking' | 'denied' | 'error'>('idle');

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      return;
    }
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;
    void Location.requestForegroundPermissionsAsync()
      .then(async (permission) => {
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          if (mounted) setState('denied');
          return;
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: RescueTiming.availabilityLocationIntervalMs,
            distanceInterval: RescueDistance.availabilityLocationMeters,
          },
          async (position) => {
            if (!isValidProviderAccuracy(position.coords.accuracy)) {
              if (mounted) setState('error');
              return;
            }
            try {
              await rescueApi.saveProviderAvailabilityLocation(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy,
              );
              if (mounted) setState('tracking');
            } catch {
              if (mounted) setState('error');
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
  }, [enabled]);

  return state;
}
