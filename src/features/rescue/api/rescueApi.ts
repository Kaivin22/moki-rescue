import { apiRequest } from './client';
import type {
  CreateRescueInput,
  Offer,
  ProviderStatus,
  RequestCardData,
  RequestDetails,
  RoadRoute,
  ServiceType,
  TeamSummary,
  AdminServiceType,
  AccountLookup,
  QualityReview,
  TeamVerification,
  UpdateTeamVerificationInput,
  CancelRescueInput,
  AttentionFlag,
  ProviderMember,
  AuditLogEntry,
} from '@/src/types/rescue';

export const rescueApi = {
  serviceTypes: () => apiRequest<ServiceType[]>('/api/catalog/service-types'),
  requests: (history = false, cursor?: { before: string; beforeId: string }, limit = 50) => {
    const query = new URLSearchParams({ history: String(history), limit: String(limit) });
    if (cursor) {
      query.set('before', cursor.before);
      query.set('beforeId', cursor.beforeId);
    }
    return apiRequest<RequestCardData[]>(`/api/requests?${query.toString()}`);
  },
  request: (id: string) => apiRequest<RequestDetails>(`/api/requests/${id}`),
  roadRoute: (id: string) => apiRequest<RoadRoute>(`/api/requests/${id}/road-route`),
  create: (input: CreateRescueInput, idempotencyKey: string) =>
    apiRequest<RequestDetails>('/api/requests', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    }),
  cancel: (id: string, input: CancelRescueInput) =>
    apiRequest<RequestDetails>(`/api/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  retryCustomer: (id: string) => apiRequest<RequestDetails>(`/api/requests/${id}/retry`, { method: 'POST' }),
  requestSupport: (
    id: string,
    reasonCode: 'assisted_cancellation' | 'no_provider' | 'provider_contact' | 'safety_concern' | 'other',
    note?: string,
  ) =>
    apiRequest<void>(`/api/requests/${id}/support`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, note }),
    }),
  reportIncident: (
    id: string,
    category: 'provider_conduct' | 'service_quality' | 'safety' | 'property_damage' | 'other',
    description: string,
  ) =>
    apiRequest<void>(`/api/requests/${id}/incidents`, {
      method: 'POST',
      body: JSON.stringify({ category, description }),
    }),
  action: (
    id: string,
    action: string,
    expectedVersion: number,
    workType?: 'repair' | 'transport',
    reasonCode?: string,
    note?: string,
  ) =>
    apiRequest<RequestDetails>(`/api/requests/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action, expectedVersion, workType, reasonCode, note }),
    }),
  updateDestination: (
    id: string,
    input: {
      areaLabel: string;
      note?: string;
      latitude: number;
      longitude: number;
      expectedRequestVersion: number;
    },
  ) =>
    apiRequest<RequestDetails>(`/api/requests/${id}/destination`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  submitQuote: (
    id: string,
    input: {
      description: string;
      amountVnd: number;
      workType: 'repair' | 'transport';
      expectedRequestVersion: number;
    },
  ) =>
    apiRequest<RequestDetails>(`/api/requests/${id}/quotes`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  decideQuote: (
    id: string,
    quoteId: string,
    decision: 'approve' | 'reject',
    expectedRequestVersion: number,
  ) =>
    apiRequest<RequestDetails>(`/api/requests/${id}/quotes/${quoteId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, expectedRequestVersion }),
    }),
  saveReview: (id: string, rating: number, comment?: string) =>
    apiRequest<void>(`/api/requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ rating, comment }),
    }),
  deleteReview: (id: string) => apiRequest<void>(`/api/requests/${id}/review`, { method: 'DELETE' }),
  providerStatus: () => apiRequest<ProviderStatus>('/api/provider/status'),
  setAvailability: (input: {
    available: boolean;
    latitude?: number;
    longitude?: number;
    accuracyM?: number;
  }) =>
    apiRequest<ProviderStatus>('/api/provider/availability', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  offers: () => apiRequest<Offer[]>('/api/provider/offers'),
  acceptOffer: (offerId: string, expectedVersion: number) =>
    apiRequest<{ requestId: string }>(
      `/api/provider/offers/${offerId}/accept?expectedVersion=${expectedVersion}`,
      {
        method: 'POST',
      },
    ),
  declineOffer: (offerId: string) =>
    apiRequest<void>(`/api/provider/offers/${offerId}/decline`, { method: 'POST' }),
  withdrawProvider: (requestId: string, reason: string) =>
    apiRequest<{ requestId: string; status: 'searching' | 'needs_dispatch' }>(
      `/api/provider/requests/${requestId}/withdraw`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    ),
  saveProviderLocation: (id: string, latitude: number, longitude: number, accuracyM: number) =>
    apiRequest<{ stored: boolean }>(`/api/provider/requests/${id}/location`, {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, accuracyM }),
    }),
  saveProviderAvailabilityLocation: (latitude: number, longitude: number, accuracyM: number) =>
    apiRequest<void>('/api/provider/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, accuracyM }),
    }),
  teams: () => apiRequest<TeamSummary[]>('/api/operator/teams'),
  providers: (teamId: string) => apiRequest<ProviderMember[]>(`/api/operator/teams/${teamId}/providers`),
  setProviderStatus: (teamId: string, providerId: string, status: 'active' | 'suspended' | 'left') =>
    apiRequest<void>(`/api/operator/teams/${teamId}/providers/${providerId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  lookupAccount: (phone: string) =>
    apiRequest<AccountLookup>('/api/operator/account-lookup', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  retryDispatch: (id: string) => apiRequest<void>(`/api/operator/requests/${id}/retry`, { method: 'POST' }),
  reassignDispatch: (id: string) =>
    apiRequest<void>(`/api/operator/requests/${id}/reassign`, { method: 'POST' }),
  attentionFlags: (openOnly = true) =>
    apiRequest<AttentionFlag[]>(`/api/operator/attention?openOnly=${openOnly}`),
  resolveAttention: (flagId: string, note: string) =>
    apiRequest<void>(`/api/operator/attention/${flagId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  resolveIncident: (incidentId: string, decision: 'resolved' | 'dismissed', note: string) =>
    apiRequest<void>(`/api/operator/incidents/${incidentId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision, note }),
    }),
  auditLogs: (cursor?: { before: string; beforeId: number }, limit = 50) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      query.set('before', cursor.before);
      query.set('beforeId', String(cursor.beforeId));
    }
    return apiRequest<AuditLogEntry[]>(`/api/operator/audit-logs?${query.toString()}`);
  },
  createTeam: (input: {
    name: string;
    contractReference: string;
    hotline: string;
    serviceRadiusKm: number;
  }) =>
    apiRequest<{ teamId: string }>('/api/operator/teams', { method: 'POST', body: JSON.stringify(input) }),
  teamVerification: (teamId: string) =>
    apiRequest<TeamVerification>(`/api/operator/teams/${teamId}/verification`),
  updateTeamVerification: (teamId: string, input: UpdateTeamVerificationInput) =>
    apiRequest<void>(`/api/operator/teams/${teamId}/verification`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  setTeamStatus: (teamId: string, status: 'pending' | 'verified' | 'suspended') =>
    apiRequest<void>(`/api/operator/teams/${teamId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  warnQualityAlert: (alertId: string, note: string) =>
    apiRequest<void>(`/api/operator/quality-alerts/${alertId}/warn`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  resolveQualityAlert: (alertId: string, note: string) =>
    apiRequest<void>(`/api/operator/quality-alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  qualityReviews: (teamId: string) => apiRequest<QualityReview[]>(`/api/operator/teams/${teamId}/reviews`),
  setReviewVisibility: (reviewId: string, hidden: boolean, note: string) =>
    apiRequest<void>(`/api/operator/reviews/${reviewId}/visibility`, {
      method: 'PUT',
      body: JSON.stringify({ hidden, note }),
    }),
  setTeamCapabilities: (teamId: string, capabilityCodes: string[]) =>
    apiRequest<void>(`/api/operator/teams/${teamId}/capabilities`, {
      method: 'PUT',
      body: JSON.stringify({ capabilityCodes }),
    }),
  addProvider: (
    teamId: string,
    input: {
      userId: string;
      displayName: string;
      contactPhone: string;
      rescueVehicleLabel?: string;
    },
  ) =>
    apiRequest<void>(`/api/operator/teams/${teamId}/providers`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  setStaffRole: (userId: string, role: 'admin' | 'dispatcher' | 'customer') =>
    apiRequest<void>('/api/operator/staff-role', { method: 'PUT', body: JSON.stringify({ userId, role }) }),
  adminServiceTypes: () => apiRequest<AdminServiceType[]>('/api/operator/service-types'),
  updateServiceType: ({ code, ...input }: AdminServiceType) =>
    apiRequest<void>(`/api/operator/service-types/${code}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  requestAccountDeletion: () => apiRequest<void>('/api/me/deletion-request', { method: 'POST' }),
  unregisterAllPushDevices: () => apiRequest<void>('/api/me/push-devices', { method: 'DELETE' }),
};
