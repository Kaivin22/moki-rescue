// Node-only fixture setup. Never import this file into the app or run it in production.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const FIXTURE = 'rescue-auth-test-v1';
const ACCOUNTS = [
  { email: 'customer.rescue@example.com', role: 'customer', name: '[TEST] Khách hàng' },
  { email: 'provider.rescue@example.com', role: 'provider', name: '[TEST] Cứu hộ viên' },
  { email: 'admin.rescue@example.com', role: 'admin', name: '[TEST] Quản trị viên' },
];
const TEAM_REFERENCE = 'TEST-AUTH-DN-01';
const TEAM_NAME = '[TEST] Đội kiểm thử đăng nhập Đà Nẵng';

function configuration(env, args) {
  if (env.APP_ENV === 'production' || env.EAS_BUILD_PROFILE === 'production') {
    throw new Error('TEST_SETUP_FORBIDDEN_IN_PRODUCTION');
  }
  if (
    !args.includes('--confirm-test-project') ||
    !args.some((arg) => ['--environment=local', '--environment=staging'].includes(arg))
  ) {
    throw new Error(
      'Pass --environment=staging (or local) and --confirm-test-project only for a dedicated test project.',
    );
  }
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  const publicKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !publicKey || !serviceKey) {
    throw new Error(
      'Missing Supabase URL, public key or SUPABASE_SERVICE_ROLE_KEY. Put secrets in .env, never in EXPO_PUBLIC_* or source code.',
    );
  }
  const parsed = new URL(url);
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.protocol !== 'https:' &&
      !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))
  ) {
    throw new Error('INVALID_SUPABASE_URL');
  }
  if (
    env.SUPABASE_URL &&
    env.EXPO_PUBLIC_SUPABASE_URL &&
    new URL(env.SUPABASE_URL).origin !== new URL(env.EXPO_PUBLIC_SUPABASE_URL).origin
  ) {
    throw new Error('APP_AND_SCRIPT_MUST_USE_THE_SAME_SUPABASE_PROJECT');
  }
  return { url: parsed.origin, serviceKey, publicKey };
}

function checked(result, operation) {
  if (result.error)
    throw new Error(`${operation}: ${result.error.code || result.error.status || 'REQUEST_FAILED'}`);
  return result.data;
}

function assertFixtureUser(user) {
  if (user && user.app_metadata?.test_fixture !== FIXTURE) {
    throw new Error(
      'TEST_EMAIL_ALREADY_EXISTS_WITHOUT_FIXTURE_MARKER: refusing to take over an existing account.',
    );
  }
}

