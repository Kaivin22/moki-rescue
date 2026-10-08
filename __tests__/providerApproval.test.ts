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
  it('approves only the existing marked test fixture, never all seeded shops or arbitrary auth users', () => {
    const script = read('scripts/08_approve_existing_test_provider.sql');
    expect(script).toContain("deployment_environment TEXT := 'CHANGE_ME'");
    expect(script).toContain("u.raw_app_meta_data->>'test_fixture' = 'rescue-auth-test-v1'");
    expect(script).toContain("team.partner_reference = 'TEST-AUTH-DN-01'");
    expect(script).toContain("lower(u.email) = 'provider.rescue@example.com'");
    expect(script).toContain('WHERE user_id = provider_uuid AND team_id = team_uuid');
    expect(script).not.toMatch(/UPDATE auth\.|INSERT INTO auth\.|DELETE FROM|TRUNCATE/);
  });
});
