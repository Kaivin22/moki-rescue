import fs from 'node:fs';
import { communicationApi as api, nextCursor } from '@/src/features/communications/api';
import { apiRequest } from '@/src/features/rescue/api/client';

jest.mock('@/src/features/rescue/api/client', () => ({ apiRequest: jest.fn().mockResolvedValue({}) }));
const request = jest.mocked(apiRequest);
const read = (path: string) => fs.readFileSync(path, 'utf8');
beforeEach(() => request.mockClear());

describe('communications API client', () => {
  it('passes both pagination coordinates and the unread filter', async () => {
    await api.inbox(true, { before: '2026-10-08T01:00:00Z', beforeId: 'cursor-id' });
    const url = new URL(request.mock.calls[0][0], 'https://example.invalid');
    expect(url.pathname).toBe('/api/notifications');
    expect(url.searchParams.get('unread')).toBe('true');
    expect(url.searchParams.get('before')).toBe('2026-10-08T01:00:00Z');
    expect(url.searchParams.get('beforeId')).toBe('cursor-id');
  });
  it('marks an individual item read without accepting a caller-supplied owner', async () => {
    await api.read('notification-id');
    expect(request).toHaveBeenCalledWith('/api/notifications/notification-id/read', { method: 'POST' });
  });
  it('sends message identity, body and explicit private-note flag', async () => {
    const input = { id: 'message-id', body: 'A public reply', internal: false };
    await api.reply('ticket-id', input);
    expect(request).toHaveBeenCalledWith('/api/support/tickets/ticket-id/messages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });
  it('includes expected version when closing a ticket', async () => {
    await api.status('ticket-id', { version: 4, status: 'resolved', note: 'Checked and resolved' });
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
      version: 4,
      status: 'resolved',
      note: 'Checked and resolved',
    });
  });
  it('keeps admin broadcast audience and idempotency identity explicit', async () => {
    const input = {
      id: 'announcement-id',
      audience: 'provider' as const,
      title: 'Service notice',
      body: 'Providers only',
    };
    await api.publish(input);
    expect(request).toHaveBeenCalledWith('/api/operator/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  });
  it('reuses existing incident conversation instead of creating a second report', async () => {
    await api.incident('incident-id');
    expect(request).toHaveBeenCalledWith('/api/support/incidents/incident-id');
  });
  it('does not continue pagination unless the complete cursor exists', () => {
    expect(nextCursor({ items: [], nextBefore: 'time', nextBeforeId: null })).toBeUndefined();
    expect(nextCursor({ items: [], nextBefore: 'time', nextBeforeId: 'id' })).toEqual({
      before: 'time',
      beforeId: 'id',
    });
  });
});

describe('communications migration and UI wiring (static contracts)', () => {
  it('provides an additive one-time upgrade without resetting user data', () => {
    const sql = read('backend/src/main/resources/db/migration/V11__notification_inbox_and_support.sql');
    expect(read('scripts/01_init_database.sql')).toContain(sql.replace(/\r\n/g, '\n'));
    expect(sql).not.toMatch(/DROP TABLE|DROP SCHEMA|\bTRUNCATE\s|DELETE FROM/);
    for (const name of ['user_notifications', 'support_tickets', 'support_messages', 'announcements']) {
      expect(sql).toContain(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY`);
    }
    expect(sql).toContain('FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('UNIQUE(user_id, event_key)');
    expect(sql).toContain('incident_id UUID UNIQUE');
  });
  it('links both existing complaint interfaces to the same conversation', () => {
    for (const path of [
      'src/features/operator/ModerationScreens.tsx',
      'src/features/rescue/components/details/IncidentPanel.tsx',
    ]) {
      expect(read(path)).toContain('<IncidentConversationLink');
    }
    expect(read('src/features/communications/AnnouncementScreens.tsx')).toContain('Xác nhận gửi thông báo');
    expect(read('src/features/communications/shared.tsx')).toContain("state === 'active'");
  });
});
