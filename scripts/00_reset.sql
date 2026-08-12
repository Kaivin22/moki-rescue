-- DEV/STAGING ONLY — file này xóa toàn bộ dữ liệu ứng dụng.
-- Trước khi chạy, phải chủ động bật cờ trong CÙNG phiên SQL:
--   SET app.allow_destructive_reset = 'yes';
-- Production deployment tuyệt đối không được gọi file này.
BEGIN;

DO $$
BEGIN
  IF current_setting('app.allow_destructive_reset', TRUE) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Reset bị chặn. Chạy SET app.allow_destructive_reset = ''yes'' trước khi reset dev/staging.';
  END IF;
END;
$$;

DELETE FROM storage.objects WHERE bucket_id = 'place-images';
DELETE FROM storage.objects WHERE bucket_id = 'place-revisions';
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id IN ('place-images', 'place-revisions', 'avatars');
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public AUTHORIZATION postgres;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
COMMIT;
