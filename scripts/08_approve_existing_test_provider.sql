-- TÙY CHỌN, chỉ cho project local/staging đã có fixture rescue-auth-test-v1.
-- Chỉ duyệt provider.rescue@example.com trong đội TEST-AUTH-DN-01.
-- Không tạo Auth user, không đổi mật khẩu, không duyệt 12 cửa hàng DEMO-DN-*.
-- Chạy 07 (nếu nâng cấp từ V9), rồi 02 trước. Dừng backend khi chạy.
-- Sửa deployment_environment thành 'staging' trong bản chạy để xác nhận đúng project test.
BEGIN;
SELECT pg_advisory_xact_lock(225122, 274);
DO $approve_fixture$
DECLARE
  deployment_environment TEXT := 'CHANGE_ME';
  provider_uuid UUID;
  admin_uuid UUID;
  team_uuid UUID;
BEGIN
  IF deployment_environment NOT IN ('local', 'staging') THEN
    RAISE EXCEPTION 'TEST_ENVIRONMENT_CONFIRMATION_REQUIRED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'provider_members' AND column_name = 'status' AND column_default LIKE '%pending%') THEN
    RAISE EXCEPTION 'V10_REQUIRED_RUN_07_AND_02_FIRST';
  END IF;
  SELECT u.id INTO STRICT provider_uuid FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = 'provider.rescue@example.com'
    AND u.raw_app_meta_data->>'test_fixture' = 'rescue-auth-test-v1'
    AND p.role = 'provider' AND p.is_active AND u.email_confirmed_at IS NOT NULL;
  SELECT u.id INTO STRICT admin_uuid FROM auth.users u JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = 'admin.rescue@example.com'
    AND u.raw_app_meta_data->>'test_fixture' = 'rescue-auth-test-v1'
    AND p.role = 'admin' AND p.is_active;
  SELECT team.id INTO STRICT team_uuid FROM public.rescue_teams team
  JOIN public.provider_members pm ON pm.team_id = team.id AND pm.user_id = provider_uuid
  WHERE team.partner_reference = 'TEST-AUTH-DN-01'
    AND team.name = '[TEST] Đội kiểm thử đăng nhập Đà Nẵng'
    AND team.status IN ('pending', 'verified') AND pm.status IN ('pending', 'active')
    AND (team.verified_by IS NULL OR team.verified_by = admin_uuid)
    AND public.api_is_in_service_area(team.base_latitude, team.base_longitude)
  FOR UPDATE OF team, pm;
  IF EXISTS (SELECT 1 FROM public.rescue_requests WHERE assigned_provider_id = provider_uuid
      AND status NOT IN ('completed', 'cancelled'))
    OR EXISTS (SELECT 1 FROM public.dispatch_offers WHERE provider_id = provider_uuid
      AND status = 'pending' AND expires_at > NOW()) THEN
    RAISE EXCEPTION 'TEST_PROVIDER_HAS_OPEN_WORK_FINISH_FIRST';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_capabilities cap JOIN public.service_types s ON s.code = cap.service_code
      WHERE cap.team_id = team_uuid AND cap.is_active AND s.is_active) THEN
    RAISE EXCEPTION 'TEST_TEAM_CAPABILITIES_MISSING';
  END IF;
  -- Only the marked test fixture gets simulated checklist results. Not real verification.
  INSERT INTO public.team_verification_checks(team_id, requirement_code, completed, note, checked_by, checked_at)
  SELECT team_uuid, code, TRUE, '[TEST] Xác minh mô phỏng cho kiểm thử, không dùng vận hành thật.', admin_uuid, NOW()
  FROM public.team_verification_requirements WHERE is_active
  ON CONFLICT (team_id, requirement_code) DO UPDATE SET
    completed = TRUE, note = EXCLUDED.note, checked_by = EXCLUDED.checked_by, checked_at = EXCLUDED.checked_at;
  UPDATE public.provider_members SET status = 'active', is_available = FALSE, available_since = NULL
  WHERE user_id = provider_uuid AND team_id = team_uuid;
  UPDATE public.rescue_teams SET status = 'verified', verified_by = admin_uuid, verified_at = NOW()
  WHERE id = team_uuid;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (admin_uuid, 'provider.demo_approved', 'provider', provider_uuid::TEXT);
END;
$approve_fixture$;
COMMIT;
SELECT 'Existing marked demo provider approved; enable availability in the app when ready' AS result;
