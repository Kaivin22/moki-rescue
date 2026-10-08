-- FILE TỰ SINH từ V10. Database đã chạy thủ công đến V9 mới dùng file này.
-- Không reset dữ liệu. Backup và dừng backend trước khi chạy. Cài mới bằng 01 thì bỏ qua.
-- Chỉ chạy MỘT LẦN: tắt sẵn sàng và rút các đề nghị chưa nhận khi đổi mô hình vị trí.
-- Không hủy ca đã nhận, không tự duyệt tài khoản. Sau đó chạy 02_verify_rls.sql.
BEGIN;
SELECT pg_advisory_xact_lock(225122, 274);
DO $guard$
BEGIN
  IF to_regclass('public.flyway_schema_history') IS NOT NULL THEN
    RAISE EXCEPTION 'DATABASE_MANAGED_BY_FLYWAY_USE_FLYWAY_MIGRATE';
  END IF;
  IF to_regprocedure('public.api_is_in_service_area(double precision,double precision)') IS NULL
    OR to_regprocedure('public.capture_assignment_position()') IS NULL THEN
    RAISE EXCEPTION 'V9_PREREQUISITES_MISSING_DO_NOT_RESET';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'provider_members' AND column_name = 'status' AND column_default LIKE '%pending%') THEN
    RAISE EXCEPTION 'V10_ALREADY_APPLIED_DO_NOT_RERUN';
  END IF;
END;
$guard$;
-- SOURCE: V10__shop_dispatch_and_provider_approval.sql
-- SHA256: b3c38223cc0055d24013672177ba29b663406ed33814cdb80cd5710d199af3e7
-- Keep approved members approved. Only newly enrolled members await a decision.
ALTER TABLE public.provider_members DROP CONSTRAINT provider_members_status_check;
ALTER TABLE public.provider_members ADD CONSTRAINT provider_members_status_check
  CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'left'));
ALTER TABLE public.provider_members ALTER COLUMN status SET DEFAULT 'pending';

-- Historical snapshots remain unchanged. New assignments use the registered shop,
-- never a provider's live GPS. NULL accuracy means a stored point, not a GPS fix.
CREATE OR REPLACE FUNCTION public.capture_assignment_position()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.assigned_provider_id IS NULL OR NEW.status IN ('completed', 'cancelled', 'needs_dispatch') THEN
    NEW.assigned_provider_latitude := NULL;
    NEW.assigned_provider_longitude := NULL;
    NEW.assigned_provider_accuracy_m := NULL;
    NEW.assigned_provider_position_at := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.assigned_provider_id IS DISTINCT FROM OLD.assigned_provider_id THEN
    SELECT team.base_latitude, team.base_longitude, NULL::DOUBLE PRECISION, NOW()
    INTO NEW.assigned_provider_latitude, NEW.assigned_provider_longitude,
         NEW.assigned_provider_accuracy_m, NEW.assigned_provider_position_at
    FROM public.provider_members pm JOIN public.rescue_teams team ON team.id = pm.team_id
    WHERE pm.user_id = NEW.assigned_provider_id AND team.id = NEW.assigned_team_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_assignment_position() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_assignment_service_area()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'assigned' AND (
    TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.assigned_provider_id IS DISTINCT FROM NEW.assigned_provider_id
  ) THEN
    IF NOT public.api_is_in_service_area(NEW.pickup_latitude, NEW.pickup_longitude)
      OR (NEW.destination_latitude IS NOT NULL AND NOT public.api_is_in_service_area(
        NEW.destination_latitude, NEW.destination_longitude))
      OR NOT EXISTS (
        SELECT 1 FROM public.provider_members pm
        JOIN public.rescue_teams team ON team.id = pm.team_id
        WHERE pm.user_id = NEW.assigned_provider_id
          AND public.api_is_in_service_area(team.base_latitude, team.base_longitude)
      ) THEN
      RAISE EXCEPTION 'OFFER_OUTSIDE_SERVICE_AREA' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_assignment_service_area() FROM PUBLIC, anon, authenticated;

-- A fresh shift is required to acknowledge departure from the shop after upgrade.
-- Do not cancel/reassign accepted jobs or fabricate their historic coordinates.
UPDATE public.provider_members
SET is_available = FALSE, available_since = NULL,
    last_latitude = NULL, last_longitude = NULL, location_accuracy_m = NULL;
-- Do not leave requests waiting forever on withdrawn pre-upgrade offers.
UPDATE public.rescue_requests rr SET status = 'no_provider', routing_status = 'pending'
WHERE rr.status = 'offered' AND EXISTS (
  SELECT 1 FROM public.dispatch_offers offer WHERE offer.request_id = rr.id AND offer.status = 'pending'
);
UPDATE public.dispatch_offers SET status = 'withdrawn'
WHERE status = 'pending';

COMMIT;
SELECT 'V10 applied; run 02_verify_rls.sql, then restart backend and app' AS result;
