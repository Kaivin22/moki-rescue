import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { moderationApi } from '../src/features/operator/moderationApi';
import { apiRequest } from '../src/features/rescue/api/client';
import { getRescuePermissions } from '../src/features/rescue/hooks/useRescuePermissions';
import { pieDocument, statusSlices } from '../src/features/operator/statisticsCharts';
import type { OperatorStatistics } from '../src/types/rescue';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

function style(file: string, name: string): string {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result = '';
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === name &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      result = node.initializer.getText(source);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

describe('focused login and operator screens', () => {
  it('gives each role a distinct home workflow and guards customer-only requests', () => {
    const home = read('app/(tabs)/index.tsx');
    expect(home).toContain("if (role === 'provider') return <OperationsWorkspace />");
    expect(home).toContain("if (role === 'admin') return <AdminDashboard />");
    expect(home).toContain('return <CustomerHomeScreen />');
    expect(read('app/(tabs)/operations.tsx')).toContain("role !== 'admin'");
    expect(read('app/(tabs)/request.tsx')).toContain("role !== 'customer'");
    const workspace = read('src/features/rescue/screens/OperationsWorkspace.tsx');
    expect(workspace).toContain('disabled={!canToggle}');
    expect(workspace).toContain('if (!canToggle || changing.current) return');
    expect(workspace).toContain('await availability.mutateAsync({ available: value })');
    expect(workspace).not.toContain('getCurrentPositionAsync');
    expect(workspace).not.toContain('requestForegroundPermissionsAsync');
  });
  it('keeps login as a method chooser, with separate guarded forms', () => {
    const login = read('app/(auth)/login.tsx');
    expect(login).toContain('/(auth)/sms-login');
    expect(login).toContain('/(auth)/test-login');
    expect(login).not.toContain('<AppInput');
    expect(login).not.toContain('<DevPasswordLoginPanel');
    const sms = read('app/(auth)/sms-login.tsx');
    expect(sms).toContain('signInWithOtp');
    expect(sms).toContain('verifyOtp');
    expect(sms).not.toContain('DevPasswordLoginPanel');
    const testLogin = read('app/(auth)/test-login.tsx');
    expect(testLogin).toContain('canUseDevPasswordLogin(');
    expect(testLogin).toContain('if (!enabled) return <Redirect');
    expect(testLogin).toContain('<DevPasswordLoginPanel');
  });

  it('exposes management destinations without embedding their forms in the menu', () => {
    const menu = read('app/operator/index.tsx');
    for (const destination of ['teams', 'services', 'admins', 'attention', 'audit']) {
      expect(menu).toContain(`/operator/${destination}`);
    }
    expect(menu).not.toContain('<AppInput');
    expect(menu).not.toContain('<ServiceCatalogEditor');
    expect(read('src/features/rescue/screens/OperationsWorkspace.tsx')).toContain("router.push('/operator')");
    expect(read('app/operator/_layout.tsx')).toContain("profile.role !== 'admin'");
  });

  it.each([
    ['teams.tsx', 'teams'],
    ['team-new.tsx', 'create'],
    ['admins.tsx', 'admins'],
    ['team/[id]/index.tsx', 'team'],
    ['team/[id]/providers.tsx', 'providers'],
    ['team/[id]/provider-new.tsx', 'add-provider'],
    ['team/[id]/capabilities.tsx', 'capabilities'],
    ['team/[id]/verification.tsx', 'verification'],
    ['team/[id]/quality.tsx', 'quality'],
  ])('renders %s as its own focused section', (file, section) => {
    expect(read(`app/operator/${file}`)).toContain(`section="${section}"`);
    const implementation = read('src/features/operator/TeamManagementScreen.tsx');
    expect(implementation).toContain(`section === '${section}' ? (`);
    expect(implementation).not.toContain('<ServiceCatalogEditor');
  });

  it('routes from the service list to a code-scoped editor', () => {
    expect(read('app/operator/services.tsx')).toContain("pathname: '/operator/service/[code]'");
    expect(read('app/operator/services.tsx')).not.toContain('<ServiceCatalogEditor');
    expect(read('app/operator/service/[code].tsx')).toContain('serviceCode={code}');
    expect(read('src/features/rescue/components/ServiceCatalogEditor.tsx')).toContain(
      'service.code === serviceCode',
    );
  });

  it('lets long home text wrap while reserving room for the logo', () => {
    const home = 'app/(tabs)/index.tsx';
    expect(read(home)).toContain('<View style={styles.heroText}>');
    expect(style(home, 'heroText')).toMatch(/flex:\s*1/);
    expect(style(home, 'heroText')).toMatch(/minWidth:\s*0/);
    expect(style(home, 'shield')).toMatch(/flexShrink:\s*0/);
    expect(style(home, 'hero')).toContain("alignSelf: 'stretch'");
    expect(style(home, 'emptyText')).toMatch(/flex:\s*1/);
  });
});

jest.mock('../src/features/rescue/api/client', () => ({ apiRequest: jest.fn() }));

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
});

