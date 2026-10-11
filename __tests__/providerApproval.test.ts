import fs from 'node:fs';
import path from 'node:path';
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

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
    expect(read('app/operator/_layout.tsx')).toContain("profile.role !== 'admin'");
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
