-- Chạy một lần trên production sau khi Flyway migrate và verify đã thành công.
-- Supabase Cron dùng timezone UTC; hai job dưới đây chạy ngoài giờ cao điểm Việt Nam.

-- pg_cron creates and manages its own `cron` schema; do not force pg_catalog.
CREATE EXTENSION IF NOT EXISTS pg_cron;

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
