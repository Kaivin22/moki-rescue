import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const backupTool = require('../scripts/database-backup.cjs');

const project = process.cwd();
const temporaryRoot = path.join(project, '.tmp');
const toc = ['public profiles', 'public rescue_requests', 'public rescue_teams', 'auth users']
  .map((table, index) => `${index + 1}; 0 ${index + 100} TABLE DATA ${table} postgres`)
  .join('\n');
const metadata = {
  serverMajor: 16,
  hoursSchemaPresent: false,
  extensions: [{ name: 'postgis', schema: 'extensions', version: '3.4.0' }],
  policyRoles: ['authenticated'],
};
const cluster = {
  database: 'postgres',
  serverMajor: 16,
  hasAuth: false,
  publicTables: 0,
  superuser: true,
  databases: [],
};
let folder: string;
let fixtureProject: string;
let passfile: string;
let env: Record<string, string>;

beforeEach(() => {
  fs.mkdirSync(temporaryRoot, { recursive: true });
  folder = fs.mkdtempSync(path.join(temporaryRoot, 'database-backup-test-'));
  fixtureProject = path.join(folder, 'project');
  fs.mkdirSync(fixtureProject);
  passfile = path.join(folder, 'fixture.pgpass');
  fs.writeFileSync(passfile, 'NOT A REAL PASSWORD FILE');
  env = {
    BACKUP_PG_HOST: 'db.example.invalid',
    BACKUP_PG_PORT: '5432',
    BACKUP_PG_DATABASE: 'postgres',
    BACKUP_PG_USER: 'postgres',
    BACKUP_PG_PASSFILE: passfile,
    BACKUP_ROOT: folder,
    RESTORE_PG_HOST: '127.0.0.1',
    RESTORE_PG_PORT: '5433',
    RESTORE_PG_DATABASE: 'postgres',
    RESTORE_PG_USER: 'postgres',
    RESTORE_PG_PASSFILE: passfile,
    RESTORE_PG_ISOLATED: 'true',
  };
  // Fake the repository boundary only; every test file remains inside .tmp on E.
  const realpath = fs.realpathSync;
  jest
    .spyOn(fs, 'realpathSync')
    .mockImplementation(((file: fs.PathLike) =>
      path.resolve(String(file)) === project ? fixtureProject : realpath(file)) as typeof fs.realpathSync);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  // Remove only the unique disposable fixture created by this test, never backups.
  if (path.dirname(folder) !== temporaryRoot || !path.basename(folder).startsWith('database-backup-test-')) {
    throw new Error('Unsafe test cleanup target');
  }
  fs.rmSync(folder, { recursive: true });
});

function fixtureArchive(extra = {}) {
  const archiveFolder = path.join(folder, 'archive');
  fs.mkdirSync(archiveFolder);
  const archive = path.join(archiveFolder, 'database.dump');
  fs.writeFileSync(archive, 'FAKE ARCHIVE FOR UNIT TESTS ONLY');
  fs.writeFileSync(
    path.join(archiveFolder, 'manifest.json'),
    JSON.stringify({
      format: 1,
      archive: 'database.dump',
      schemas: ['public', 'auth'],
      dumpMajor: 16,
      bytes: fs.statSync(archive).size,
      sha256: backupTool.archiveDigest(archive),
      ...metadata,
      ...extra,
    }),
  );
  return archiveFolder;
}

function fakeTools(state = cluster) {
  const call = jest.fn(
    (name: string, args: string[], options?: { input?: string; env?: NodeJS.ProcessEnv }) => {
      if (name === 'pg_restore' && args.includes('--list')) return toc;
      if (name === 'pg_restore' && args.includes('--schema-only'))
        return 'CREATE SCHEMA public;\nCREATE SCHEMA auth;';
      if (name === 'psql' && options?.input?.includes("'hasAuth'")) return JSON.stringify(state);
      if (name === 'psql' && options?.input?.includes('json_object_agg'))
        return '{"public.profiles":2,"auth.users":2}';
      if (name === 'psql' && options?.input?.includes("'hoursSchemaPresent'"))
        return JSON.stringify(metadata);
      if (name === 'pg_dump') {
        const target = args.find((arg) => arg.startsWith('--file='))!.slice(7);
        fs.writeFileSync(target, 'FAKE DUMP');
      }
      return '';
    },
  );
  return { major: 16, call };
}

