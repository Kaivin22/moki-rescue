-- ================================================================
-- DANANG ITINERARY — SUPABASE SCHEMA HOÀN CHỈNH (React Native v2)
-- Chạy toàn bộ file này 1 lần trong SQL Editor
-- Xóa toàn bộ dữ liệu hiện tại trước khi chạy nếu cần reset.
-- ================================================================

-- Bật extension để hỗ trợ tính toán khoảng cách và text unaccent
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- HÀM TIỆN ÍCH
-- ================================================================
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
  SELECT extensions.unaccent($1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- ================================================================
-- 1. BẢNG profiles
-- ================================================================
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         TEXT NOT NULL,
  avatar_url           TEXT,
  bio                  TEXT,
  role                 TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','editor','admin')),
  vip_status           TEXT DEFAULT 'free' CHECK (vip_status IN ('free','vip')),
  vip_expires_at       TIMESTAMPTZ,
  home_city            TEXT DEFAULT 'Đà Nẵng',
  travel_style         TEXT[],
  preferred_transport  TEXT DEFAULT 'motorbike' CHECK (preferred_transport IN ('motorbike','car','walk','bicycle')),
  travel_with          TEXT DEFAULT 'couple' CHECK (travel_with IN ('solo','couple','family','group')),
  ai_msg_count         INTEGER DEFAULT 0,
  ai_msg_reset_date    DATE DEFAULT CURRENT_DATE,
  phone                TEXT,
  gender               TEXT CHECK (gender IN ('male','female','other','prefer_not')),
  birth_year           INTEGER,
  total_trips          INTEGER DEFAULT 0,
  total_reviews        INTEGER DEFAULT 0,
  notification_enabled BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 2. BẢNG places
-- ================================================================
CREATE TABLE public.places (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id  TEXT UNIQUE,
  name             TEXT NOT NULL,
  name_en          TEXT,
  description      TEXT,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL DEFAULT 'Đà Nẵng',
  district         TEXT,
  lat              DECIMAL(10,8) NOT NULL,
  lng              DECIMAL(11,8) NOT NULL,
  location         extensions.geography(POINT, 4326),
  category         TEXT NOT NULL CHECK (category IN ('beach','mountain','temple','museum','food','market','entertainment','nature','historical','viewpoint','park')),
  tags             TEXT[],
  suitable_for     TEXT[],
  entry_fee_min    INTEGER DEFAULT 0,
  entry_fee_max    INTEGER DEFAULT 0,
  avg_duration_min INTEGER DEFAULT 60,
  opening_time     TIME DEFAULT '07:00',
  closing_time     TIME DEFAULT '17:00',
  opening_days     INTEGER[] DEFAULT '{1,2,3,4,5,6,7}',
  tips             TEXT,
  best_time_of_day TEXT CHECK (best_time_of_day IN ('morning','afternoon','evening','anytime')),
  best_months      INTEGER[],
  image_urls       TEXT[],
  phone            TEXT,
  website          TEXT,
  rating_avg       DECIMAL(3,2) DEFAULT 0,
  rating_count     INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index và Trigger cho places
CREATE INDEX idx_places_location ON public.places USING GIST (location);
CREATE INDEX idx_places_category ON public.places(category) WHERE is_active = TRUE;
CREATE INDEX idx_places_fts ON public.places USING GIN (to_tsvector('simple', public.immutable_unaccent(name || ' ' || COALESCE(description, ''))));

CREATE OR REPLACE FUNCTION public.sync_place_location() RETURNS TRIGGER AS $$
BEGIN
  NEW.location := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.lng, NEW.lat), 4326)::extensions.geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_place_location BEFORE INSERT OR UPDATE OF lat, lng ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.sync_place_location();

-- ================================================================
-- 3. BẢNG distances
-- ================================================================
CREATE TABLE public.distances (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_place_id          UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  to_place_id            UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  distance_m             INTEGER NOT NULL,
  duration_motorbike_min INTEGER,
  duration_car_min       INTEGER,
  duration_walk_min      INTEGER,
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_place_id, to_place_id)
);

CREATE INDEX idx_distances_from ON public.distances(from_place_id);
CREATE INDEX idx_distances_to   ON public.distances(to_place_id);

