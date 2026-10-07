import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const read = (name: string) => fs.readFileSync(path.join(process.cwd(), 'scripts', name), 'utf8');
const sql = (name: string) => read(name).replace(/--[^\n]*/g, '');
const verify = read('02_verify_rls.sql');
const seed = read('05_seed_demo_teams.sql');

describe('operational SQL safety contracts (static, not database execution)', () => {
  it('ships a deterministic clean-install bundle matching every original migration', () => {
    const bundled = read('01_init_database.sql').replace(/\r\n/g, '\n');
    const dir = path.join(process.cwd(), 'backend/src/main/resources/db/migration');
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
    let previousEnd = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
      const digest = createHash('sha256').update(content).digest('hex');
      const start = bundled.indexOf(`-- BEGIN SOURCE: ${file}\n-- SHA256: ${digest}\n`);
      expect(start).toBeGreaterThan(previousEnd);
      const bodyStart = start + `-- BEGIN SOURCE: ${file}\n-- SHA256: ${digest}\n`.length;
      const end = bundled.indexOf(`-- END SOURCE: ${file}\n`, bodyStart);
      expect(bundled.slice(bodyStart, end)).toBe(content + (content.endsWith('\n') ? '' : '\n'));
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

  it('documents preflight then bundled init without instructing duplicate migration execution', () => {
    const section = read('README.md')
      .split('### Cài mới bằng SQL Editor')[1]
      .split('### Database đã tồn tại')[0];
    expect(section.indexOf('1. Chạy `scripts/01_preflight.sql`')).toBeLessThan(
      section.indexOf('2. Chạy **toàn bộ `scripts/01_init_database.sql`'),
    );
    expect(section).toContain('Không chạy lại các file B1–V9 riêng lẻ');
    expect(section).not.toContain('Không có `01_schema.sql`');
  });

  it.each(['01_preflight.sql', '02_verify_rls.sql'])('%s declares a read-only transaction', (name) => {
    expect(sql(name)).toMatch(/BEGIN TRANSACTION READ ONLY;/);
    expect(sql(name).trim()).toMatch(/COMMIT;$/);
    expect(sql(name)).not.toMatch(/^\s*(INSERT INTO|UPDATE public\.|DELETE FROM|DROP |ALTER |CREATE )/m);
  });

  it.each([
    '00_reset.sql',
    '03_bootstrap_operator.sql',
    '04_schedule_retention.sql',
    '05_seed_demo_teams.sql',
  ])('%s wraps mutations in a transaction', (name) => {
    expect(sql(name).trim()).toMatch(/^BEGIN;/);
    expect(sql(name)).toContain('COMMIT;');
  });

  it('keeps reset opt-in and refuses extensions in public', () => {
    expect(read('00_reset.sql')).toContain("confirm_reset CONSTANT TEXT := 'CHANGE_ME'");
    expect(read('00_reset.sql')).toContain("deployment_environment NOT IN ('local', 'staging')");
    expect(read('00_reset.sql')).toContain('RESET_REFUSED_EXTENSION_IN_PUBLIC');
    expect(read('00_reset.sql').indexOf('RESET_NOT_CONFIRMED')).toBeLessThan(
      read('00_reset.sql').indexOf('DROP SCHEMA'),
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
    expect(tables).toHaveLength(26);
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
    const bootstrap = sql('03_bootstrap_operator.sql');
    expect(bootstrap).not.toMatch(/MIN\(id\)/i);
    expect(bootstrap).toContain('phone IN (admin_phone, substring(admin_phone FROM 2))');
    expect(bootstrap).toContain('INTO STRICT matched_user_id');
    expect(bootstrap).toContain('ADMIN_ALREADY_BOOTSTRAPPED_USE_OPERATOR_UI');
    expect(bootstrap).toContain('ACCOUNT_INACTIVE_REVIEW_BEFORE_BOOTSTRAP');
    expect(bootstrap).not.toMatch(/UPDATE auth\.|INSERT INTO auth\.|is_active\s*=\s*TRUE/i);
  });

  it('validates retention functions before replacing exactly four schedules', () => {
    const retention = sql('04_schedule_retention.sql');
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
      'electric_battery',
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
    expect(sql('05_seed_demo_teams.sql')).not.toMatch(
      /INSERT INTO (auth\.|public\.(provider_members|rescue_requests))|DO UPDATE|DROP |DELETE FROM/,
    );
  });

  it('documents manual order without pretending cloud email settings were changed', () => {
    const readme = read('README.md');
    expect(readme).toContain('Cài mới bằng SQL Editor');
    expect(readme).toContain('Không trộn hai cách quản lý');
    expect(readme).toContain('Confirm email: OFF');
    expect(readme).toContain('chưa được thay đổi trong lần rà soát này');
    expect(readme).not.toContain('Không có seed đội cứu hộ');
  });
});
