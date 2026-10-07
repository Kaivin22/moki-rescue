import fs from 'node:fs';
import path from 'node:path';

const setup = require('../scripts/create-test-accounts.cjs');
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'unit-test-public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'unit-test-server-key',
};
const args = ['--environment=staging', '--confirm-test-project'];

describe('test account setup guards (no live Supabase writes)', () => {
  it('requires explicit test-project confirmation and an environment', () => {
    expect(() => setup.configuration(env, [])).toThrow();
    expect(() => setup.configuration(env, ['--confirm-test-project'])).toThrow();
    expect(() => setup.configuration(env, ['--environment=staging'])).toThrow();
    expect(setup.configuration(env, args).url).toBe(env.SUPABASE_URL);
  });

  it('refuses production, missing keys and mismatched projects', () => {
    expect(() => setup.configuration({ ...env, APP_ENV: 'production' }, args)).toThrow('PRODUCTION');
    expect(() => setup.configuration({ ...env, EAS_BUILD_PROFILE: 'production' }, args)).toThrow(
      'PRODUCTION',
    );
    expect(() => setup.configuration({ ...env, SUPABASE_SERVICE_ROLE_KEY: '' }, args)).toThrow('Missing');
    expect(() =>
      setup.configuration({ ...env, EXPO_PUBLIC_SUPABASE_URL: 'https://other.supabase.co' }, args),
    ).toThrow('SAME_SUPABASE_PROJECT');
  });

  it('refuses to adopt an account without the server-owned fixture marker', () => {
    expect(() => setup.assertFixtureUser({ app_metadata: {} })).toThrow('WITHOUT_FIXTURE_MARKER');
    expect(() => setup.assertFixtureUser({ user_metadata: { test_fixture: setup.FIXTURE } })).toThrow();
    expect(() => setup.assertFixtureUser({ app_metadata: { test_fixture: setup.FIXTURE } })).not.toThrow();
  });

  it('provisions the three real roles and keeps client presets in sync without passwords', () => {
    expect(setup.ACCOUNTS.map((account: { role: string }) => account.role)).toEqual([
      'customer',
      'provider',
      'admin',
    ]);
    const panel = fs.readFileSync(
      path.join(process.cwd(), 'src/features/auth/DevPasswordLoginPanel.tsx'),
      'utf8',
    );
    for (const account of setup.ACCOUNTS) expect(panel).toContain(account.email);
    expect(panel).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(panel).not.toContain('auth.admin');
    const script = fs.readFileSync(path.join(process.cwd(), 'scripts/create-test-accounts.cjs'), 'utf8');
    expect(script).toContain('email_confirm: true');
    expect(script).toContain('randomBytes(18)');
    expect(script).toContain('is_available: false');
    expect(script).not.toContain('signInWithOtp');
    expect(script).not.toContain('last_latitude:');
    expect(script).not.toContain('last_longitude:');
    expect(script).not.toContain('last_location_at:');
  });
});
