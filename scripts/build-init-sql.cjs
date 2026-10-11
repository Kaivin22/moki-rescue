// Bundle generation with an explicit B1 role-compatibility adaptation. Never connects to a database.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { verificationSql, preflightSql, generateVerification } = require('./database-checks.cjs');
const { setupPermissionsBlock } = require('./test-setup-permissions.cjs');

const root = path.resolve(__dirname, '..');
const migrationDirectory = path.join(root, 'backend/src/main/resources/db/migration');
const outputPath = path.join(__dirname, '01_init_database.sql');

function migrationSources(directory = migrationDirectory) {
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.sql'));
  if (files.some((file) => !/^[BV]\d+__[a-z0-9_]+\.sql$/.test(file))) {
    throw new Error('Unsupported migration name; review before generating the clean-install bundle.');
  }
  const sorted = files.sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  if (
    sorted[0] !== 'B1__initial_schema.sql' ||
    sorted.some((file, i) => {
      const expectedPrefix = i === 0 ? 'B1__' : `V${i + 1}__`;
      return !file.startsWith(expectedPrefix);
    })
  ) {
    throw new Error('Expected B1 followed by contiguous V2..Vn; refusing an ambiguous bundle.');
  }
  return sorted.map((name) => {
    const content = fs.readFileSync(path.join(directory, name), 'utf8').replace(/\r\n/g, '\n');
    if (/^\s*(BEGIN|START TRANSACTION|COMMIT|ROLLBACK)\s*;/im.test(content)) {
      throw new Error(`Unexpected transaction control in ${name}; review manually.`);
    }
    return { name, content, sha256: crypto.createHash('sha256').update(content).digest('hex') };
  });
}

function cleanInstallContent(name, content) {
  if (name !== 'B1__initial_schema.sql') return content;
  // Preserve applied Flyway checksums. Only the SQL Editor bundle adapts B1's
  // unconditional ALTER ROLE: Supabase's postgres is not a true superuser.
  const original = `  ELSE
    ALTER ROLE motorescue_api
      LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
`;
  if (content.split(original).length !== 2) {
    throw new Error('B1 runtime-role block changed; review the clean-install adaptation before generating.');
  }
  return content.replace(
    original,
    `  -- BEGIN INSTALL ADAPTATION: reuse a safe existing runtime role without ALTER ROLE.
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'motorescue_api'
      AND rolcanlogin AND NOT rolinherit AND NOT rolsuper
      AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND rolbypassrls
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_ROLE_UNSAFE'
      USING HINT = 'Review existing role attributes with an authorized administrator; do not drop the role or disable security checks.';
  -- END INSTALL ADAPTATION
`,
  );
}

function sourceBlocks(sources, cleanInstall = false) {
  return sources
    .map(({ name, content, sha256 }) => {
      const bundled = cleanInstall ? cleanInstallContent(name, content) : content;
      const digest = crypto.createHash('sha256').update(bundled).digest('hex');
      const originalDigest = bundled === content ? '' : `-- ORIGINAL SHA256: ${sha256}\n`;
      return `-- BEGIN SOURCE: ${name}\n${originalDigest}-- SHA256: ${digest}\n${bundled}${bundled.endsWith('\n') ? '' : '\n'}-- END SOURCE: ${name}\n`;
    })
    .join('\n');
}

function verificationBlock() {
  return `-- BEGIN SCHEMA VERIFICATION\n${verificationSql}\n-- END SCHEMA VERIFICATION\n`;
}

