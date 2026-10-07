-- Sửa DUY NHẤT số điện thoại E.164 bên dưới trước khi chạy.
-- Ví dụ số Việt Nam: +84901234567.
-- Tài khoản phải đăng nhập OTP thành công ít nhất một lần để profile được tạo.
-- Chỉ bootstrap admin đầu tiên. Cấp thêm admin qua giao diện quản trị.

BEGIN;

DO $$
DECLARE
  admin_phone CONSTANT TEXT := 'CHANGE_ME_E164_PHONE';
  matched_user_id UUID;
  matched_count INTEGER;
  previous_role TEXT;
BEGIN
  IF admin_phone = 'CHANGE_ME_E164_PHONE' OR admin_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'ADMIN_PHONE_NOT_CONFIGURED';
  END IF;

  -- Khóa các thay đổi profile trong transaction để hai lần bootstrap không
  -- đồng thời cấp hai admin đầu tiên. Không thay đổi tài khoản trong auth.users.
  LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

  SELECT COUNT(*)
  INTO matched_count
  FROM auth.users
  WHERE phone IN (admin_phone, substring(admin_phone FROM 2));

  IF matched_count <> 1 THEN
    RAISE EXCEPTION 'EXPECTED_ONE_AUTH_USER_FOR_PHONE, FOUND_%', matched_count;
  END IF;

  -- PostgreSQL không có MIN(uuid) mặc định. Chỉ lấy id sau khi kiểm tra duy nhất.
  SELECT id INTO STRICT matched_user_id
  FROM auth.users
  WHERE phone IN (admin_phone, substring(admin_phone FROM 2));

  SELECT role INTO previous_role FROM public.profiles WHERE id = matched_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND_FOR_AUTH_USER';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' AND id <> matched_user_id) THEN
    RAISE EXCEPTION 'ADMIN_ALREADY_BOOTSTRAPPED_USE_OPERATOR_UI';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = matched_user_id AND NOT is_active) THEN
    RAISE EXCEPTION 'ACCOUNT_INACTIVE_REVIEW_BEFORE_BOOTSTRAP';
  END IF;
  IF previous_role = 'provider' THEN
    RAISE EXCEPTION 'PROVIDER_ACCOUNT_REQUIRES_ROLE_REVIEW';
  END IF;

  UPDATE public.profiles
  SET role = 'admin', updated_at = NOW()
  WHERE id = matched_user_id AND role <> 'admin';

  RAISE NOTICE 'Bootstrapped one admin account: %', matched_user_id;
END;
$$;

COMMIT;