async function setup(env, args) {
  const config = configuration(env, args);
  const clientOptions = {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(20_000)])
            : AbortSignal.timeout(20_000),
        }),
    },
  };
  const admin = createClient(config.url, config.serviceKey, clientOptions);
  // Check app schema and service-key privileges before creating any Auth users.
  checked(await admin.from('profiles').select('id').limit(0), 'READ_PROFILES');
  const services = checked(
    await admin.from('service_types').select('code').eq('is_active', true),
    'READ_SERVICES',
  );
  const requirements = checked(
    await admin.from('team_verification_requirements').select('code,is_required').eq('is_active', true),
    'READ_CHECKLIST',
  );
  if (!services.length || !requirements.length)
    throw new Error('Run the database setup and 02_verify_rls.sql first.');

  const existing = new Map();
  let page = 1;
  for (;;) {
    const data = checked(await admin.auth.admin.listUsers({ page, perPage: 1000 }), 'LIST_TEST_USERS');
    for (const user of data.users) {
      const email = user.email?.toLowerCase();
      if (ACCOUNTS.some((account) => account.email === email)) existing.set(email, user);
    }
    if (data.users.length < 1000) break;
    page++;
  }
  for (const user of existing.values()) assertFixtureUser(user);

  const credentialsPath = path.join(__dirname, '..', '.tmp', 'test-accounts.local.json');
  let record;
  if (fs.existsSync(credentialsPath)) {
    record = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    if (record.fixture !== FIXTURE || record.projectUrl !== config.url || !Array.isArray(record.accounts)) {
      throw new Error('LOCAL_CREDENTIAL_FILE_BELONGS_TO_A_DIFFERENT_FIXTURE_OR_PROJECT');
    }
  } else {
    if (existing.size)
      throw new Error(
        'Existing test accounts found but the local password file is missing. Restore it or reset those test passwords through the Dashboard; this script will not reset them silently.',
      );
    const password = `${randomBytes(18).toString('base64url')}aA1!`;
    record = {
      fixture: FIXTURE,
      projectUrl: config.url,
      note: 'Private test credentials. Never commit or share publicly. No SMS/email is sent by setup.',
      accounts: ACCOUNTS.map((account) => ({ ...account, password })),
    };
  }
  for (const account of ACCOUNTS) {
    if (
      !record.accounts.some(
        (entry) =>
          entry.email === account.email && typeof entry.password === 'string' && entry.password.length >= 12,
      )
    ) {
      throw new Error('INCOMPLETE_LOCAL_CREDENTIAL_FILE');
    }
  }
  const saveRecord = () => {
    fs.mkdirSync(path.dirname(credentialsPath), { recursive: true });
    fs.writeFileSync(credentialsPath, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
  };
  // Save passwords before network writes so a partially completed run can be resumed.
  saveRecord();

  const users = {};
  for (const account of ACCOUNTS) {
    const credential = record.accounts.find((entry) => entry.email === account.email);
    let user = existing.get(account.email);
    if (!user) {
      user = checked(
        await admin.auth.admin.createUser({
          email: account.email,
          password: credential.password,
          email_confirm: true,
          app_metadata: { test_fixture: FIXTURE },
          user_metadata: { display_name: account.name, locale: 'vi' },
        }),
        'CREATE_TEST_USER',
      ).user;
    }
    if (!user?.id || !user.email_confirmed_at) throw new Error('TEST_USER_NOT_CONFIRMED');
    assertFixtureUser(user);
    credential.id = user.id;
    saveRecord();
    const profile = checked(
      await admin.from('profiles').select('id,role,is_active').eq('id', user.id).single(),
      'READ_TEST_PROFILE',
    );
    if (!profile.is_active) throw new Error('TEST_ACCOUNT_IS_DISABLED: refusing to reactivate it.');
    if (profile.role !== account.role) {
      if (profile.role !== 'customer')
        throw new Error('TEST_ROLE_WAS_CHANGED: review it before rerunning setup.');
      checked(
        await admin.from('profiles').update({ role: account.role }).eq('id', user.id).select('id').single(),
        'ASSIGN_TEST_ROLE',
      );
    }
    users[account.role] = user;
  }

  let team = checked(
    await admin
      .from('rescue_teams')
      .select('id,name,status,verified_by')
      .eq('partner_reference', TEAM_REFERENCE)
      .maybeSingle(),
    'READ_TEST_TEAM',
  );
  if (
    team &&
    (team.name !== TEAM_NAME ||
      team.status === 'suspended' ||
      (team.verified_by && team.verified_by !== users.admin.id))
  ) {
    throw new Error('TEST_TEAM_WAS_CHANGED: refusing to overwrite it.');
  }
  if (!team) {
    team = checked(
      await admin
        .from('rescue_teams')
        .insert({
          name: TEAM_NAME,
          partner_reference: TEAM_REFERENCE,
          status: 'pending',
          hotline: '+12025550190',
          base_latitude: 16.061,
          base_longitude: 108.2238,
          service_radius_km: 15,
        })
        .select('id,name,status,verified_by')
        .single(),
      'CREATE_TEST_TEAM',
    );
  }
  const member = checked(
    await admin
      .from('provider_members')
      .select('user_id,team_id,status')
      .eq('user_id', users.provider.id)
      .maybeSingle(),
    'READ_TEST_PROVIDER',
  );
  if (member && (member.team_id !== team.id || member.status !== 'active')) {
    throw new Error('TEST_PROVIDER_WAS_CHANGED: refusing to move or reactivate it.');
  }
  if (!member)
    checked(
      await admin.from('provider_members').insert({
        user_id: users.provider.id,
        team_id: team.id,
        display_name: '[TEST] Cứu hộ viên',
        contact_phone_e164: '+12025550191',
        rescue_vehicle_label: '[TEST] Xe cứu hộ mô phỏng',
        is_available: false,
      }),
      'CREATE_TEST_PROVIDER',
    );
  checked(
    await admin.from('team_capabilities').upsert(
      services.map(({ code }) => ({
        team_id: team.id,
        service_code: code,
        is_active: true,
      })),
      { onConflict: 'team_id,service_code', ignoreDuplicates: true },
    ),
    'CREATE_TEST_CAPABILITIES',
  );
  checked(
    await admin.from('team_verification_checks').upsert(
      requirements.map(({ code }) => ({
        team_id: team.id,
        requirement_code: code,
        completed: true,
        note: '[TEST] Checklist mô phỏng cho tài khoản kiểm thử, không phải xác minh đối tác thật.',
        checked_by: users.admin.id,
        checked_at: new Date().toISOString(),
      })),
      { onConflict: 'team_id,requirement_code', ignoreDuplicates: true },
    ),
    'CREATE_TEST_CHECKLIST',
  );
  const checks = checked(
    await admin.from('team_verification_checks').select('requirement_code,completed').eq('team_id', team.id),
    'VERIFY_TEST_CHECKLIST',
  );
  if (
    requirements.some(
      (requirement) =>
        requirement.is_required &&
        !checks.some((check) => check.requirement_code === requirement.code && check.completed),
    )
  ) {
    throw new Error('TEST_CHECKLIST_WAS_CHANGED: review incomplete checks manually.');
  }
  if (team.status === 'pending')
    checked(
      await admin
        .from('rescue_teams')
        .update({
          status: 'verified',
          verified_by: users.admin.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', team.id),
      'ACTIVATE_TEST_TEAM',
    );

  for (const credential of record.accounts) {
    const sessionClient = createClient(config.url, config.publicKey, clientOptions);
    const signedIn = checked(
      await sessionClient.auth.signInWithPassword({ email: credential.email, password: credential.password }),
      'VERIFY_TEST_LOGIN',
    );
    if (signedIn.user?.id !== credential.id || !signedIn.session)
      throw new Error('TEST_LOGIN_IDENTITY_MISMATCH');
    const profile = checked(
      await sessionClient.from('profiles').select('role').eq('id', credential.id).single(),
      'VERIFY_TEST_RLS_PROFILE',
    );
    if (profile.role !== credential.role) throw new Error('TEST_LOGIN_ROLE_MISMATCH');
    checked(await sessionClient.auth.signOut({ scope: 'local' }), 'CLOSE_TEST_SESSION');
    console.log(`${credential.role}: password sign-in and own-profile RLS read passed.`);
  }
  console.log(`Passwords saved only in ${credentialsPath}`);
  console.log(
    'Test provider starts offline with no fabricated GPS. Enable availability in the app with a real location.',
  );
  console.log('Global email/SMS settings and existing accounts/teams were not changed.');
}

if (require.main === module) {
  setup(process.env, process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    console.error(
      'Setup may be partial; keep .tmp/test-accounts.local.json and rerun after resolving the error. No existing users are deleted.',
    );
    process.exitCode = 1;
  });
}

module.exports = { ACCOUNTS, FIXTURE, configuration, assertFixtureUser };
