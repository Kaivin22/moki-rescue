import { validCoordinate } from '@/src/features/maps/mapDocument';
import type { RequestDetails } from '@/src/types/rescue';

export function navigationDestination(
  request: Pick<
    RequestDetails,
    | 'status'
    | 'activeWorkType'
    | 'pickupLatitude'
    | 'pickupLongitude'
    | 'destinationLatitude'
    | 'destinationLongitude'
  >,
) {
  const transporting =
    request.activeWorkType === 'transport' &&
    ['transporting', 'awaiting_completion'].includes(request.status);
  const point = transporting
    ? { latitude: request.destinationLatitude, longitude: request.destinationLongitude }
    : { latitude: request.pickupLatitude, longitude: request.pickupLongitude };
  if (!validCoordinate(point)) throw new Error('NAVIGATION_DESTINATION_INVALID');
  return point;
}

export function googleMapsNavigationUrl(point: { latitude: number; longitude: number }): string {
  if (!validCoordinate(point)) throw new Error('NAVIGATION_DESTINATION_INVALID');
  const destination = `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
  // No origin: Google Maps uses the provider's current device location.
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=two-wheeler&dir_action=navigate`;
}
