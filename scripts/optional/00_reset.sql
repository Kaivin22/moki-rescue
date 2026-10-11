-- CHỈ DÙNG CHO LOCAL/STAGING ĐƯỢC PHÉP MẤT DỮ LIỆU.
-- Script này xóa schema public; sau đó chạy scripts/01_init_database.sql theo scripts/README.md.
-- KHÔNG thuộc thứ tự cài đặt thông thường. Backup trước, dừng backend và đăng ký
-- tài khoản trong lúc reset. auth.users được giữ lại nhưng toàn bộ dữ liệu app mất.
-- Chỉ dùng database riêng của dự án; CASCADE có thể ảnh hưởng đối tượng phụ thuộc.
-- Sửa hai hằng bên dưới ngay trong bản chạy; không dựa vào cờ session còn sót.

BEGIN;
SELECT pg_advisory_xact_lock(225122, 274);

DO $$
DECLARE
  confirm_reset CONSTANT TEXT := 'CHANGE_ME';
  deployment_environment CONSTANT TEXT := 'CHANGE_ME';
BEGIN
  IF confirm_reset <> 'RESET_MOTORESCUE' OR deployment_environment NOT IN ('local', 'staging') THEN
    RAISE EXCEPTION 'RESET_NOT_CONFIRMED';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'RESET_REFUSED_EXTENSION_IN_PUBLIC';
  END IF;
END;
$$;

-- Cron lưu command dưới dạng text nên không tự mất khi drop schema public.
DO $$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE $sql$
      SELECT cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname IN (
        'motorescue-purge-location-checkpoints',
        'motorescue-minimize-closed-requests',
        'motorescue-purge-assistant-usage',
        'motorescue-purge-push-receipts'
      )
    $sql$;
  END IF;
END;
$$;

-- Xóa policy ngoài schema public trước khi tạo lại hàm authorization.
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS motorescue_realtime_read ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS motorescue_realtime_write ON realtime.messages';
  END IF;
END;
$$;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

COMMENT ON SCHEMA public IS
  'Moki Rescue - nền tảng điều phối cứu hộ xe máy cho mạng lưới đối tác được xác minh.';

COMMIT;
