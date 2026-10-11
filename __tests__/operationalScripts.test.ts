import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const {
  generate,
  cleanInstallContent,
  generateVerification,
  preflightSql,
  verificationBlock,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = require('../scripts/build-init-sql.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { setupPermissionsBlock } = require('../scripts/test-setup-permissions.cjs');

const read = (name: string) => fs.readFileSync(path.join(process.cwd(), 'scripts', name), 'utf8');
const sql = (name: string) => read(name).replace(/--[^\n]*/g, '');
const verify: string = generateVerification();
const seed = read('02_seed_demo_teams.sql');

describe('operational SQL safety contracts (static, not database execution)', () => {
  it('ships a deterministic bundle with only the documented B1 role adaptation', () => {
    const bundled = read('01_init_database.sql').replace(/\r\n/g, '\n');
    const dir = path.join(process.cwd(), 'backend/src/main/resources/db/migration');
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
    let previousEnd = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
      const originalDigest = createHash('sha256').update(content).digest('hex');
      const start = bundled.indexOf(`-- BEGIN SOURCE: ${file}\n`);
      expect(start).toBeGreaterThan(previousEnd);
      const digestStart = bundled.indexOf('-- SHA256: ', start);
      const bodyStart = bundled.indexOf('\n', digestStart) + 1;
      const end = bundled.indexOf(`-- END SOURCE: ${file}\n`, bodyStart);
      const body = bundled.slice(bodyStart, end);
      const digest = createHash('sha256').update(body).digest('hex');
      expect(bundled.slice(digestStart, bodyStart)).toBe(`-- SHA256: ${digest}\n`);
      if (file === 'B1__initial_schema.sql') {
        expect(bundled.slice(start, digestStart)).toContain(`-- ORIGINAL SHA256: ${originalDigest}`);
        const adaptedBranches = body.match(
          /  -- BEGIN INSTALL ADAPTATION:[\s\S]*?  -- END INSTALL ADAPTATION\n/g,
        );
        expect(adaptedBranches).toHaveLength(1);
        // Outside this one branch, even B1 must remain byte-identical to its source.
        const restored = body.replace(
          adaptedBranches![0],
          '  ELSE\n    ALTER ROLE motorescue_api\n' +
            '      LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;\n',
        );
        expect(restored).toBe(content);
      } else {
        expect(body).toBe(content + (content.endsWith('\n') ? '' : '\n'));
      }
      previousEnd = end;
    }
    expect(bundled.match(/-- BEGIN SOURCE:/g)).toHaveLength(files.length);
    expect(
      execFileSync(process.execPath, ['scripts/build-init-sql.cjs', '--check'], {
        cwd: process.cwd(),
        encoding: 'utf8',
      }),
    ).toContain('Init SQL matches');
  });

  it('reuses only an already safe runtime role without altering attributes or passwords', () => {
    const init = sql('01_init_database.sql');
    expect(init).not.toMatch(/ALTER ROLE motorescue_api|DROP ROLE|PASSWORD\s+/);
    expect(init).toContain("IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'motorescue_api') THEN");
    expect(init).toContain('CREATE ROLE motorescue_api');
    const branch = init.slice(init.indexOf('ELSIF NOT EXISTS'), init.indexOf('CREATE TABLE public.profiles'));
    for (const condition of [
      'rolcanlogin',
      'NOT rolinherit',
      'NOT rolsuper',
      'NOT rolcreatedb',
      'NOT rolcreaterole',
      'NOT rolreplication',
      'rolbypassrls',
    ])
      expect(branch).toContain(condition);
    expect(branch).toContain("RAISE EXCEPTION 'MOTORESCUE_API_ROLE_UNSAFE'");
    expect(verify).toContain("RAISE EXCEPTION 'MOTORESCUE_API_ROLE_UNSAFE'");
  });

  it('refuses to guess if the immutable B1 role block has changed', () => {
    const original = fs
      .readFileSync('backend/src/main/resources/db/migration/B1__initial_schema.sql', 'utf8')
      .replace(/\r\n/g, '\n');
    expect(() =>
      cleanInstallContent(
        'B1__initial_schema.sql',
        original.replace('ALTER ROLE motorescue_api', 'ALTER ROLE different_role'),
      ),
    ).toThrow('B1 runtime-role block changed');
    expect(cleanInstallContent('V11__notification_inbox_and_support.sql', original)).toBe(original);
  });

  it('guards init before any app DDL, wraps it atomically and never resets the schema', () => {
    const init = sql('01_init_database.sql');
    expect(init.trim()).toMatch(/^BEGIN;/);
    expect(init.match(/^COMMIT;$/gm)).toHaveLength(1);
    expect(init.indexOf('PUBLIC_NOT_EMPTY_DO_NOT_RUN_CLEAN_INSTALL')).toBeLessThan(
      init.indexOf('CREATE TABLE public.profiles'),
    );
    expect(init).toContain('DATABASE_ALREADY_MANAGED_BY_FLYWAY');
    expect(init).toContain('PUBLIC_HAS_CUSTOM_FUNCTIONS_REVIEW_BEFORE_INSTALL');
    expect(init).toContain('EXTENSION_SCHEMA_MISMATCH_REVIEW_BEFORE_INSTALL');
    expect(init).not.toMatch(/DROP SCHEMA|CREATE TABLE (?:public\.)?flyway_schema_history/);
  });

  it('keeps two main SQL files, three deliberate maintenance scripts and no duplicate upgrade SQL', () => {
    const files = fs
      .readdirSync(path.join(process.cwd(), 'scripts'))
      .filter((file) => file.endsWith('.sql'))
      .sort();
    expect(files).toEqual(['01_init_database.sql', '02_seed_demo_teams.sql']);
    expect(
      fs
        .readdirSync('scripts/optional')
        .filter((name) => name.endsWith('.sql'))
        .sort(),
    ).toEqual(['00_reset.sql', '03_bootstrap_operator.sql', '04_schedule_retention.sql']);
    expect(fs.readdirSync('scripts/archive').filter((name) => name.endsWith('.sql'))).toEqual([]);
    const section = read('README.md');
    const orderedSql = [...section.matchAll(/^\|\s*(\d+)\s*\|\s*`([^`]+)`/gm)].map((match) => [
      match[1],
      match[2],
    ]);
    expect(orderedSql).toEqual([
      ['1', '01_init_database.sql'],
      ['2', '02_seed_demo_teams.sql'],
    ]);
    expect(section).toContain('Nếu database/project mới hoàn toàn thì bỏ qua bước reset');
    expect(section).toContain('Không chạy lại các file B1–V13 riêng lẻ');
    expect(section).toContain('Không cần chạy `optional/03_bootstrap_operator.sql`');
    expect(section).toContain('không xóa file đó khi reset schema');
  });

  it.each([
    ['preflight', preflightSql],
    ['verification', verify],
  ])('%s diagnostic declares a read-only transaction', (_name, source) => {
    const statement = source.replace(/--[^\n]*/g, '');
    expect(statement).toMatch(/BEGIN TRANSACTION READ ONLY;/);
    expect(statement.trim()).toMatch(/COMMIT;$/);
    expect(statement).not.toMatch(/^\s*(INSERT INTO|UPDATE public\.|DELETE FROM|DROP |ALTER |CREATE )/m);
  });

  it.each([
    'optional/00_reset.sql',
    'optional/03_bootstrap_operator.sql',
    'optional/04_schedule_retention.sql',
    '02_seed_demo_teams.sql',
  ])('%s wraps mutations in a transaction', (name) => {
    expect(sql(name).trim()).toMatch(/^BEGIN;/);
    expect(sql(name)).toContain('COMMIT;');
  });

  it('keeps reset opt-in and refuses extensions in public', () => {
    expect(read('optional/00_reset.sql')).toContain("confirm_reset CONSTANT TEXT := 'CHANGE_ME'");
    expect(read('optional/00_reset.sql')).toContain("deployment_environment NOT IN ('local', 'staging')");
    expect(read('optional/00_reset.sql')).toContain('RESET_REFUSED_EXTENSION_IN_PUBLIC');
    expect(read('optional/00_reset.sql').indexOf('RESET_NOT_CONFIRMED')).toBeLessThan(
      read('optional/00_reset.sql').indexOf('DROP SCHEMA'),
    );
  });

  it('checks every table created by the immutable migrations for existence and RLS', () => {
    const dir = path.join(process.cwd(), 'backend/src/main/resources/db/migration');
    const tables = fs
      .readdirSync(dir)
      .flatMap((file) =>
        [...fs.readFileSync(path.join(dir, file), 'utf8').matchAll(/CREATE TABLE public\.(\w+)/g)].map(
          (match) => match[1],
        ),
      );
    expect(tables).toHaveLength(30);
    const existence = verify.slice(0, verify.indexOf('MISSING_TABLES'));
    const rls = verify.slice(verify.indexOf('DECLARE\n  unprotected'), verify.indexOf('RLS_DISABLED_ON'));
    for (const name of tables) {
      expect(existence).toContain(`'${name}'`);
      expect(rls).toContain(`'${name}'`);
    }
  });

  it('checks effective queue privileges, privileged profile columns and enabled triggers', () => {
    expect(verify).toContain("ARRAY['dispatch_recovery_jobs', 'push_outbox']");
    expect(verify).toContain('has_any_column_privilege');
    expect(verify).toContain('QUEUE_RUNTIME_GRANT_MISSING');
    expect(verify).toContain('PROFILE_PRIVILEGED_COLUMN_WRITABLE');
    expect(verify).toContain("t.tgenabled IN ('O', 'A')");
    expect(verify).toContain('i.indisvalid AND i.indisready');
  });

  it('bootstraps one known account without MIN(uuid), auth writes or reactivating users', () => {
    const bootstrap = sql('optional/03_bootstrap_operator.sql');
    expect(bootstrap).not.toMatch(/MIN\(id\)/i);
    expect(bootstrap).toContain('phone IN (admin_phone, substring(admin_phone FROM 2))');
    expect(bootstrap).toContain('INTO STRICT matched_user_id');
    expect(bootstrap).toContain('ADMIN_ALREADY_BOOTSTRAPPED_USE_OPERATOR_UI');
    expect(bootstrap).toContain('ACCOUNT_INACTIVE_REVIEW_BEFORE_BOOTSTRAP');
    expect(bootstrap).not.toMatch(/UPDATE auth\.|INSERT INTO auth\.|is_active\s*=\s*TRUE/i);
  });

  it('validates retention functions before replacing exactly four schedules', () => {
    const retention = sql('optional/04_schedule_retention.sql');
    expect(retention.match(/SELECT cron\.schedule\(/g)).toHaveLength(4);
    expect(retention.indexOf('RETENTION_FUNCTION_MISSING')).toBeLessThan(
      retention.indexOf('SELECT cron.unschedule'),
    );
    expect(retention).toContain('REVIEW_CRON_TIMEZONE_BEFORE_SCHEDULING');
    expect(retention).toContain('RETENTION_JOB_OWNED_BY_ANOTHER_ROLE');
  });

  it('provides 12 distinct demo locations within the prepared OSRM bounding box', () => {
    const rows = [
      ...seed.matchAll(
        /\('(DEMO-DN-\d{2})', '\[DEMO\][^']+', ([\d.]+), ([\d.]+), ([\d.]+), '(\+120255501\d{2})', ARRAY\[([^\]]+)\]\)/g,
      ),
    ];
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r[1])).size).toBe(12);
    expect(new Set(rows.map((r) => `${r[2]},${r[3]}`)).size).toBe(12);
    const catalog = new Set([
      'flat_tire',
      'dead_battery',
      'out_of_fuel',
      'minor_repair',
      'motorbike_transport',
    ]);
    for (const row of rows) {
      expect(Number(row[2])).toBeGreaterThanOrEqual(15.95);
      expect(Number(row[2])).toBeLessThanOrEqual(16.18);
      expect(Number(row[3])).toBeGreaterThanOrEqual(108.05);
      expect(Number(row[3])).toBeLessThanOrEqual(108.34);
      expect(Number(row[4])).toBeGreaterThan(0);
      expect(Number(row[4])).toBeLessThanOrEqual(100);
      for (const match of row[6].matchAll(/'([^']+)'/g)) expect(catalog.has(match[1])).toBe(true);
    }
  });

  it('keeps seed opt-in, repeatable and separate from real authentication and assignments', () => {
    expect(seed).toContain("deployment_environment CONSTANT TEXT := 'CHANGE_ME'");
    expect(seed).toContain("deployment_environment NOT IN ('local', 'staging')");
    expect(seed).toContain("sample.partner_reference, 'pending'");
    expect(seed).toContain('ON CONFLICT (partner_reference) DO NOTHING');
    expect(seed).toContain('IF new_team_id IS NOT NULL THEN');
    expect(sql('02_seed_demo_teams.sql')).not.toMatch(
      /INSERT INTO (auth\.|public\.(provider_members|rescue_requests))|DO UPDATE|DROP |DELETE FROM/,
    );
  });

  it('documents manual order without pretending cloud email settings were changed', () => {
    const readme = read('README.md');
    expect(readme).toContain('SQL cài mới Supabase — bộ rút gọn');
    expect(readme).toContain('không trộn với Flyway baseline/migrate');
    expect(readme).toContain('Tài khoản mẫu được xác nhận email riêng');
    expect(readme).toContain('Không đổi cài đặt xác thực toàn project trong lần rút gọn này');
    expect(readme).not.toContain('Không có seed đội cứu hộ');
  });

  it('runs all security checks before committing the complete installation', () => {
    for (const bundle of [generate()]) {
      expect(bundle).toContain(verificationBlock());
      expect(bundle.indexOf('-- END SCHEMA VERIFICATION')).toBeLessThan(bundle.indexOf('\nCOMMIT;'));
      expect(bundle.match(/^COMMIT;$/gm)).toHaveLength(1);
      expect(bundle).not.toContain('BEGIN TRANSACTION READ ONLY;');
      expect(bundle).toContain('MOTORESCUE_API_HAS_DDL_PRIVILEGE');
    }
  });

  it.each(['--repair-test-setup', '--upgrade-from=8', '--upgrade-from=12'])(
    'rejects the removed patch command %s instead of generating more SQL files',
    (mode) => {
      expect(() =>
        execFileSync(process.execPath, ['scripts/build-init-sql.cjs', mode], {
          cwd: process.cwd(),
          stdio: 'pipe',
        }),
      ).toThrow('standalone patch generation is not supported');
    },
  );

  it('grants fixture permissions without changing roles or opening mobile privileges', () => {
    const statements = setupPermissionsBlock().replace(/--[^\n]*/g, '');
    expect(statements).not.toMatch(
      /\b(?:DROP|TRUNCATE|REVOKE)\b|ALTER ROLE|ALTER TABLE|CREATE POLICY|INSERT INTO|DELETE FROM|UPDATE public\.|GRANT ALL|ALL TABLES|ALTER DEFAULT PRIVILEGES/,
    );
    const grants = statements.match(/GRANT[\s\S]*?;/g)!;
    expect(grants).toHaveLength(5);
    for (const grant of grants) expect(grant).toMatch(/ TO service_role;$/);
    expect(statements).toContain('GRANT UPDATE (role) ON public.profiles TO service_role');
    expect(statements).toContain(
      'GRANT UPDATE (status, verified_by, verified_at) ON public.rescue_teams TO service_role',
    );
    expect(statements).toContain("RAISE EXCEPTION 'TEST_SETUP_SELECT_MISSING: %'");
    expect(statements).toContain("RAISE EXCEPTION 'SUPABASE_SERVICE_ROLE_REQUIRED'");
    expect(statements).not.toMatch(/\bTO (?:PUBLIC|anon|authenticated|motorescue_api)\b/i);
  });

  it('includes and verifies explicit fixture grants before committing init', () => {
    for (const bundle of [generate()]) {
      expect(bundle).toContain(setupPermissionsBlock());
      expect(bundle.indexOf('-- BEGIN TEST SETUP PERMISSIONS')).toBeLessThan(
        bundle.indexOf('-- BEGIN SCHEMA VERIFICATION'),
      );
    }
  });

  it('validates the current schema, active services and shop coverage before demo inserts', () => {
    expect(seed).toContain('RUN_CURRENT_INIT_DATABASE_FIRST');
    expect(seed).toContain('service_types_gasoline_scope');
    expect(seed).toContain('team_capabilities_gasoline_scope');
    expect(seed).toContain('base_address');
    expect(seed.indexOf('DEMO_SHOP_OUTSIDE_SERVICE_AREA')).toBeLessThan(seed.indexOf('INSERT INTO'));
    expect(seed.indexOf('DEMO_SERVICE_NOT_ACTIVE')).toBeLessThan(seed.indexOf('INSERT INTO'));
    for (const name of ['01_init_database.sql', '02_seed_demo_teams.sql', 'optional/00_reset.sql']) {
      expect(read(name)).toContain('pg_advisory_xact_lock(225122, 274)');
    }
  });
});
