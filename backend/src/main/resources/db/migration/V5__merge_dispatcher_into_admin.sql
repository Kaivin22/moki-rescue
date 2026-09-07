-- Hệ thống tự động điều phối ca; quản trị viên vận hành xử lý các trường hợp ngoại lệ.
-- Chuyển tài khoản điều phối viên cũ sang admin trước khi thu hẹp miền giá trị vai trò.
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE role = 'dispatcher';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'provider', 'admin'));

CREATE OR REPLACE FUNCTION public.is_dispatch_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.current_profile_role() = 'admin', FALSE)
$$;

COMMENT ON FUNCTION public.is_dispatch_staff() IS
  'Tên hàm được giữ để tương thích lược đồ; chỉ vai trò admin được xem là nhân sự vận hành.';
