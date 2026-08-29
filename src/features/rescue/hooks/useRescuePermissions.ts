import type { ProfileRole } from '@/src/types/profile';
import type { RequestDetails } from '@/src/types/rescue';

export interface RescuePermissions {
  isAssignedProvider: boolean;
  isStaff: boolean;
  showAttention: boolean;
  showCustomerActions: boolean;
  showProviderActions: boolean;
  showReview: boolean;
  showIncident: boolean;
  showStaffRetry: boolean;
}

type RescuePermissionRequest = Pick<
  RequestDetails,
  'assignedProviderId' | 'attentionCodes' | 'incidentReports' | 'status'
>;

export function getRescuePermissions(
  role: ProfileRole,
  profileId: string | undefined,
  request: RescuePermissionRequest | undefined,
): RescuePermissions {
  const isStaff = role === 'dispatcher' || role === 'admin';
  const isAssignedProvider =
    role === 'provider' && request?.assignedProviderId != null && request.assignedProviderId === profileId;
  return {
    isAssignedProvider,
    isStaff,
    showAttention: Boolean(isStaff && request && request.attentionCodes.length > 0),
    showCustomerActions: role === 'customer',
    showProviderActions: isAssignedProvider,
    showReview: role === 'customer' && request?.status === 'completed',
    showIncident: Boolean(
      request &&
      ((role === 'customer' && request.assignedProviderId) ||
        (isStaff && request.incidentReports.length > 0)),
    ),
    showStaffRetry: Boolean(
      isStaff && request && (request.status === 'no_provider' || request.status === 'needs_dispatch'),
    ),
  };
}

export function useRescuePermissions(
  role: ProfileRole,
  profileId: string | undefined,
  request: RescuePermissionRequest | undefined,
) {
  return getRescuePermissions(role, profileId, request);
}
