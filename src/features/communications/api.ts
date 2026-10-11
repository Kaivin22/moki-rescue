import { apiRequest } from '@/src/features/rescue/api/client';

export interface Cursor {
  before: string;
  beforeId: string;
}
export interface Page<T> {
  items: T[];
  nextBefore: string | null;
  nextBeforeId: string | null;
}
export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  targetType: 'rescue' | 'support' | 'announcement';
  targetId: string;
  readAt: string | null;
  createdAt: string;
}
export type TicketStatus = 'open' | 'waiting_user' | 'resolved' | 'dismissed';
export interface Ticket {
  id: string;
  ownerId: string;
  ownerName: string;
  incidentId: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Message {
  id: string;
  authorId: string | null;
  authorName: string | null;
  authorRole: 'customer' | 'provider' | 'admin' | 'system';
  body: string;
  internal: boolean;
  createdAt: string;
}
export type Audience = 'all' | 'customer' | 'provider' | 'admin';
export interface Announcement {
  id: string;
  audience: Audience;
  title: string;
  body: string;
  recipientCount: number;
  createdAt: string;
}
export function nextCursor<T>(page: Page<T>): Cursor | undefined {
  return page.nextBefore && page.nextBeforeId
    ? { before: page.nextBefore, beforeId: page.nextBeforeId }
    : undefined;
}
function params(cursor?: Cursor, extra: Record<string, string> = {}) {
  return new URLSearchParams({ limit: '30', ...extra, ...(cursor ?? {}) }).toString();
}
const post = <T>(path: string, body?: unknown) =>
  apiRequest<T>(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });
export const communicationApi = {
  inbox: (unread: boolean, cursor?: Cursor) =>
    apiRequest<Page<InboxItem>>(`/api/notifications?${params(cursor, { unread: String(unread) })}`),
  notification: (id: string) => apiRequest<InboxItem>(`/api/notifications/${id}`),
  unread: () => apiRequest<{ count: number }>('/api/notifications/unread-count'),
  read: (id: string) => post<void>(`/api/notifications/${id}/read`),
  tickets: (status: string, cursor?: Cursor) =>
    apiRequest<Page<Ticket>>(`/api/support/tickets?${params(cursor, { status })}`),
  ticket: (id: string) => apiRequest<Ticket>(`/api/support/tickets/${id}`),
  incident: (id: string) => apiRequest<Ticket>(`/api/support/incidents/${id}`),
  createTicket: (input: { id: string; subject: string; description: string }) =>
    post<Ticket>('/api/support/tickets', input),
  messages: (id: string, cursor?: Cursor) =>
    apiRequest<Page<Message>>(`/api/support/tickets/${id}/messages?${params(cursor)}`),
  reply: (id: string, input: { id: string; body: string; internal: boolean }) =>
    post<void>(`/api/support/tickets/${id}/messages`, input),
  status: (id: string, input: { version: number; status: TicketStatus; note: string }) =>
    post<void>(`/api/support/tickets/${id}/status`, input),
  announcements: (cursor?: Cursor) =>
    apiRequest<Page<Announcement>>(`/api/operator/announcements?${params(cursor)}`),
  announcement: (id: string) => apiRequest<Announcement>(`/api/operator/announcements/${id}`),
  preview: (audience: Audience) =>
    apiRequest<{ count: number }>(`/api/operator/announcements/preview?${new URLSearchParams({ audience })}`),
  publish: (input: { id: string; audience: Audience; title: string; body: string }) =>
    post<Announcement>('/api/operator/announcements', input),
};
