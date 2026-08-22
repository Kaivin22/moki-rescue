import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

export interface UserCoordinate {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

function addressLabel(address: Location.LocationGeocodedAddress) {
  return [address.streetNumber, address.street, address.district, address.city].filter(Boolean).join(', ');
}

export function useCurrentLocation() {
  const [coordinate, setCoordinate] = useState<UserCoordinate | null>(null);
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'error'>('idle');

  const selectCoordinate = useCallback(async (next: UserCoordinate) => {
    setCoordinate(next);
    setLabel('');
    setStatus('granted');
    try {
      const addresses = await Location.reverseGeocodeAsync(next);
      setLabel(addresses[0] ? addressLabel(addresses[0]) : '');
    } catch {
      setLabel('');
    }
    return next;
  }, []);

  const requestLocation = useCallback(async () => {
    setStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setStatus('denied');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      return await selectCoordinate(next);
    } catch {
      setStatus('error');
      return null;
    }
  }, [selectCoordinate]);

  return { coordinate, label, status, requestLocation, selectCoordinate, setLabel };
}
