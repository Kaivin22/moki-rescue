-- CHỈ DÙNG KHI CÀI MỚI/STAGING. Script này xóa toàn bộ schema public.
-- Chạy cùng một lượt với dòng sau trong Supabase SQL Editor:
--   SELECT set_config('app.confirm_motorescue_reset', 'RESET_MOTORESCUE', false);

DO $$
BEGIN
  IF COALESCE(current_setting('app.confirm_motorescue_reset', TRUE), '') <> 'RESET_MOTORESCUE' THEN
    RAISE EXCEPTION 'RESET_NOT_CONFIRMED';
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
