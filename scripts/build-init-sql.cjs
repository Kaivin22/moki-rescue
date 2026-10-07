// Mechanical bundle generation only. Never connects to a database.
/* global __dirname, Buffer */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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

function generate(sources = migrationSources()) {
  const version = sources.length;
  const header = `-- FILE TỰ SINH: chạy node scripts/build-init-sql.cjs để tạo lại, không chỉnh riêng.
-- KHỞI TẠO SUPABASE MỚI từ B1 đến V${version}; không dùng nâng cấp hoặc chạy lại.
-- Chạy 01_preflight.sql trước. Dán TOÀN BỘ file này vào SQL Editor và Run một lần.
-- Không cần mở/chạy từng file trong backend. Không tạo flyway_schema_history.
-- Không seed đội mẫu, không đổi cấu hình xác nhận email, không đặt mật khẩu runtime.
-- Lỗi: dừng, ROLLBACK; nếu cần rồi điều tra; không reset hay bỏ kiểm tra để ép chạy.
-- SHA-256 bên dưới tính trên nguồn UTF-8 đã chuẩn hóa CRLF thành LF.

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

`;
  return (
    header +
    sources
      .map(
        ({ name, content, sha256 }) =>
          `-- BEGIN SOURCE: ${name}\n-- SHA256: ${sha256}\n${content}${content.endsWith('\n') ? '' : '\n'}-- END SOURCE: ${name}\n`,
      )
      .join('\n') +
    `\nCOMMIT;\n\nSELECT 'Database initialized through V${version}; run 02_verify_rls.sql next' AS result;\n`
  );
}

const upgradePath = path.join(__dirname, '06_upgrade_demo_service_coverage.sql');
function generateCoverageUpgrade(sources = migrationSources()) {
  const migration = sources.find((source) => source.name === 'V9__align_demo_service_coverage.sql');
  if (!migration) throw new Error('Missing V9 coverage migration.');
  return `-- FILE TỰ SINH từ V9; không sửa riêng, không dùng để reset database.
-- Chỉ dành cho database đã chạy thủ công đến V8; cài mới bằng 01 đã gồm V9 thì bỏ qua.
-- Dừng backend khi nâng cấp, backup trước; chạy 02_verify_rls.sql sau file này.
BEGIN;
SELECT pg_advisory_xact_lock(225122, 274);
DO $guard$
BEGIN
  IF to_regclass('public.flyway_schema_history') IS NOT NULL THEN
    RAISE EXCEPTION 'DATABASE_MANAGED_BY_FLYWAY_USE_FLYWAY_MIGRATE';
  END IF;
  IF to_regclass('public.service_zones') IS NULL
    OR to_regclass('public.provider_dispatch_stats') IS NULL
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'rescue_requests'
        AND column_name = 'assigned_provider_position_at') THEN
    RAISE EXCEPTION 'V8_PREREQUISITES_MISSING_DO_NOT_RESET';
  END IF;
END;
$guard$;
-- SOURCE: ${migration.name}
-- SHA256: ${migration.sha256}
${migration.content}
COMMIT;
SELECT 'V9 coverage applied; run 02_verify_rls.sql, then restart backend' AS result;
`;
}

module.exports = { generate, migrationSources, outputPath, generateCoverageUpgrade, upgradePath };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.length > 1) {
    throw new Error('Usage: node scripts/build-init-sql.cjs [--check]');
  }
  const expected = generate();
  const upgrade = generateCoverageUpgrade();
  if (args.includes('--check')) {
    const actual = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n')
      : '';
    const actualUpgrade = fs.existsSync(upgradePath)
      ? fs.readFileSync(upgradePath, 'utf8').replace(/\r\n/g, '\n')
      : '';
    if (actual !== expected || actualUpgrade !== upgrade) {
      console.error('Init SQL missing/outdated. Run: node scripts/build-init-sql.cjs');
      process.exitCode = 1;
    } else {
      console.log('Init SQL matches all migration sources (no database connection).');
    }
  } else {
    fs.writeFileSync(outputPath, expected, 'utf8');
    fs.writeFileSync(upgradePath, upgrade, 'utf8');
    console.log(`Generated ${outputPath}; ${Buffer.byteLength(expected, 'utf8')} bytes. No SQL executed.`);
  }
}
