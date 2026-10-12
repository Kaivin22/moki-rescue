/* Native PostgreSQL utilities only. No installation, containers, migrations or automatic failover. */
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Buffer } = require('node:buffer');
const { spawnSync } = require('node:child_process');

const PROJECT = path.resolve(__dirname, '..');
const ARCHIVE = 'database.dump';
const SCHEMAS = ['public', 'auth'];
const NAME = /^[a-z_][a-z0-9_]{0,62}$/;
const DRILL_NAME = /^motorescue_drill_[0-9a-f]{16}$/;

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Missing ${name}. See docs/DISASTER-RECOVERY.md.`);
  return value;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

function outsideProjectDirectory(directory, project = PROJECT) {
  if (!path.isAbsolute(directory)) throw new Error('BACKUP_ROOT must be an absolute, existing directory.');
  const resolved = fs.realpathSync(directory);
  if (!fs.statSync(resolved).isDirectory() || isInside(fs.realpathSync(project), resolved)) {
    throw new Error(
      'Keep backups outside the project; do not use .tmp, Git or the workspace as backup storage.',
    );
  }
  return resolved;
}

function connection(env, prefix) {
  const host = required(env, `${prefix}_HOST`);
  const port = required(env, `${prefix}_PORT`);
  const database = required(env, `${prefix}_DATABASE`);
  const user = required(env, `${prefix}_USER`);
  const passfile = required(env, `${prefix}_PASSFILE`);
  if (!/^[a-zA-Z0-9.:-]+$/.test(host) || !/^\d{1,5}$/.test(port) || +port < 1 || +port > 65535) {
    throw new Error('Invalid PostgreSQL host/port; URLs and connection strings are not accepted here.');
  }
  if (!NAME.test(database) || !/^[a-zA-Z0-9_.-]+$/.test(user))
    throw new Error('Invalid database/user identifier.');
  if (!path.isAbsolute(passfile) || !fs.statSync(passfile).isFile())
    throw new Error('PASSFILE must be an existing absolute path.');
  if (isInside(fs.realpathSync(PROJECT), fs.realpathSync(passfile)))
    throw new Error('Keep the password file outside the repository.');
  const local = ['127.0.0.1', '::1'].includes(host);
  const sslmode = env[`${prefix}_SSLMODE`] || (local ? 'disable' : 'verify-full');
  if (
    !(
      local ? ['disable', 'require', 'verify-ca', 'verify-full'] : ['require', 'verify-ca', 'verify-full']
    ).includes(sslmode)
  ) {
    throw new Error('Remote backup connections require TLS.');
  }
  if (prefix === 'RESTORE_PG' && (!local || database !== 'postgres' || !env.RESTORE_PG_ISOLATED)) {
    throw new Error(
      'Restore drills require literal loopback, the postgres maintenance database and isolation confirmation.',
    );
  }
  if (prefix === 'RESTORE_PG' && env.RESTORE_PG_ISOLATED !== 'true')
    throw new Error('RESTORE_PG_ISOLATED must be true.');
  const sslrootcert = env[`${prefix}_SSLROOTCERT`];
  if (sslrootcert && (!path.isAbsolute(sslrootcert) || !fs.statSync(sslrootcert).isFile())) {
    throw new Error('SSLROOTCERT must be an existing absolute certificate path.');
  }
  return { host, port, database, user, passfile, sslmode, sslrootcert };
}

function childEnvironment(config, readOnly, env = process.env) {
  // Do not inherit PGHOSTADDR, PGSERVICE, PGPASSWORD etc. that could redirect a restore.
  const child = Object.fromEntries(Object.entries(env).filter(([name]) => !/^PG/i.test(name)));
  return {
    ...child,
    PGHOST: config.host,
    PGPORT: config.port,
    PGDATABASE: config.database,
    PGUSER: config.user,
    PGPASSFILE: config.passfile,
    PGSSLMODE: config.sslmode,
    ...(config.sslrootcert ? { PGSSLROOTCERT: config.sslrootcert } : {}),
    PGCONNECT_TIMEOUT: '10',
    PGAPPNAME: readOnly ? 'motorescue-backup-readonly' : 'motorescue-local-restore-drill',
    PGOPTIONS: readOnly ? '-c default_transaction_read_only=on' : '',
  };
}

function nativeTools(bin, run = spawnSync) {
  const executable = (name) =>
    bin ? path.join(bin, `${name}${process.platform === 'win32' ? '.exe' : ''}`) : name;
  const call = (name, args, options = {}) => {
    const result = run(executable(name), args, {
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
      timeout: 30 * 60_000,
      maxBuffer: 32 * 1024 * 1024,
      ...options,
    });
    if (result.error || result.status !== 0) {
      // Tool stderr may include passwords, connection strings or COPY row data.
      // Never print it, even during restore failures.
      throw new Error(
        `${name} failed (${result.error?.code || result.status}). Check tool version, permissions, connection and archive compatibility; private output was withheld.`,
      );
    }
    return result.stdout || '';
  };
  const versions = Object.fromEntries(
    ['pg_dump', 'pg_restore', 'psql'].map((tool) => {
      const match = call(tool, ['--version'], { timeout: 10_000 }).match(/PostgreSQL\)?\s+(\d+)\./);
      if (!match) throw new Error(`Unrecognized ${tool} version.`);
      return [tool, Number(match[1])];
    }),
  );
  if (new Set(Object.values(versions)).size !== 1 || versions.pg_dump < 15) {
    throw new Error('Use matching PostgreSQL 15+ versions of pg_dump, pg_restore and psql.');
  }
  return { call, major: versions.pg_dump };
}

function query(tools, config, sql, readOnly = true) {
  return tools
    .call('psql', ['-X', '--no-password', '--no-align', '--tuples-only', '--set=ON_ERROR_STOP=1'], {
      env: childEnvironment(config, readOnly),
      input: sql,
      timeout: 60_000,
    })
    .trim();
}

function ident(value) {
  if (typeof value !== 'string' || !NAME.test(value))
    throw new Error('Unsupported SQL identifier in backup metadata.');
  return `"${value}"`;
}

function tableDataEntries(list) {
  const tables = [...list.matchAll(/^\d+; \d+ \d+ TABLE DATA (public|auth) ([a-z_][a-z0-9_]*) /gm)].map(
    (match) => [match[1], match[2]],
  );
  const entries = list.split(/\r?\n/).filter((line) => /^\d+; \d+ \d+ TABLE DATA /.test(line));
  if (
    entries.length !== tables.length ||
    new Set(tables.map((parts) => parts.join('.'))).size !== tables.length
  ) {
    throw new Error('Unsupported/duplicate table names or schemas in archive; review the backup scope.');
  }
  for (const required of ['public.profiles', 'public.rescue_requests', 'public.rescue_teams', 'auth.users']) {
    if (!tables.some((parts) => parts.join('.') === required))
      throw new Error(`Archive is missing ${required}.`);
  }
  return tables;
}

function archiveDigest(file) {
  // Stream via small synchronous chunks, never load the customer/auth backup into memory as text.
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    let length;
    while ((length = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0)
      hash.update(buffer.subarray(0, length));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function inspectBackup(folder, tools) {
  const resolved = fs.realpathSync(folder);
  const manifest = JSON.parse(fs.readFileSync(path.join(resolved, 'manifest.json'), 'utf8'));
  if (
    manifest.format !== 1 ||
    manifest.archive !== ARCHIVE ||
    JSON.stringify(manifest.schemas) !== JSON.stringify(SCHEMAS)
  ) {
    throw new Error('Unsupported backup manifest.');
  }
  const archive = fs.realpathSync(path.join(resolved, ARCHIVE));
  if (
    !isInside(resolved, archive) ||
    fs.statSync(archive).size !== manifest.bytes ||
    archiveDigest(archive) !== manifest.sha256
  ) {
    throw new Error('Backup checksum/size mismatch or archive escapes its directory.');
  }
  const tables = tableDataEntries(tools.call('pg_restore', ['--list', archive]));
  return { manifest, archive, tables };
}

const METADATA_SQL = `SELECT json_build_object(
  'serverMajor', current_setting('server_version_num')::integer / 10000,
  'hoursSchemaPresent', to_regclass('public.team_working_hours') IS NOT NULL,
  'extensions', (SELECT json_agg(json_build_object('name', e.extname, 'schema', n.nspname, 'version', e.extversion))
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname IN ('postgis', 'pgcrypto', 'uuid-ossp')),
  'policyRoles', COALESCE((SELECT json_agg(DISTINCT r.rolname) FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_roles r ON r.oid = ANY(p.polroles) WHERE n.nspname IN ('public', 'auth')), '[]'::json)
);`;

function backup(env, args, tools) {
  if (!args.includes('--confirm-source')) throw new Error('Review the source and add --confirm-source.');
  const source = connection(env, 'BACKUP_PG');
  const root = outsideProjectDirectory(required(env, 'BACKUP_ROOT'));
  const metadata = JSON.parse(query(tools, source, METADATA_SQL));
  if (tools.major < metadata.serverMajor) throw new Error('pg_dump is older than the source server.');
  const folder = path.join(
    root,
    `motorescue-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(4).toString('hex')}`,
  );
  fs.mkdirSync(folder, { mode: 0o700 });
  const partial = path.join(folder, `${ARCHIVE}.partial`);
  const started = Date.now();
  try {
    tools.call(
      'pg_dump',
      [
        '--format=custom',
        '--no-password',
        '--strict-names',
        ...SCHEMAS.map((schema) => `--schema=${schema}`),
        '--no-publications',
        '--no-subscriptions',
        '--lock-wait-timeout=5s',
        `--file=${partial}`,
      ],
      { env: childEnvironment(source, true) },
    );
    tableDataEntries(tools.call('pg_restore', ['--list', partial]));
    const bytes = fs.statSync(partial).size;
    const sha256 = archiveDigest(partial);
    fs.renameSync(partial, path.join(folder, ARCHIVE));
    fs.chmodSync(path.join(folder, ARCHIVE), 0o600);
    fs.writeFileSync(
      path.join(folder, 'manifest.json'),
      JSON.stringify(
        {
          format: 1,
          archive: ARCHIVE,
          schemas: SCHEMAS,
          createdAt: new Date().toISOString(),
          dumpMajor: tools.major,
          bytes,
          sha256,
          backupSeconds: (Date.now() - started) / 1000,
          ...metadata,
          restoreTested: false,
          excluded: [
            'Storage files',
            'platform-managed schemas other than auth',
            'cluster role definitions/passwords',
            'Auth/API services and signing keys',
            'OSRM dataset',
            'external service configuration',
          ],
        },
        null,
        2,
      ),
      { flag: 'wx', mode: 0o600 },
    );
    console.log(
      `BACKUP_CREATED ${folder}\n${bytes} bytes; SHA256 ${sha256}\nArchive inspected, NOT yet restore-tested. Protect/copy it off-device; it contains authentication and personal data.`,
    );
  } catch (failure) {
    throw new Error(
      `Backup incomplete at ${folder}; do not use it as a completed backup. ${failure.message}`,
    );
  }
}

function assertIsolatedCluster(state) {
  if (
    state.hasAuth !== false ||
    state.publicTables !== 0 ||
    state.database !== 'postgres' ||
    state.superuser !== true ||
    !Array.isArray(state.databases) ||
    state.databases.some((name) => !DRILL_NAME.test(name))
  ) {
    throw new Error(
      'Refusing a cluster containing application/Supabase databases or without isolated local admin rights.',
    );
  }
}

function rowCountsSql(tables) {
  // json_build_object has an argument limit; public + auth can exceed 50 tables.
  return `SELECT json_object_agg(name, total) FROM (VALUES ${tables
    .map(
      ([schema, table]) => `('${schema}.${table}', (SELECT count(*) FROM ${ident(schema)}.${ident(table)}))`,
    )
    .join(',')}) AS counts(name, total);`;
}

function restoreDrill(env, args, tools, folder) {
  if (!args.includes('--confirm-local-drill'))
    throw new Error('Only restore trusted archives; add --confirm-local-drill.');
  const target = connection(env, 'RESTORE_PG');
  const { manifest, archive, tables } = inspectBackup(folder, tools);
  const state = JSON.parse(
    query(
      tools,
      target,
      `SELECT json_build_object(
    'database', current_database(), 'serverMajor', current_setting('server_version_num')::integer / 10000,
    'hasAuth', to_regnamespace('auth') IS NOT NULL OR to_regnamespace('realtime') IS NOT NULL,
    'publicTables', (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p')),
    'superuser', (SELECT rolsuper FROM pg_roles WHERE rolname=current_user),
    'databases', (SELECT COALESCE(json_agg(datname),'[]'::json) FROM pg_database
      WHERE NOT datistemplate AND datname <> 'postgres'));`,
    ),
  );
  assertIsolatedCluster(state);
  if (
    !Number.isInteger(manifest.dumpMajor) ||
    state.serverMajor < manifest.dumpMajor ||
    tools.major < manifest.dumpMajor
  ) {
    throw new Error('Restore server/tools must be at least as new as the pg_dump archive producer.');
  }
  if (!Array.isArray(manifest.policyRoles)) throw new Error('Missing policy role inventory in manifest.');
  const roles = [
    ...new Set(['anon', 'authenticated', 'service_role', 'motorescue_api', ...manifest.policyRoles]),
  ];
  roles.forEach(ident);
  const extensions = manifest.extensions;
  if (
    !Array.isArray(extensions) ||
    !extensions.some((item) => item.name === 'postgis') ||
    extensions.some(
      (item) => !['postgis', 'pgcrypto', 'uuid-ossp'].includes(item.name) || item.schema !== 'extensions',
    )
  ) {
    throw new Error(
      'Unsupported extension layout; prepare a reviewed restore plan instead of bypassing this check.',
    );
  }
  const schemaSql = tools.call('pg_restore', [
    '--schema-only',
    '--no-owner',
    '--no-privileges',
    '--file=-',
    archive,
  ]);
  const database = `motorescue_drill_${crypto.randomBytes(8).toString('hex')}`;
  const started = Date.now();
  query(tools, target, `CREATE DATABASE ${ident(database)} TEMPLATE template0 ENCODING 'UTF8';`, false);
  console.log(`Created isolated restore database ${database}. It is NOT connected to the app.`);
  const local = { ...target, database };
  try {
    // Never reuse/reset an existing database. This database was created successfully above.
    const bootstrap = [
      /^CREATE SCHEMA "?public"?;/m.test(schemaSql) ? 'DROP SCHEMA public;' : '',
      'CREATE SCHEMA extensions;',
      ...extensions.map((item) => `CREATE EXTENSION "${item.name}" WITH SCHEMA extensions;`),
      ...roles.map(
        (role) =>
          `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${ident(role)} NOLOGIN; END IF; END $$;`,
      ),
    ].join('\n');
    query(tools, local, bootstrap, false);
    tools.call(
      'pg_restore',
      [
        '--no-password',
        '--exit-on-error',
        '--single-transaction',
        '--no-owner',
        '--no-privileges',
        '--no-publications',
        '--no-subscriptions',
        `--dbname=${database}`,
        archive,
      ],
      { env: childEnvironment(local, false) },
    );
    const counts = JSON.parse(query(tools, local, rowCountsSql(tables)));
    const report = {
      database,
      checkedAt: new Date().toISOString(),
      archiveSha256: manifest.sha256,
      restoreSeconds: (Date.now() - started) / 1000,
      rowCounts: counts,
      databaseRestoreSucceeded: true,
      fullAppOrAuthTested: false,
      productionPermissionsRestored: false,
    };
    const reportPath = path.join(fs.realpathSync(folder), `restore-${database}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(
      `RESTORE_DRILL_PASSED ${reportPath}\nDatabase/schema/data restored; Auth, app, production grants and failover are NOT tested. No database was deleted.`,
    );
  } catch (failure) {
    throw new Error(
      `Restore drill failed; keep ${database} isolated for inspection. It was NOT deleted. ${failure.message}`,
    );
  }
}

