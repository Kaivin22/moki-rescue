import { getRescuePermissions } from '../src/features/rescue/hooks/useRescuePermissions';
import {
  customerCancellationReasons,
  requiresAssistedCancellation,
  rescueMapRegion,
} from '../src/features/rescue/services/rescueDetailsPolicy';
import type { IncidentReport, RescueStatus } from '../src/types/rescue';

describe('rescue details policy', () => {
  it('keeps cancellation choices specific to the request stage', () => {
    expect(customerCancellationReasons('awaiting_arrival_confirmation')).toEqual(['provider_not_present']);
    expect(customerCancellationReasons('searching')).toContain('duplicate_request');
    expect(customerCancellationReasons('en_route')).toContain('provider_not_present');
    expect(requiresAssistedCancellation('diagnosing')).toBe(true);
    expect(requiresAssistedCancellation('en_route')).toBe(false);
  });

  it('targets the destination only during an active transport leg', () => {
    const request = {
      activeWorkType: 'transport' as const,
      status: 'transporting' as const,
      pickupLatitude: 16.05,
      pickupLongitude: 108.2,
      destinationLatitude: 16.1,
      destinationLongitude: 108.25,
    };
    expect(rescueMapRegion(request, null)).toMatchObject({ latitude: 16.1, longitude: 108.25 });
    const region = rescueMapRegion(request, {
      latitude: 16.08,
      longitude: 108.23,
      accuracyM: 10,
      recordedAt: '2026-08-30T00:00:00.000Z',
    });
    expect(region?.latitude).toBeCloseTo(16.09);
    expect(region?.longitude).toBeCloseTo(108.24);
  });

  it('keeps role-specific controls scoped to the current participant', () => {
    const request = permissionRequest('assigned');
    expect(getRescuePermissions('provider', 'provider-1', request).isAssignedProvider).toBe(true);
    expect(getRescuePermissions('provider', 'provider-2', request).showProviderActions).toBe(false);
    expect(getRescuePermissions('customer', 'customer-1', request).showCustomerActions).toBe(true);
    expect(getRescuePermissions('dispatcher', 'staff-1', request).isStaff).toBe(true);
  });

  it('shows incidents and retry controls only to eligible roles', () => {
    const customerRequest = permissionRequest('assigned');
    expect(getRescuePermissions('customer', 'customer-1', customerRequest).showIncident).toBe(true);
    const staffRequest = permissionRequest('needs_dispatch', [incident]);
    const staff = getRescuePermissions('dispatcher', 'staff-1', staffRequest);
    expect(staff.showIncident).toBe(true);
    expect(staff.showStaffRetry).toBe(true);
    expect(getRescuePermissions('provider', 'provider-1', staffRequest).showIncident).toBe(false);
  });
});

function permissionRequest(status: RescueStatus, incidentReports: IncidentReport[] = []) {
  return {
    assignedProviderId: 'provider-1',
    attentionCodes: [],
    incidentReports,
    status,
  };
}

const incident: IncidentReport = {
  id: 'incident-1',
  category: 'safety',
  description: 'Safety report',
  status: 'open',
  createdAt: '2026-08-30T00:00:00.000Z',
  resolutionNote: null,
  resolvedAt: null,
};
