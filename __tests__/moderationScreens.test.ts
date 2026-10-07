import fs from 'node:fs';
import path from 'node:path';
import { moderationApi } from '../src/features/operator/moderationApi';
import { apiRequest } from '../src/features/rescue/api/client';
import { getRescuePermissions } from '../src/features/rescue/hooks/useRescuePermissions';

jest.mock('../src/features/rescue/api/client', () => ({ apiRequest: jest.fn() }));
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('separate review/report workflows', () => {
  beforeEach(() => jest.clearAllMocks());
  it('passes filters and cursor to the authenticated API, without loading all cases on the client', () => {
    moderationApi.list('incidents', 'open', { before: '2026-10-01T00:00:00Z', beforeId: 'abc' });
    const url = jest.mocked(apiRequest).mock.calls[0][0] as string;
    const parsed = new URL(url, 'https://test.invalid');
    expect(parsed.pathname).toBe('/api/operator/moderation/incidents');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      status: 'open',
      limit: '30',
      before: '2026-10-01T00:00:00Z',
      beforeId: 'abc',
    });
    moderationApi.detail('reviews', 'review-id');
    expect(apiRequest).toHaveBeenLastCalledWith('/api/operator/moderation/reviews/review-id');
  });
  it.each(['reviews', 'incidents', 'quality-alerts'])(
    'has distinct %s list and detail routes behind the admin layout',
    (kind) => {
      expect(read(`app/operator/${kind}/index.tsx`)).toContain(`<ModerationListScreen kind="${kind}"`);
      expect(read(`app/operator/${kind}/[id].tsx`)).toContain(`<ModerationDetailScreen kind="${kind}"`);
      expect(read('app/operator/index.tsx')).toContain(`/operator/${kind}`);
      expect(read('app/operator/_layout.tsx')).toContain("profile.role !== 'admin'");
    },
  );
  it('does not embed review, incident or timeline panels in the case overview anymore', () => {
    const overview = read('app/rescue/[id].tsx');
    for (const panel of ['<ReviewPanel', '<IncidentPanel', '<RescueTimeline', '<RescueQuoteCard'])
      expect(overview).not.toContain(panel);
    for (const section of ['review', 'incidents', 'timeline', 'quote'])
      expect(overview).toContain(`/\${id}/${section}`);
    expect(read('src/features/rescue/screens/RescueSectionScreen.tsx')).toContain('Bỏ qua / quay lại ca');
  });
  it('allows reviews only for the customer after completion, not as a completion requirement', () => {
    const request = {
      assignedProviderId: 'provider',
      attentionCodes: [],
      incidentReports: [],
      status: 'completed' as const,
    };
    expect(getRescuePermissions('customer', 'customer', request).showReview).toBe(true);
    expect(getRescuePermissions('provider', 'provider', request).showReview).toBe(false);
    expect(getRescuePermissions('admin', 'admin', request).showReview).toBe(false);
    expect(
      getRescuePermissions('customer', 'customer', { ...request, status: 'awaiting_completion' }).showReview,
    ).toBe(false);
  });
  it('has 48 navigable route templates excluding layouts and bootstrap, not screenshots', () => {
    const walk = (dir: string): string[] =>
      fs
        .readdirSync(dir, { withFileTypes: true })
        .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const screens = walk('app').filter(
      (file) =>
        file.endsWith('.tsx') &&
        path.basename(file) !== '_layout.tsx' &&
        file !== path.join('app', 'index.tsx'),
    );
    expect(screens.length).toBeGreaterThanOrEqual(48);
  });
});
