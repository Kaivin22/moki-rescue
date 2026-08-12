import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface UserCoordinate {
  latitude: number;
  longitude: number;
}

export function useCurrentLocation(requestOnMount = false) {
  const [coordinate, setCoordinate] = useState<UserCoordinate | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'error'>('idle');

  const requestLocation = useCallback(async () => {
    setStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setStatus('denied');
        return null;
      }
      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 1000 });
      const position = lastKnown ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoordinate(next);
      setStatus('granted');
      return next;
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => {
    if (requestOnMount) void requestLocation();
  }, [requestLocation, requestOnMount]);

  return { coordinate, status, requestLocation };
}
