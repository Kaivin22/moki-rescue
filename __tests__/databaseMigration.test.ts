import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDirectory = path.join(root, 'backend', 'src', 'main', 'resources', 'db', 'migration');
const migrationNames = fs
  .readdirSync(migrationDirectory)
  .filter((name) => name.endsWith('.sql'))
  .sort((left, right) => {
    const leftVersion = Number(left.match(/^[BV](\d+)__/)?.[1]);
    const rightVersion = Number(right.match(/^[BV](\d+)__/)?.[1]);
    return leftVersion - rightVersion;
  });
const initialMigration = fs.readFileSync(path.join(migrationDirectory, 'B1__initial_schema.sql'), 'utf8');
const roleMergeMigration = fs.readFileSync(
  path.join(migrationDirectory, 'V5__merge_dispatcher_into_admin.sql'),
  'utf8',
);
const fairDispatchMigration = fs.readFileSync(
  path.join(migrationDirectory, 'V7__configurable_fair_dispatch.sql'),
  'utf8',
);
const applicationConfig = fs.readFileSync(
  path.join(root, 'backend', 'src', 'main', 'resources', 'application.yml'),
  'utf8',
);

describe('versioned database migrations', () => {
  it('keeps the squashed schema as the immutable clean-database baseline', () => {
    expect(migrationNames[0]).toBe('B1__initial_schema.sql');
    expect(initialMigration).toContain('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions');
    expect(initialMigration).toContain('CREATE TABLE public.rescue_requests');
    expect(initialMigration).toContain('ALTER TABLE public.rescue_requests ENABLE ROW LEVEL SECURITY');
    expect(initialMigration).not.toMatch(/^\s*BEGIN;/m);
    expect(initialMigration).not.toMatch(/^\s*COMMIT;/m);
  });

  it('uses unique, increasing versions for every SQL migration', () => {
    expect(migrationNames.every((name) => /^[BV]\d+__[a-z0-9_]+\.sql$/.test(name))).toBe(true);

    const versions = migrationNames.map((name) => Number(name.match(/^[BV](\d+)__/)?.[1]));
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort((left, right) => left - right));
  });

  it('migrates legacy dispatchers and restricts profiles to three roles', () => {
    expect(roleMergeMigration).toContain("SET role = 'admin'");
    expect(roleMergeMigration).toContain("WHERE role = 'dispatcher'");
    expect(roleMergeMigration).toContain("CHECK (role IN ('customer', 'provider', 'admin'))");
  });

  it('stores per-service dispatch policy and protects provider fairness state', () => {
    expect(fairDispatchMigration).toContain('matching_eta_window_seconds');
    expect(fairDispatchMigration).toContain('matching_starvation_skip_threshold');
    expect(fairDispatchMigration).toContain('CREATE TABLE public.provider_dispatch_stats');
    expect(fairDispatchMigration).toContain('provider_dispatch_stats_no_client_access');
    expect(fairDispatchMigration).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_dispatch_stats TO motorescue_api',
    );
  });

  it('does not silently baseline or permit Flyway clean', () => {
    expect(applicationConfig).toContain('baseline-on-migrate: false');
    expect(applicationConfig).toContain('clean-disabled: true');
    expect(applicationConfig).toContain('validate-migration-naming: true');
  });
});
