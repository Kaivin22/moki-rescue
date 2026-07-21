-- ============================================================
-- profiles_trigger.sql
-- Trigger tự động tạo profile khi user đăng ký / OAuth login
-- Chạy script này một lần trong Supabase SQL Editor
-- ============================================================

-- Function: tự động INSERT vào public.profiles khi có user mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                    -- chạy với quyền owner (không bị chặn RLS)
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_url,
    role,
    vip_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    -- Lấy tên từ metadata Google OAuth; fallback về phần đầu email
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    -- Lấy avatar từ metadata Google OAuth; có thể NULL
    NEW.raw_user_meta_data ->> 'avatar_url',
    'user',         -- role mặc định
    'free',         -- vip mặc định
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;     -- nếu profile đã tồn tại thì bỏ qua

  RETURN NEW;
END;
$$;

-- Trigger: kích hoạt sau mỗi lần INSERT vào auth.users
-- (xảy ra khi đăng ký email/password hoặc đăng nhập Google OAuth lần đầu)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS Policies cho bảng profiles
-- ============================================================

-- Bật Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: user chỉ đọc được profile của chính mình
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: user chỉ cập nhật được profile của chính mình
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: admin có thể đọc tất cả profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Policy: service role bypass RLS (dùng cho server-side operations)
DROP POLICY IF EXISTS "Service role bypass" ON public.profiles;
CREATE POLICY "Service role bypass"
  ON public.profiles
  USING (auth.role() = 'service_role');

-- ============================================================
-- RLS Policies cho bảng places (read-only cho anonymous)
-- ============================================================
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active places" ON public.places;
CREATE POLICY "Anyone can view active places"
  ON public.places
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Editor and admin can manage places" ON public.places;
CREATE POLICY "Editor and admin can manage places"
  ON public.places
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('editor', 'admin')
    )
  );