function main(env = process.env, args = process.argv.slice(2)) {
  const [command, ...options] = args;
  if (!['check', 'backup', 'verify', 'restore-check'].includes(command)) {
    throw new Error(
      'Usage: database-backup.cjs check | backup --confirm-source | verify <folder> | restore-check <folder> --confirm-local-drill',
    );
  }
  const tools = nativeTools(env.BACKUP_PG_BIN);
  if (command === 'check') {
    console.log(
      `PostgreSQL client tools found (major ${tools.major}). No database connection or backup was made.`,
    );
  } else if (command === 'backup') backup(env, options, tools);
  else {
    const folder = options.find((arg) => !arg.startsWith('--'));
    if (!folder) throw new Error('An existing backup folder is required.');
    if (command === 'verify') {
      inspectBackup(folder, tools);
      console.log(
        'ARCHIVE_CHECK_PASSED: checksum and table inventory only; this does NOT prove restore success.',
      );
    } else restoreDrill(env, options, tools, folder);
  }
}

module.exports = {
  connection,
  childEnvironment,
  nativeTools,
  outsideProjectDirectory,
  tableDataEntries,
  archiveDigest,
  inspectBackup,
  assertIsolatedCluster,
  ident,
  rowCountsSql,
  backup,
  restoreDrill,
  main,
};
if (require.main === module) {
  try {
    main();
  } catch (failure) {
    console.error(failure.message);
    process.exitCode = 1;
  }
}
