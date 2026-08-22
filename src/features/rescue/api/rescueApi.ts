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
} from '@/src/types/rescue';

export const rescueApi = {
  serviceTypes: () => apiRequest<ServiceType[]>('/api/catalog/service-types'),
  requests: (history = false) => apiRequest<RequestCardData[]>(`/api/requests?history=${history}`),
  request: (id: string) => apiRequest<RequestDetails>(`/api/requests/${id}`),
  roadRoute: (id: string) => apiRequest<RoadRoute>(`/api/requests/${id}/road-route`),
  create: (input: CreateRescueInput, idempotencyKey: string) =>
    apiRequest<RequestDetails>('/api/requests', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    }),
  cancel: (id: string, reason: string, expectedVersion: number) =>
    apiRequest<RequestDetails>(`/api/requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, expectedVersion }),
    }),
  action: (id: string, action: string, expectedVersion: number, workType?: 'repair' | 'transport') =>
    apiRequest<RequestDetails>(`/api/requests/${id}/actions`, {
      method: 'POST',
      body: JSON.stringify({ action, expectedVersion, workType }),
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
  setAvailability: (available: boolean) =>
    apiRequest<ProviderStatus>('/api/provider/availability', {
      method: 'PUT',
      body: JSON.stringify({ available }),
    }),
  offers: () => apiRequest<Offer[]>('/api/provider/offers'),
  acceptOffer: (offerId: string, expectedVersion: number) =>
    apiRequest<{ requestId: string }>(
      `/api/provider/offers/${offerId}/accept?expectedVersion=${expectedVersion}`,
      {
        method: 'POST',
      },
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
  lookupAccount: (phone: string) =>
    apiRequest<AccountLookup>('/api/operator/account-lookup', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  retryDispatch: (id: string) => apiRequest<void>(`/api/operator/requests/${id}/retry`, { method: 'POST' }),
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
  setStaffRole: (userId: string, role: 'dispatcher' | 'customer') =>
    apiRequest<void>('/api/operator/staff-role', { method: 'PUT', body: JSON.stringify({ userId, role }) }),
  adminServiceTypes: () => apiRequest<AdminServiceType[]>('/api/operator/service-types'),
  updateServiceType: ({ code, ...input }: AdminServiceType) =>
    apiRequest<void>(`/api/operator/service-types/${code}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  requestAccountDeletion: () => apiRequest<void>('/api/me/deletion-request', { method: 'POST' }),
};