describe('native backup guardrails (fake executables, no database connections)', () => {
  it('requires every source connection field, not implicit libpq defaults', () => {
    expect(() => backupTool.connection({}, 'BACKUP_PG')).toThrow('Missing BACKUP_PG_HOST');
  });
  it.each(['https://example.invalid', 'host;DROP DATABASE postgres', '/tmp/socket'])(
    'rejects unsafe source host %s',
    (host) => {
      expect(() => backupTool.connection({ ...env, BACKUP_PG_HOST: host }, 'BACKUP_PG')).toThrow('host/port');
    },
  );
  it.each(['0', '65536', '5432abc'])('rejects invalid port %s', (port) => {
    expect(() => backupTool.connection({ ...env, BACKUP_PG_PORT: port }, 'BACKUP_PG')).toThrow('host/port');
  });
  it('requires TLS for remote backup and an explicit private password file', () => {
    expect(backupTool.connection(env, 'BACKUP_PG').sslmode).toBe('verify-full');
    expect(() => backupTool.connection({ ...env, BACKUP_PG_SSLMODE: 'disable' }, 'BACKUP_PG')).toThrow('TLS');
    const internal = path.join(fixtureProject, 'password.pgpass');
    fs.writeFileSync(internal, 'FAKE');
    expect(() => backupTool.connection({ ...env, BACKUP_PG_PASSFILE: internal }, 'BACKUP_PG')).toThrow(
      'outside',
    );
  });
  it.each(['db.example.invalid', 'localhost', '127.0.0.1.example.invalid'])(
    'refuses a restore to %s',
    (host) => {
      expect(() => backupTool.connection({ ...env, RESTORE_PG_HOST: host }, 'RESTORE_PG')).toThrow(
        'literal loopback',
      );
    },
  );
  it('requires the maintenance database and exact isolation confirmation', () => {
    expect(() => backupTool.connection({ ...env, RESTORE_PG_DATABASE: 'application' }, 'RESTORE_PG')).toThrow(
      'maintenance',
    );
    expect(() => backupTool.connection({ ...env, RESTORE_PG_ISOLATED: 'false' }, 'RESTORE_PG')).toThrow(
      'must be true',
    );
    expect(backupTool.connection(env, 'RESTORE_PG').sslmode).toBe('disable');
  });
  it('strips inherited libpq redirection/passwords and marks source read-only', () => {
    const actual = backupTool.childEnvironment(backupTool.connection(env, 'BACKUP_PG'), true, {
      PATH: 'fixture',
      PGHOSTADDR: 'remote',
      PGSERVICE: 'production',
      PGPASSWORD: 'SECRET',
      PGDATABASE: 'wrong',
      PGOPTIONS: 'unsafe',
      PGSSLROOTCERT: 'untrusted',
    });
    expect(actual).toMatchObject({
      PGHOST: 'db.example.invalid',
      PGDATABASE: 'postgres',
      PGOPTIONS: '-c default_transaction_read_only=on',
      PGPASSFILE: passfile,
    });
    for (const key of ['PGHOSTADDR', 'PGSERVICE', 'PGPASSWORD', 'PGSSLROOTCERT'])
      expect(actual).not.toHaveProperty(key);
    expect(JSON.stringify(actual)).not.toContain('SECRET');
  });
  it('passes an explicitly configured certificate without inheriting a different one', () => {
    const config = backupTool.connection({ ...env, BACKUP_PG_SSLROOTCERT: passfile }, 'BACKUP_PG');
    expect(backupTool.childEnvironment(config, true, {}).PGSSLROOTCERT).toBe(passfile);
  });
  it('refuses repository backup directories, including the root itself', () => {
    expect(() => backupTool.outsideProjectDirectory(fixtureProject)).toThrow('outside');
    const inside = path.join(fixtureProject, '.tmp');
    fs.mkdirSync(inside);
    expect(() => backupTool.outsideProjectDirectory(inside)).toThrow('outside');
    expect(backupTool.outsideProjectDirectory(folder)).toBe(folder);
  });
  it('rejects malformed SQL identifiers', () => {
    expect(() => backupTool.ident("user'; DELETE FROM auth.users; --")).toThrow('identifier');
    expect(backupTool.ident('authenticated')).toBe('"authenticated"');
  });
  it('requires all critical tables and rejects an unsupported table outside scope', () => {
    expect(backupTool.tableDataEntries(toc)).toHaveLength(4);
    expect(() => backupTool.tableDataEntries(toc.replace('auth users', 'auth identities'))).toThrow(
      'auth.users',
    );
    expect(() =>
      backupTool.tableDataEntries(`${toc}\n88; 0 888 TABLE DATA storage objects postgres`),
    ).toThrow('Unsupported');
  });
  it('supports count reports with over 50 tables without json_build_object argument limits', () => {
    const query: string = backupTool.rowCountsSql(
      Array.from({ length: 80 }, (_, i) => ['public', `table_${i}`]),
    );
    expect(query).toContain('json_object_agg');
    expect(query.match(/SELECT count\(\*\)/g)).toHaveLength(80);
  });
  it('detects altered archives before invoking restore', () => {
    const archiveFolder = fixtureArchive();
    fs.appendFileSync(path.join(archiveFolder, 'database.dump'), 'damage');
    const tools = fakeTools();
    expect(() => backupTool.inspectBackup(archiveFolder, tools)).toThrow('checksum/size');
    expect(tools.call).not.toHaveBeenCalled();
  });
  it('detects same-size corruption by checksum', () => {
    const archiveFolder = fixtureArchive();
    const file = path.join(archiveFolder, 'database.dump');
    fs.writeFileSync(file, Buffer.alloc(fs.statSync(file).size, 42));
    expect(() => backupTool.inspectBackup(archiveFolder, fakeTools())).toThrow('checksum/size');
  });
  it('does not trust another filename in a manifest', () => {
    expect(() =>
      backupTool.inspectBackup(fixtureArchive({ archive: '../private.dump' }), fakeTools()),
    ).toThrow('manifest');
  });

  it('rejects an archive whose resolved path escapes its backup directory', () => {
    const archiveFolder = fixtureArchive();
    // A virtual symlink: no Windows symlink privileges or outside-workspace writes needed.
    const original = jest.mocked(fs.realpathSync).getMockImplementation()!;
    jest
      .mocked(fs.realpathSync)
      .mockImplementation(((file: fs.PathLike) =>
        String(file) === path.join(archiveFolder, 'database.dump')
          ? passfile
          : original(file)) as typeof fs.realpathSync);
    expect(() => backupTool.inspectBackup(archiveFolder, fakeTools())).toThrow('escapes');
  });
  it('verify inspects the archive but never connects to any database', () => {
    const tools = fakeTools();
    expect(backupTool.inspectBackup(fixtureArchive(), tools).tables).toHaveLength(4);
    expect(tools.call).toHaveBeenCalledTimes(1);
    expect(tools.call.mock.calls[0][0]).toBe('pg_restore');
    expect(tools.call.mock.calls[0][1][0]).toBe('--list');
  });
  it.each([
    { hasAuth: true },
    { publicTables: 1 },
    { superuser: false },
    { database: 'production' },
    { databases: ['another_app'] },
    { databases: null },
    { hasAuth: undefined },
  ])('refuses a non-isolated or incomplete cluster: %j', (changed) => {
    expect(() => backupTool.assertIsolatedCluster({ ...cluster, ...changed })).toThrow('Refusing');
  });
  it('permits only empty dedicated clusters or prior drill databases', () => {
    expect(() => backupTool.assertIsolatedCluster(cluster)).not.toThrow();
    expect(() =>
      backupTool.assertIsolatedCluster({ ...cluster, databases: ['motorescue_drill_0123456789abcdef'] }),
    ).not.toThrow();
  });
  it('checks native version consistency without a shell or database arguments', () => {
    const run = jest.fn(() => ({ status: 0, stdout: 'pg_dump (PostgreSQL) 16.11' }));
    expect(backupTool.nativeTools(undefined, run).major).toBe(16);
    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenCalledWith(
      'pg_dump',
      ['--version'],
      expect.objectContaining({ shell: false, windowsHide: true }),
    );
  });
  it('rejects old or mixed client versions', () => {
    expect(() =>
      backupTool.nativeTools(undefined, () => ({ status: 0, stdout: 'psql (PostgreSQL) 14.5' })),
    ).toThrow('15+');
    const run = jest
      .fn()
      .mockReturnValueOnce({ status: 0, stdout: 'pg_dump (PostgreSQL) 16.1' })
      .mockReturnValue({ status: 0, stdout: 'psql (PostgreSQL) 15.2' });
    expect(() => backupTool.nativeTools(undefined, run)).toThrow('matching');
  });
  it('reports a missing executable without disclosing raw tool stderr', () => {
    const run = () => ({ status: null, error: { code: 'ENOENT' }, stderr: 'SECRET COPY ROW / password' });
    expect(() => backupTool.nativeTools(undefined, run)).toThrow('ENOENT');
    expect(() => backupTool.nativeTools(undefined, run)).not.toThrow('SECRET');
  });
  it('demands source confirmation before making any calls', () => {
    const tools = fakeTools();
    expect(() => backupTool.backup(env, [], tools)).toThrow('--confirm-source');
    expect(tools.call).not.toHaveBeenCalled();
  });
  it('creates distinct complete backups with read-only source connections and no password arguments', () => {
    const tools = fakeTools();
    backupTool.backup(env, ['--confirm-source'], tools);
    backupTool.backup(env, ['--confirm-source'], tools);
    const backups = fs.readdirSync(folder).filter((name) => name.startsWith('motorescue-'));
    expect(backups).toHaveLength(2);
    for (const item of backups) {
      const inspected = backupTool.inspectBackup(path.join(folder, item), tools);
      expect(inspected.manifest).toMatchObject({
        hoursSchemaPresent: false,
        restoreTested: false,
        dumpMajor: 16,
      });
      expect(fs.existsSync(path.join(folder, item, 'database.dump.partial'))).toBe(false);
    }
    const dumpCall = tools.call.mock.calls.find(([name]) => name === 'pg_dump')!;
    expect(dumpCall[1]).toEqual(
      expect.arrayContaining(['--schema=public', '--schema=auth', '--no-password']),
    );
    expect(dumpCall[2]?.env?.PGOPTIONS).toContain('read_only=on');
  });
  it('does not stamp a success manifest on an incomplete dump', () => {
    const tools = fakeTools();
    const originalCall = tools.call.getMockImplementation()!;
    tools.call.mockImplementation((name, args, options) => {
      if (name === 'pg_dump') throw new Error('simulated dump failure');
      return originalCall(name, args, options);
    });
    expect(() => backupTool.backup(env, ['--confirm-source'], tools)).toThrow('incomplete');
    const incomplete = fs.readdirSync(folder).find((name) => name.startsWith('motorescue-'))!;
    expect(fs.existsSync(path.join(folder, incomplete, 'manifest.json'))).toBe(false);
  });
  it('refuses restoring before confirmation without touching the target', () => {
    const tools = fakeTools();
    expect(() => backupTool.restoreDrill(env, [], tools, 'not-used')).toThrow('--confirm-local-drill');
    expect(tools.call).not.toHaveBeenCalled();
  });
  it('checks isolation before issuing CREATE DATABASE', () => {
    const tools = fakeTools({ ...cluster, databases: ['live_application'] as never[] });
    expect(() => backupTool.restoreDrill(env, ['--confirm-local-drill'], tools, fixtureArchive())).toThrow(
      'Refusing',
    );
    expect(tools.call.mock.calls.some(([, , options]) => options?.input?.includes('CREATE DATABASE'))).toBe(
      false,
    );
  });
  it('rejects incompatible versions and extension layouts before writing any SQL', () => {
    const tools = fakeTools();
    expect(() =>
      backupTool.restoreDrill(env, ['--confirm-local-drill'], tools, fixtureArchive({ dumpMajor: 17 })),
    ).toThrow('at least as new');
    expect(tools.call.mock.calls.some(([, , options]) => options?.input?.includes('CREATE DATABASE'))).toBe(
      false,
    );
  });

  it('rejects unsupported extension layouts before creating a database', () => {
    const tools = fakeTools();
    const archiveFolder = fixtureArchive({ extensions: [{ name: 'postgis', schema: 'public' }] });
    expect(() => backupTool.restoreDrill(env, ['--confirm-local-drill'], tools, archiveFolder)).toThrow(
      'extension layout',
    );
    expect(tools.call.mock.calls.some(([, , options]) => options?.input?.includes('CREATE DATABASE'))).toBe(
      false,
    );
  });

  it('rejects malformed role metadata before creating a database', () => {
    const tools = fakeTools();
    expect(() =>
      backupTool.restoreDrill(env, ['--confirm-local-drill'], tools, fixtureArchive({ policyRoles: [null] })),
    ).toThrow('identifier');
    expect(tools.call.mock.calls.some(([, , options]) => options?.input?.includes('CREATE DATABASE'))).toBe(
      false,
    );
  });
  it('never uses a local database already present: creates a fresh drill, keeps data, and labels limits', () => {
    const tools = fakeTools();
    const archiveFolder = fixtureArchive();
    backupTool.restoreDrill(env, ['--confirm-local-drill'], tools, archiveFolder);
    const create = tools.call.mock.calls.find(([, , options]) =>
      options?.input?.includes('CREATE DATABASE'),
    )!;
    expect(create[2]?.env?.PGDATABASE).toBe('postgres');
    expect(create[2]?.env?.PGHOST).toBe('127.0.0.1');
    expect(create[2]?.input).toMatch(/^CREATE DATABASE "motorescue_drill_[0-9a-f]{16}" TEMPLATE template0/);
    const restore = tools.call.mock.calls.find(
      ([name, args]) => name === 'pg_restore' && args.includes('--exit-on-error'),
    )!;
    expect(restore[1]).toEqual(
      expect.arrayContaining(['--single-transaction', '--no-owner', '--no-privileges']),
    );
    expect(restore[1]).not.toContain('--clean');
    expect(restore[2]?.env?.PGDATABASE).toMatch(/^motorescue_drill_/);
    expect(tools.call.mock.calls.some(([, , options]) => options?.input?.includes('DROP DATABASE'))).toBe(
      false,
    );
    const reportFile = fs.readdirSync(archiveFolder).find((name) => name.startsWith('restore-'))!;
    const report = JSON.parse(fs.readFileSync(path.join(archiveFolder, reportFile), 'utf8'));
    expect(report).toMatchObject({
      databaseRestoreSucceeded: true,
      fullAppOrAuthTested: false,
      productionPermissionsRestored: false,
    });
  });
  it('keeps a failed drill isolated, with no success report or automatic deletion', () => {
    const tools = fakeTools();
    const originalCall = tools.call.getMockImplementation()!;
    tools.call.mockImplementation((name, args, options) => {
      if (args.includes('--exit-on-error')) throw new Error('simulated restore failure');
      return originalCall(name, args, options);
    });
    const archiveFolder = fixtureArchive();
    expect(() => backupTool.restoreDrill(env, ['--confirm-local-drill'], tools, archiveFolder)).toThrow(
      'NOT deleted',
    );
    expect(fs.readdirSync(archiveFolder).some((name) => name.startsWith('restore-'))).toBe(false);
    expect(tools.call.mock.calls.some(([, , options]) => options?.input?.includes('DROP DATABASE'))).toBe(
      false,
    );
  });
});
