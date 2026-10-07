import { apiRequest } from '@/src/features/rescue/api/client';

export type ModerationKind = 'reviews' | 'incidents' | 'quality-alerts';
export interface ModerationEntry {
  id: string;
  requestId: string | null;
  teamId: string;
  teamName: string;
  subject: string;
  body: string | null;
  status: string;
  rating: number | null;
  ratingCount: number | null;
  resolutionNote: string | null;
  createdAt: string;
}
export interface ModerationCursor {
  before: string;
  beforeId: string;
}
export interface ModerationPage {
  items: ModerationEntry[];
  nextBefore: string | null;
  nextBeforeId: string | null;
}
export const moderationApi = {
  list: (kind: ModerationKind, status: string, cursor?: ModerationCursor) => {
    const query = new URLSearchParams({ status, limit: '30' });
    if (cursor) {
      query.set('before', cursor.before);
      query.set('beforeId', cursor.beforeId);
    }
    return apiRequest<ModerationPage>(`/api/operator/moderation/${kind}?${query}`);
  },
  detail: (kind: ModerationKind, id: string) =>
    apiRequest<ModerationEntry>(`/api/operator/moderation/${kind}/${id}`),
};
