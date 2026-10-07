import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export interface UserCoordinate {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: 'gps' | 'manual' | 'geocoded';
}

type CoordinateSelection = Omit<UserCoordinate, 'source'> & { source?: UserCoordinate['source'] };

function addressLabel(address: Location.LocationGeocodedAddress) {
  return [address.streetNumber, address.street, address.district, address.city].filter(Boolean).join(', ');
}

export function useCurrentLocation() {
  const [coordinate, setCoordinate] = useState<UserCoordinate | null>(null);
  const [label, setLabel] = useState('');
  const selection = useRef(0);
  const labelRevision = useRef(0);
  useEffect(
    () => () => {
      selection.current += 1;
    },
    [],
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'error'>('idle');

  const commitCoordinate = useCallback(async (next: CoordinateSelection, revision: number) => {
    const currentLabelRevision = ++labelRevision.current;
    const selected: UserCoordinate = { ...next, source: next.source ?? 'manual' };
    setCoordinate(selected);
    setLabel('');
    setStatus('granted');
    try {
      const addresses = await Location.reverseGeocodeAsync(selected);
      if (selection.current === revision && labelRevision.current === currentLabelRevision) {
        setLabel(addresses[0] ? addressLabel(addresses[0]) : '');
      }
    } catch {
      // Keep the current label: an older geocoder failure must not clear newer input.
    }
    return selected;
  }, []);

  const selectCoordinate = useCallback(
    (next: CoordinateSelection) => commitCoordinate(next, ++selection.current),
    [commitCoordinate],
  );

  const editLabel = useCallback((value: string) => {
    labelRevision.current += 1;
    setLabel(value);
  }, []);

  const requestLocation = useCallback(async () => {
    const revision = ++selection.current;
    setStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (revision !== selection.current) return null;
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setStatus('denied');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (revision !== selection.current) return null;
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'gps' as const,
      };
      return await commitCoordinate(next, revision);
    } catch {
      if (revision === selection.current) setStatus('error');
      return null;
    }
  }, [commitCoordinate]);

  return { coordinate, label, status, requestLocation, selectCoordinate, setLabel: editLabel };
}
