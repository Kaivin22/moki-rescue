import { apiRequest } from '@/src/features/rescue/api/client';

export interface ShopApplication {
  id: string;
  applicantId: string;
  applicantName: string;
  name: string;
  address: string;
  contactPhone: string;
  latitude: number;
  longitude: number;
  serviceCodes: string[];
  status: 'pending' | 'approved' | 'rejected';
  teamId: string | null;
  reviewNote: string | null;
  createdAt: string;
}
export interface PartnerShop {
  id: string;
  name: string;
  address: string;
  status: string;
}
export interface ShopMember {
  userId: string;
  name: string;
  status: string;
  representative: boolean;
}
export interface ShopInvitation {
  id: string;
  teamId: string;
  teamName: string;
  inviteeName: string;
  status: string;
  expiresAt: string;
}
export interface VerificationCheck {
  code: string;
  label: string;
  description: string;
}
const post = <T = void>(path: string, body?: unknown) =>
  apiRequest<T>(`/api/partners${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const partnerApi = {
  applications: () => apiRequest<ShopApplication[]>('/api/partners/applications'),
  apply: (
    input: Pick<
      ShopApplication,
      'name' | 'address' | 'contactPhone' | 'latitude' | 'longitude' | 'serviceCodes'
    >,
  ) => post<{ id: string }>('/applications', input),
  checks: () => apiRequest<VerificationCheck[]>('/api/partners/checks'),
  review: (id: string, decision: 'approved' | 'rejected', note: string, checkedCodes: string[]) =>
    post(`/applications/${id}/review`, { decision, note, checkedCodes }),
  shops: () => apiRequest<PartnerShop[]>('/api/partners/shops'),
  members: (id: string) => apiRequest<ShopMember[]>(`/api/partners/shops/${id}/members`),
  sent: (id: string) => apiRequest<ShopInvitation[]>(`/api/partners/shops/${id}/invitations`),
  invite: (id: string, phone: string, rosterConfirmed: boolean) =>
    post(`/shops/${id}/invitations`, { phone, rosterConfirmed }),
  remove: (id: string, userId: string) => post(`/shops/${id}/members/${userId}/remove`),
  invitations: () => apiRequest<ShopInvitation[]>('/api/partners/invitations'),
  answer: (id: string, decision: 'accepted' | 'declined') => post(`/invitations/${id}/answer`, { decision }),
  revoke: (team: string, id: string) => post(`/shops/${team}/invitations/${id}/revoke`),
};
