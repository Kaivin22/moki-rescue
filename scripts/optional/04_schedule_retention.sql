-- TÙY CHỌN, KHÔNG CẦN CHO DEMO: chỉ chạy khi đã đồng ý tự động xóa/làm mờ dữ liệu theo retention.
-- Chạy sau migrate và verify; chạy lại bằng CÙNG tài khoản quản trị để thay lịch.
-- Bốn job: checkpoint mỗi giờ; ba job hàng ngày lúc 02:35/02:45/02:55 giờ VN
-- khi cron.timezone là GMT/UTC. Không thay đổi timezone chung của project.

BEGIN;

DO $$
DECLARE
  signature TEXT;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.purge_expired_location_checkpoints(interval)',
    'public.minimize_closed_request_data(interval)',
    'public.purge_assistant_usage_events(interval)',
    'public.purge_push_delivery_receipts(interval)'
  ] LOOP
    IF to_regprocedure(signature) IS NULL THEN
      RAISE EXCEPTION 'RETENTION_FUNCTION_MISSING: %', signature;
    END IF;
  END LOOP;
END;
$$;

-- pg_cron creates and manages its own `cron` schema; do not force pg_catalog.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF COALESCE(current_setting('cron.timezone', TRUE), 'GMT') NOT IN ('GMT', 'UTC', 'Etc/UTC') THEN
    RAISE EXCEPTION 'REVIEW_CRON_TIMEZONE_BEFORE_SCHEDULING';
  END IF;
  IF EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname IN ('motorescue-purge-location-checkpoints', 'motorescue-minimize-closed-requests',
                     'motorescue-purge-assistant-usage', 'motorescue-purge-push-receipts')
      AND username <> current_user
  ) THEN
    RAISE EXCEPTION 'RETENTION_JOB_OWNED_BY_ANOTHER_ROLE';
  END IF;
END;
$$;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN (
  'motorescue-purge-location-checkpoints',
  'motorescue-minimize-closed-requests',
  'motorescue-purge-assistant-usage',
  'motorescue-purge-push-receipts'
);

SELECT cron.schedule(
  'motorescue-purge-location-checkpoints',
  '15 * * * *',
  $$SELECT public.purge_expired_location_checkpoints(INTERVAL '24 hours');$$
);

SELECT cron.schedule(
  'motorescue-minimize-closed-requests',
  '35 19 * * *',
  $$SELECT public.minimize_closed_request_data(INTERVAL '30 days');$$
);

SELECT cron.schedule(
  'motorescue-purge-assistant-usage',
  '45 19 * * *',
  $$SELECT public.purge_assistant_usage_events(INTERVAL '2 days');$$
);

SELECT cron.schedule(
  'motorescue-purge-push-receipts',
  '55 19 * * *',
  $$SELECT public.purge_push_delivery_receipts(INTERVAL '2 days');$$
);

COMMIT;

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'motorescue-purge-location-checkpoints', 'motorescue-minimize-closed-requests',
  'motorescue-purge-assistant-usage', 'motorescue-purge-push-receipts'
)
ORDER BY jobname;