describe('provider approval and private statistics wiring (static contracts)', () => {
  it('has a separate admin directory with loading, error, empty and real pending decisions', () => {
    const page = read('src/features/operator/ProviderDirectoryScreen.tsx');
    for (const token of [
      'directory.isPending',
      'directory.error',
      'visible.length === 0',
      "provider.status === 'pending'",
      "decision: 'active'",
      "decision: 'rejected'",
      'review.mutate(confirmation)',
    ]) {
      expect(page).toContain(token);
    }
    expect(read('app/operator/index.tsx')).toContain('/operator/providers');
  });
  it('keys personal statistics by signed-in account and does not request another provider ID', () => {
    expect(read('src/features/rescue/screens/OperationsWorkspace.tsx')).toContain(
      "['rescue', 'provider-statistics', providerId]",
    );
    expect(read('src/features/rescue/api/rescueApi.ts')).toContain('providerStatistics: () =>');
    const service = read('backend/src/main/java/com/danang/motorescue/service/ProviderService.java');
    expect(service).toContain('WHERE rr.assigned_provider_id = ?');
    expect(service).toContain('}, actor.id());');
  });
  it('uses one marked fixture provisioner and never silently reactivates a changed member', () => {
    const script = read('scripts/create-test-accounts.cjs');
    expect(script).toContain("'rescue-auth-test-v1'");
    expect(script).toContain('user.app_metadata?.test_fixture !== FIXTURE');
    expect(script).toContain("'TEST-AUTH-DN-01'");
    expect(script).toContain("'provider.rescue@example.com'");
    expect(script).toContain("member.team_id !== team.id || member.status !== 'active'");
    expect(script).toContain('TEST_PROVIDER_WAS_CHANGED: refusing to move or reactivate it.');
    expect(script).toContain("status: 'active', // Explicit test fixture approval");
    expect(fs.existsSync('scripts/archive/08_approve_existing_test_provider.sql')).toBe(false);
  });
});

const data: OperatorStatistics = {
  timezone: 'Asia/Ho_Chi_Minh',
  fromDate: '2026-09-21',
  toDate: '2026-09-27',
  summary: { openCases: 3, waitingCases: 2, verifiedTeams: 13, openAlerts: 0 },
  daily: [],
  statuses: [
    { status: 'searching', count: 1 },
    { status: 'no_provider', count: 1 },
    { status: 'en_route', count: 1 },
    { status: 'completed', count: 2 },
    { status: 'cancelled', count: 1 },
  ],
};
it('groups every case exactly once, without mixing team or alert totals into the pie', () => {
  expect(statusSlices(data, false).map((s) => s.count)).toEqual([2, 1, 2, 1]);
  expect(statusSlices(data, true).reduce((n, s) => n + s.count, 0)).toBe(6);
});
it('shows an empty outline rather than invented percentages for zero requests', () => {
  const html = pieDocument(statusSlices({ ...data, statuses: [] }, false));
  expect(html).toContain('fill="none"');
  expect(html).not.toContain('<path');
  expect(html).not.toMatch(/NaN|Infinity/);
});
it('renders a full circle for one nonzero category', () => {
  const html = pieDocument([{ count: 2, color: '#28744B' }]);
  expect(html).toContain('<circle');
  expect(html).not.toContain('<path');
});
it('renders proportional sectors without scripts or external requests', () => {
  const html = pieDocument(statusSlices(data, false));
  expect(html.match(/<path /g)).toHaveLength(4);
  expect(html).not.toMatch(/<script|src=|NaN|Infinity/);
});