function generate(sources = migrationSources()) {
  return `-- FILE TỰ SINH: node scripts/build-init-sql.cjs; không sửa riêng.
-- CÀI MỚI + KIỂM TRA schema/quyền/RLS đến V${sources.length} trong CÙNG transaction.
-- Dán TOÀN BỘ file vào Supabase SQL Editor và Run MỘT LẦN trên public trống.
-- Kiểm tra thất bại thì transaction không commit; không bỏ qua guard để ép chạy.
-- Không cần chạy migration backend hoặc file verify riêng.
-- Đã gồm mọi sửa lỗi đến V${sources.length} và quyền tạo tài khoản test; không chạy SQL vá lẻ.
-- Không seed demo/reset/Auth settings/mật khẩu; tùy chọn 02_seed_demo_teams.sql sau đó.
-- Database đang có dữ liệu: KHÔNG chạy lại init; đọc scripts/README.md.
-- SHA256 tính trên SQL được nhúng, UTF-8 chuẩn hóa CRLF thành LF.
-- B1 chỉ điều chỉnh nhánh role đã tồn tại: kiểm tra/dùng lại, không ALTER ROLE.
-- ORIGINAL SHA256 ở B1 là checksum migration gốc, không sửa lịch sử Flyway.

BEGIN;
SELECT pg_advisory_xact_lock(225122, 274);

DO $init_guard$
BEGIN
  IF to_regclass('auth.users') IS NULL OR to_regclass('realtime.messages') IS NULL
    OR to_regnamespace('extensions') IS NULL THEN
    RAISE EXCEPTION 'SUPABASE_PREREQUISITES_MISSING';
  END IF;
  IF to_regclass('public.flyway_schema_history') IS NOT NULL THEN
    RAISE EXCEPTION 'DATABASE_ALREADY_MANAGED_BY_FLYWAY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  ) THEN
    RAISE EXCEPTION 'PUBLIC_NOT_EMPTY_DO_NOT_RUN_CLEAN_INSTALL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND NOT EXISTS (
      SELECT 1 FROM pg_depend d
      WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
    )
  ) THEN
    RAISE EXCEPTION 'PUBLIC_HAS_CUSTOM_FUNCTIONS_REVIEW_BEFORE_INSTALL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname IN ('postgis', 'pgcrypto') AND n.nspname <> 'extensions'
  ) THEN
    RAISE EXCEPTION 'EXTENSION_SCHEMA_MISMATCH_REVIEW_BEFORE_INSTALL';
  END IF;
END;
$init_guard$;

${sourceBlocks(sources, true)}
${setupPermissionsBlock()}
${verificationBlock()}
COMMIT;

SELECT 'Database initialized through V${sources.length}; schema/security checks passed. Optional: 02_seed_demo_teams.sql' AS result;
`;
}

function writeDiagnostic(name, sql) {
  // Fixed filenames only, inside the ignored workspace directory; no arbitrary output target.
  const directory = path.join(root, '.tmp');
  fs.mkdirSync(directory, { recursive: true });
  const target = path.join(directory, name);
  fs.writeFileSync(target, sql, 'utf8');
  console.log(`Generated ${target}. No SQL executed.`);
}

module.exports = {
  generate,
  cleanInstallContent,
  migrationSources,
  outputPath,
  verificationBlock,
  generateVerification,
  preflightSql,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0];
  if (args.length > 1 || (mode && !['--check', '--verify', '--preflight'].includes(mode))) {
    throw new Error(
      'Usage: node scripts/build-init-sql.cjs [--check|--verify|--preflight]. All clean-install fixes belong in 01_init_database.sql; standalone patch generation is not supported.',
    );
  }
  if (mode === '--verify') writeDiagnostic('verify-database.sql', generateVerification());
  else if (mode === '--preflight') writeDiagnostic('preflight-database.sql', preflightSql);
  else if (mode === '--check') {
    const actual = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n')
      : '';
    if (actual !== generate()) {
      console.error('Init SQL missing/outdated. Run: node scripts/build-init-sql.cjs');
      process.exitCode = 1;
    } else console.log('Init SQL matches migration sources and security checks (no database connection).');
  } else {
    fs.writeFileSync(outputPath, generate(), 'utf8');
    console.log(`Generated ${outputPath}. No SQL executed.`);
  }
}