-- ================================================================
-- 4. BẢNG itineraries
-- ================================================================
CREATE TABLE public.itineraries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL DEFAULT 'Lịch trình Đà Nẵng',
  description     TEXT,
  cover_image_url TEXT,
  num_days        INTEGER DEFAULT 1 CHECK (num_days BETWEEN 1 AND 10),
  start_date      DATE,
  end_date        DATE,
  companion       TEXT,
  budget_tier     TEXT DEFAULT 'mid',
  visibility      TEXT DEFAULT 'private' CHECK (visibility IN ('private','public','shared')),
  transport       TEXT DEFAULT 'motorbike' CHECK (transport IN ('motorbike','car','walk','bicycle')),
  budget_total    INTEGER,
  travel_style    TEXT[],
  num_people      INTEGER DEFAULT 1,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  share_token     TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  is_public       BOOLEAN DEFAULT FALSE,
  view_count      INTEGER DEFAULT 0,
  like_count      INTEGER DEFAULT 0,
  clone_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 5. BẢNG itinerary_days
-- ================================================================
CREATE TABLE public.itinerary_days (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id   UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number     INTEGER DEFAULT 1,
  day_index      INTEGER DEFAULT 0,
  date           DATE,
  title          TEXT,
  note           TEXT,
  estimated_cost INTEGER DEFAULT 0,
  UNIQUE (itinerary_id, day_number)
);

-- ================================================================
-- 6. BẢNG itinerary_slots (Thay thế itinerary_places)
-- ================================================================
CREATE TABLE public.itinerary_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id          UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  place_id        UUID REFERENCES public.places(id) ON DELETE SET NULL,
  place_name      TEXT NOT NULL DEFAULT 'Địa điểm',
  place_image_url TEXT,
  place_category  TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0,
  start_time      TEXT DEFAULT '08:00',
  duration_min    INTEGER DEFAULT 60,
  note            TEXT,
  transport_mode  TEXT DEFAULT 'motorbike',
  travel_time_min INTEGER DEFAULT 15,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 7. BẢNG itinerary_likes
-- ================================================================
CREATE TABLE public.itinerary_likes (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, itinerary_id)
);

-- ================================================================
-- 8. BẢNG group_votes
-- ================================================================
CREATE TABLE public.group_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  place_id     UUID NOT NULL REFERENCES public.places(id),
  voter_token  TEXT NOT NULL,
  voter_name   TEXT,
  vote         TEXT NOT NULL CHECK (vote IN ('up','down')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (itinerary_id, place_id, voter_token)
);

-- ================================================================
-- 9. BẢNG reviews
-- ================================================================
CREATE TABLE public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  visit_type    TEXT CHECK (visit_type IN ('solo','couple','family','group')),
  visit_month   INTEGER CHECK (visit_month BETWEEN 1 AND 12),
  highlights    TEXT[],
  comment       TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (place_id, user_id)
);

CREATE OR REPLACE FUNCTION public.update_place_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.places SET
    rating_avg = ROUND((SELECT AVG(rating) FROM public.reviews WHERE place_id = COALESCE(NEW.place_id, OLD.place_id))::NUMERIC, 2),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE place_id = COALESCE(NEW.place_id, OLD.place_id))
  WHERE id = COALESCE(NEW.place_id, OLD.place_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_place_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_place_rating();

-- ================================================================
-- 10. BẢNG review_helpful
-- ================================================================
CREATE TABLE public.review_helpful (
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);

-- ================================================================
-- 11. BẢNG saved_places
-- ================================================================
CREATE TABLE public.saved_places (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, place_id)
);

-- ================================================================
-- 12. BẢNG ai_consultations
-- ================================================================
CREATE TABLE public.ai_consultations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID DEFAULT gen_random_uuid(),
  messages   JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 13. BẢNG support_tickets
-- ================================================================
CREATE TABLE public.support_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category         TEXT NOT NULL CHECK (category IN ('payment_error','vip_not_activated','data_error','app_bug','place_wrong_info','suggestion','other')),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  attachment_urls  TEXT[],
  related_place_id UUID REFERENCES public.places(id),
  order_ref        TEXT,
  status           TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_note       TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 14. BẢNG place_reports
