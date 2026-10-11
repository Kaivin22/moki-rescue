import fs from 'node:fs';
import path from 'node:path';

// Node-only operational script: load its CommonJS exports without running the CLI.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const setup = require('../scripts/create-test-accounts.cjs');
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'unit-test-public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'unit-test-server-key',
};
const args = ['--environment=staging', '--confirm-test-project'];

describe('test account setup guards (no live Supabase writes)', () => {
  it('explains preflight permission failures without exposing raw server errors or claiming partial writes', () => {
    for (const operation of ['READ_PROFILES', 'READ_SHOP_ADDRESS', 'READ_SERVICES', 'READ_CHECKLIST']) {
      try {
        setup.checked({ error: { code: '42501', message: 'sensitive-server-detail' } }, operation);
        throw new Error('Expected permission failure');
      } catch (error) {
        const failure = error as Error & { setupNotStarted: boolean };
        expect(failure.setupNotStarted).toBe(true);
        expect(failure.message).toContain('01_init_database.sql includes all setup grants');
        expect(failure.message).toContain('Do not reset');
        expect(failure.message).not.toContain('--repair-test-setup');
        expect(failure.message).not.toContain('sensitive-server-detail');
      }
    }
    expect(() => setup.checked({ error: { code: '42501' } }, 'ASSIGN_TEST_ROLE')).toThrow(
      'ASSIGN_TEST_ROLE: 42501',
    );
  });
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
      'provider',
      'provider',
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

  it('extends an existing three-account fixture without resetting passwords or adopting missing credentials', () => {
    const original = ['customer', 'provider', 'admin'].map((role) => ({
      email: `${role}.rescue@example.com`,
      role,
      password: `${role}-existing-secret-123`,
      id: role,
    }));
    const record = { accounts: original.map((entry) => ({ ...entry })) };
    setup.extendCredentials(record, new Map());
    expect(record.accounts).toHaveLength(6);
    for (const old of original)
      expect(record.accounts.find((entry) => entry.email === old.email)).toEqual(old);
    setup.extendCredentials(record, new Map());
    expect(record.accounts).toHaveLength(6);
    expect(record.accounts.find((entry) => entry.email === 'provider2.rescue@example.com')?.password).toBe(
      'provider-existing-secret-123',
    );
    expect(() =>
      setup.extendCredentials({ accounts: original }, new Map([['provider3.rescue@example.com', {}]])),
    ).toThrow('PASSWORD_MISSING');
  });

  it('creates four providers across three shops, including two colleagues', () => {
    const providers = setup.ACCOUNTS.filter((account: { role: string }) => account.role === 'provider');
    expect(providers).toHaveLength(4);
    expect(new Set(providers.map((account: { teamReference: string }) => account.teamReference)).size).toBe(
      3,
    );
    expect(providers[0].teamReference).toBe(providers[1].teamReference);
    for (const team of setup.TEAMS) {
      expect(team.address.length).toBeGreaterThan(5);
      expect(team.latitude).toBeGreaterThanOrEqual(15.95);
      expect(team.latitude).toBeLessThanOrEqual(16.18);
    }
  });
});
