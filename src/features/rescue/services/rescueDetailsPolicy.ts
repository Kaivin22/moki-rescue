import type { CancellationReasonCode, LocationPoint, RequestDetails } from '@/src/types/rescue';

export type CustomerFeedbackAction = 'reject_arrival' | 'reject_repair' | 'reject_transport';
export type CustomerFeedbackReason =
  | 'provider_not_visible'
  | 'wrong_meeting_point'
  | 'cannot_contact_provider'
  | 'issue_persists'
  | 'work_not_as_agreed'
  | 'destination_not_reached'
  | 'other';

export interface RescueMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

type RescueMapRequest = Pick<
  RequestDetails,
  | 'activeWorkType'
  | 'status'
  | 'destinationLatitude'
  | 'destinationLongitude'
  | 'pickupLatitude'
  | 'pickupLongitude'
>;

export function template(value: string, params: Record<string, string | number>) {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function displayPhone(phone: string) {
  return phone.startsWith('+84') ? `0${phone.slice(3)}` : phone;
}

export function customerCancellationReasons(status: RequestDetails['status']): CancellationReasonCode[] {
  if (status === 'awaiting_arrival_confirmation') return ['provider_not_present'];
  if (
    status === 'searching' ||
    status === 'offered' ||
    status === 'no_provider' ||
    status === 'needs_dispatch'
  ) {
    return ['issue_resolved', 'changed_mind', 'wrong_location', 'duplicate_request', 'other'];
  }
  return ['issue_resolved', 'changed_mind', 'wrong_location', 'provider_not_present', 'other'];
}

export function requiresAssistedCancellation(status: RequestDetails['status']) {
  return [
    'arrived',
    'diagnosing',
    'awaiting_quote',
    'quote_approved',
    'repairing',
    'transporting',
    'awaiting_completion',
  ].includes(status);
}

export function customerFeedbackReasons(action: CustomerFeedbackAction | null): CustomerFeedbackReason[] {
  return action === 'reject_arrival'
    ? ['provider_not_visible', 'wrong_meeting_point', 'cannot_contact_provider', 'other']
    : ['issue_persists', 'work_not_as_agreed', 'destination_not_reached', 'other'];
}

export function transportQuoteNeedsDestination(request: RequestDetails) {
  return (
    request.status === 'awaiting_quote' &&
    request.currentQuote?.status === 'pending' &&
    request.currentQuote.workType === 'transport' &&
    request.destinationLatitude == null
  );
}

export function rescueMapRegion(
  request: RescueMapRequest | undefined,
  providerLocation: LocationPoint | null,
): RescueMapRegion | undefined {
  if (!request) return undefined;
  const transportLeg =
    request.activeWorkType === 'transport' &&
    (request.status === 'transporting' || request.status === 'awaiting_completion');
  const target =
    transportLeg && request.destinationLatitude != null && request.destinationLongitude != null
      ? { latitude: request.destinationLatitude, longitude: request.destinationLongitude }
      : { latitude: request.pickupLatitude, longitude: request.pickupLongitude };
  return {
    latitude: providerLocation ? (target.latitude + providerLocation.latitude) / 2 : target.latitude,
    longitude: providerLocation ? (target.longitude + providerLocation.longitude) / 2 : target.longitude,
    latitudeDelta: providerLocation
      ? Math.max(0.015, Math.abs(target.latitude - providerLocation.latitude) * 1.7)
      : 0.02,
    longitudeDelta: providerLocation
      ? Math.max(0.015, Math.abs(target.longitude - providerLocation.longitude) * 1.7)
      : 0.02,
  };
}