-- ================================================================
CREATE TABLE public.place_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL CHECK (reason IN ('wrong_hours','wrong_price','place_closed','wrong_image','wrong_address','other')),
  note        TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 15. BẢNG vip_transactions
-- ================================================================
CREATE TABLE public.vip_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  amount            INTEGER NOT NULL,
  package_type      TEXT NOT NULL CHECK (package_type IN ('per_trip','monthly','yearly')),
  payment_method    TEXT,
  payment_ref       TEXT,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed','refunded')),
  vip_granted_until TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TRIGGER Tự động tạo profile khi user đăng ký (Supabase Auth)
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Du khách'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- ROW LEVEL SECURITY (RLS) & PHÂN QUYỀN
-- ================================================================

-- Bật RLS cho tất cả
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_transactions ENABLE ROW LEVEL SECURITY;

-- Cấp quyền cho anon và authenticated truy cập public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Policies cho profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies cho places
CREATE POLICY "Active places are viewable by everyone." ON public.places FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin/Editor can write places." ON public.places FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('editor','admin'))
);

-- Policies cho distances
CREATE POLICY "Distances viewable by everyone" ON public.distances FOR SELECT USING (TRUE);

-- Policies cho itineraries
CREATE POLICY "Itineraries are viewable if public or shared" ON public.itineraries FOR SELECT USING (visibility IN ('public', 'shared') OR auth.uid() = user_id);
CREATE POLICY "Users can manage own itineraries" ON public.itineraries FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Policies cho itinerary_days & itinerary_slots & itinerary_likes
CREATE POLICY "Days viewable by everyone" ON public.itinerary_days FOR SELECT USING (TRUE);
CREATE POLICY "Days manage by owner" ON public.itinerary_days FOR ALL TO authenticated USING (TRUE);
CREATE POLICY "Slots viewable by everyone" ON public.itinerary_slots FOR SELECT USING (TRUE);
CREATE POLICY "Slots manage by everyone" ON public.itinerary_slots FOR ALL USING (TRUE);
CREATE POLICY "Likes viewable by everyone" ON public.itinerary_likes FOR SELECT USING (TRUE);
CREATE POLICY "Likes manage by everyone" ON public.itinerary_likes FOR ALL USING (TRUE);

-- Group Votes
CREATE POLICY "Anyone can vote" ON public.group_votes FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can view votes" ON public.group_votes FOR SELECT USING (TRUE);

-- Reviews
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "Users can manage own reviews" ON public.reviews FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Saved Places
CREATE POLICY "Users can manage own saved places" ON public.saved_places FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Tickets & Reports
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can create place reports" ON public.place_reports FOR INSERT WITH CHECK (TRUE);

-- ================================================================
-- ADMIN ACCOUNT SETUP
-- ================================================================
-- BỎ QUA VIỆC INSERT THỦ CÔNG VÀO auth.users DO SẼ LÀM HỎNG SUPABASE GOTRUE (Gây lỗi 500).
-- Bạn hãy dùng chức năng Đăng ký trên App để tạo tài khoản, sau đó chạy lệnh UPDATE role thành admin.
-- DO $$
-- DECLARE
--   new_admin_id UUID := gen_random_uuid();
-- BEGIN
--   IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@danangtravel.vn') THEN
--     INSERT INTO auth.users (
--       id, instance_id, email, encrypted_password, email_confirmed_at,
--       raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
--     ) VALUES (
--       new_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@danangtravel.vn',
--       crypt('Admin123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}',
--       '{"displayName":"Quản Trị Viên Đà Nẵng","role":"admin"}', now(), now(), 'authenticated', 'authenticated'
--     );
--     INSERT INTO public.profiles (
--       id, display_name, bio, vip_status, role, created_at, updated_at
--     ) VALUES (
--       new_admin_id, 'Quản Trị Viên Đà Nẵng', 'Tài khoản Quản trị', 'vip', 'admin', now(), now()
--     ) ON CONFLICT (id) DO UPDATE SET vip_status = 'vip', role = 'admin';
--   END IF;
-- END $$;
