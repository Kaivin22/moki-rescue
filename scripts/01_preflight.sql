-- CHẠY ĐẦU TIÊN trong Supabase SQL Editor (chỉ đọc, KHÔNG tạo schema).
-- Mục đích: xác định trạng thái trước khi chọn luồng cài mới/nâng cấp.
BEGIN TRANSACTION READ ONLY;

SELECT current_database() AS database_name, current_user AS executing_role,
       current_setting('server_version') AS postgres_version,
       to_regclass('auth.users') IS NOT NULL AS has_supabase_auth,
       to_regclass('realtime.messages') IS NOT NULL AS has_supabase_realtime,
       to_regclass('public.profiles') IS NOT NULL AS has_app_profiles,
       to_regclass('public.flyway_schema_history') IS NOT NULL AS has_flyway_history;

SELECT e.extname, n.nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('postgis', 'pgcrypto', 'pg_cron');

SELECT c.relname AS public_table, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

DO $$
DECLARE
  migration RECORD;
BEGIN
  IF to_regclass('public.flyway_schema_history') IS NOT NULL THEN
    FOR migration IN EXECUTE
      'SELECT installed_rank, version, description, type, success FROM public.flyway_schema_history ORDER BY installed_rank'
    LOOP
      RAISE NOTICE 'Migration rank=% version=% type=% success=% description=%',
        migration.installed_rank, migration.version, migration.type, migration.success, migration.description;
    END LOOP;
  ELSE
    RAISE NOTICE 'No Flyway history. This does NOT prove the database is empty; inspect public_table results.';
  END IF;
END;
$$;

COMMIT;
