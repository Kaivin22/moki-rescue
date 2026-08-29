import { useEffect, useState } from 'react';
import { subscribeToProviderLocation } from '../services/liveLocation';
import type { LocationPoint } from '@/src/types/rescue';

export function useRescueRealtime(
  requestId: string,
  assignedProviderId: string | null | undefined,
  requestLocation: LocationPoint | null | undefined,
) {
  const [liveLocation, setLiveLocation] = useState<LocationPoint | null>(null);

  useEffect(() => setLiveLocation(requestLocation ?? null), [requestLocation]);
  useEffect(() => {
    if (!assignedProviderId) return;
    return subscribeToProviderLocation(requestId, setLiveLocation);
  }, [assignedProviderId, requestId]);

  return liveLocation ?? requestLocation ?? null;
}
