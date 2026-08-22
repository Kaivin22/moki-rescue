-- Sửa DUY NHẤT số điện thoại E.164 bên dưới trước khi chạy.
-- Ví dụ số Việt Nam: +84901234567.
-- Tài khoản phải đăng nhập OTP thành công ít nhất một lần để profile được tạo.

DO $$
DECLARE
  operator_phone CONSTANT TEXT := 'CHANGE_ME_E164_PHONE';
  matched_user_id UUID;
  matched_count INTEGER;
BEGIN
  IF operator_phone = 'CHANGE_ME_E164_PHONE' OR operator_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'OPERATOR_PHONE_NOT_CONFIGURED';
  END IF;

  SELECT COUNT(*), MIN(id)
  INTO matched_count, matched_user_id
  FROM auth.users
  WHERE phone = operator_phone;

  IF matched_count <> 1 THEN
    RAISE EXCEPTION 'EXPECTED_ONE_AUTH_USER_FOR_PHONE, FOUND_%', matched_count;
  END IF;

  UPDATE public.profiles
  SET role = 'admin', is_active = TRUE, updated_at = NOW()
  WHERE id = matched_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND_FOR_AUTH_USER';
  END IF;

  RAISE NOTICE 'Bootstrapped one admin account: %', matched_user_id;
END;
$$;
