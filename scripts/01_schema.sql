-- ================================================================
-- DANANG ITINERARY — PRODUCTION BASELINE
-- Chạy toàn bộ file này đúng 1 lần trên database sạch.
-- Sau lần triển khai đầu tiên, chỉ thay đổi bằng migration bất biến.
-- ================================================================

BEGIN;

-- Bật extension để hỗ trợ tính toán khoảng cách và text unaccent
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ================================================================
-- HÀM TIỆN ÍCH
-- ================================================================
CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
RETURNS text AS $$
  SELECT extensions.unaccent($1);
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- ================================================================
-- BẢNG profiles
-- ================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  avatar_url           TEXT CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048),
  bio                  TEXT CHECK (bio IS NULL OR char_length(bio) <= 500),
  role                 TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','editor','admin')),
  vip_status           TEXT NOT NULL DEFAULT 'free' CHECK (vip_status IN ('free','vip')),
  vip_started_at       TIMESTAMPTZ,
  vip_expires_at       TIMESTAMPTZ,
  home_city            TEXT DEFAULT 'Đà Nẵng' CHECK (home_city IS NULL OR char_length(trim(home_city)) BETWEEN 1 AND 120),
  travel_style         TEXT[] NOT NULL DEFAULT '{}',
  preferred_transport  TEXT DEFAULT 'motorbike' CHECK (preferred_transport IN ('motorbike','car','walk','bicycle')),
  travel_with          TEXT DEFAULT 'couple' CHECK (travel_with IN ('solo','couple','family','group')),
  ai_msg_count         INTEGER NOT NULL DEFAULT 0 CHECK (ai_msg_count >= 0),
  ai_msg_reset_date    DATE NOT NULL DEFAULT (timezone('Asia/Ho_Chi_Minh', NOW()))::DATE,
  terms_version        TEXT CHECK (terms_version IS NULL OR char_length(terms_version) <= 32),
  terms_accepted_at    TIMESTAMPTZ,
  is_banned            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_profile_styles CHECK (
    travel_style <@ ARRAY['beach','mountain','history','food','entertainment','photo','relax','adventure','culture','family']::TEXT[]
    AND array_position(travel_style, '') IS NULL
  ),
  CONSTRAINT chk_profile_vip_window CHECK (
    (vip_status = 'free' AND vip_started_at IS NULL AND vip_expires_at IS NULL)
    OR (vip_status = 'vip' AND vip_started_at IS NOT NULL AND vip_expires_at IS NOT NULL AND vip_expires_at > vip_started_at)
  )
);

-- Hàm is_admin an toàn để dùng trong RLS (không self-query profile)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_banned = FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('editor', 'admin') AND is_banned = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_account()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_banned = FALSE
  );
$$;

-- So sánh các trường do hệ thống quản lý mà người dùng thường không được đổi.
-- SECURITY DEFINER tránh self-query làm RLS của profiles đệ quy vô hạn.
CREATE OR REPLACE FUNCTION public.profile_system_fields_unchanged(
  p_id UUID,
  p_role TEXT,
  p_vip_status TEXT,
  p_vip_started_at TIMESTAMPTZ,
  p_vip_expires_at TIMESTAMPTZ,
  p_ai_msg_count INTEGER,
  p_ai_msg_reset_date DATE,
  p_terms_version TEXT,
  p_terms_accepted_at TIMESTAMPTZ,
  p_is_banned BOOLEAN,
  p_created_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles old
    WHERE old.id = auth.uid() AND old.id = p_id
      AND old.role IS NOT DISTINCT FROM p_role
      AND old.vip_status IS NOT DISTINCT FROM p_vip_status
      AND old.vip_started_at IS NOT DISTINCT FROM p_vip_started_at
      AND old.vip_expires_at IS NOT DISTINCT FROM p_vip_expires_at
      AND old.ai_msg_count IS NOT DISTINCT FROM p_ai_msg_count
      AND old.ai_msg_reset_date IS NOT DISTINCT FROM p_ai_msg_reset_date
      AND old.terms_version IS NOT DISTINCT FROM p_terms_version
      AND old.terms_accepted_at IS NOT DISTINCT FROM p_terms_accepted_at
      AND old.is_banned IS NOT DISTINCT FROM p_is_banned
      AND old.created_at IS NOT DISTINCT FROM p_created_at
  );
$$;

-- ================================================================
-- BẢNG places
-- ================================================================
CREATE TABLE IF NOT EXISTS public.places (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id  TEXT UNIQUE,
  name             TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  name_en          TEXT,
  description      TEXT CHECK (description IS NULL OR char_length(description) <= 10000),
  address          TEXT NOT NULL CHECK (char_length(trim(address)) BETWEEN 1 AND 500),
  city             TEXT NOT NULL DEFAULT 'Đà Nẵng' CHECK (char_length(trim(city)) BETWEEN 1 AND 120),
  district         TEXT,
  lat              DECIMAL(10,8) NOT NULL CONSTRAINT chk_lat_range CHECK (lat BETWEEN -90 AND 90),
  lng              DECIMAL(11,8) NOT NULL CONSTRAINT chk_lng_range CHECK (lng BETWEEN -180 AND 180),
  location         extensions.geography(POINT, 4326),
  category         TEXT NOT NULL CHECK (category IN ('beach','mountain','temple','museum','food','market','entertainment','nature','historical','viewpoint','park','shopping','wellness')),
  tags             TEXT[] NOT NULL DEFAULT '{}',
  suitable_for     TEXT[] NOT NULL DEFAULT '{}',
  avg_duration_min INTEGER NOT NULL CHECK (avg_duration_min BETWEEN 15 AND 720),
  opening_time     TIME NOT NULL,
  closing_time     TIME NOT NULL,
  opening_days     INTEGER[] NOT NULL CONSTRAINT chk_opening_days_present CHECK (cardinality(opening_days) > 0),
  tips             TEXT,
  best_time_of_day TEXT CHECK (best_time_of_day IN ('morning','afternoon','evening','night','anytime')),
  best_months      INTEGER[],
  image_urls       TEXT[] NOT NULL DEFAULT '{}' CONSTRAINT chk_place_image_limit CHECK (cardinality(image_urls) <= 10),
  phone            TEXT,
  website          TEXT,
  source_name      TEXT NOT NULL CHECK (char_length(trim(source_name)) BETWEEN 1 AND 160),
  source_url       TEXT NOT NULL CHECK (char_length(source_url) <= 2048 AND source_url ~ '^https?://'),
  rating_avg       DECIMAL(3,2),
  rating_count     INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  content_status   TEXT NOT NULL DEFAULT 'published' CHECK (content_status IN ('draft','pending_review','published','rejected','archived')),
  review_note      TEXT,
  last_edited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rating_consistency CHECK (
    (rating_count = 0 AND rating_avg IS NULL)
    OR (rating_count > 0 AND rating_avg BETWEEN 1 AND 5)
  ),
  CONSTRAINT chk_place_publication CHECK (is_active = (content_status = 'published')),
  CONSTRAINT chk_place_opening_days CHECK (
    opening_days <@ ARRAY[1,2,3,4,5,6,7]::INTEGER[]
  ),
  CONSTRAINT chk_place_best_months CHECK (
    best_months IS NULL OR best_months <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12]::INTEGER[]
  ),
  CONSTRAINT chk_place_suitable_for CHECK (
    suitable_for <@ ARRAY['family','couple','solo','friends','elderly','pet']::TEXT[]
    AND array_position(suitable_for, '') IS NULL
  )
);

-- Canonical identity prevents exact duplicates when several editors work at once.
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS normalized_name TEXT GENERATED ALWAYS AS (lower(public.immutable_unaccent(trim(name)))) STORED,
  ADD COLUMN IF NOT EXISTS normalized_address TEXT GENERATED ALWAYS AS (lower(public.immutable_unaccent(trim(address)))) STORED,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_places_normalized_identity
  ON public.places(normalized_name, normalized_address, city);

CREATE INDEX IF NOT EXISTS idx_places_location ON public.places USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_places_category ON public.places(category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_places_fts ON public.places USING GIN (to_tsvector('simple', public.immutable_unaccent(name || ' ' || COALESCE(description, ''))));
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON public.places USING GIN (normalized_name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_address_trgm ON public.places USING GIN (normalized_address extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_places(
  p_query TEXT DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL,
  p_suitable_for TEXT[] DEFAULT NULL,
  p_min_duration INTEGER DEFAULT NULL,
  p_min_rating DECIMAL DEFAULT NULL,
  p_open_now BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 40,
  p_offset INTEGER DEFAULT 0
)
RETURNS SETOF public.places
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH input AS (
    SELECT lower(public.immutable_unaccent(trim(COALESCE(p_query, '')))) AS q,
           timezone('Asia/Ho_Chi_Minh', NOW()) AS local_now
  )
  SELECT p.*
  FROM public.places p CROSS JOIN input i
  WHERE p.is_active = TRUE
    AND p.content_status = 'published'
    AND (p_categories IS NULL OR cardinality(p_categories) = 0 OR p.category = ANY(p_categories))
    AND (p_suitable_for IS NULL OR cardinality(p_suitable_for) = 0 OR p.suitable_for && p_suitable_for)
    AND (p_min_duration IS NULL OR p.avg_duration_min >= p_min_duration)
    AND (p_min_rating IS NULL OR p.rating_avg >= p_min_rating)
    AND (
      NOT p_open_now OR (
        (p.closing_time >= p.opening_time
          AND EXTRACT(isodow FROM i.local_now)::INTEGER = ANY(p.opening_days)
          AND i.local_now::TIME BETWEEN p.opening_time AND p.closing_time)
        OR
        (p.closing_time < p.opening_time AND (
          (EXTRACT(isodow FROM i.local_now)::INTEGER = ANY(p.opening_days) AND i.local_now::TIME >= p.opening_time)
          OR (((EXTRACT(isodow FROM i.local_now)::INTEGER + 5) % 7 + 1) = ANY(p.opening_days) AND i.local_now::TIME <= p.closing_time)
        ))
      )
    )
    AND (
      i.q = ''
      OR p.normalized_name LIKE '%' || i.q || '%'
      OR p.normalized_address LIKE '%' || i.q || '%'
      OR extensions.similarity(p.normalized_name, i.q) >= 0.2
      OR to_tsvector('simple', public.immutable_unaccent(
        p.name || ' ' || COALESCE(p.name_en, '') || ' ' || p.address || ' ' ||
        COALESCE(p.description, '') || ' ' || array_to_string(p.tags, ' ')
      )) @@ plainto_tsquery('simple', i.q)
    )
  ORDER BY
    CASE WHEN i.q <> '' AND p.normalized_name = i.q THEN 0
         WHEN i.q <> '' AND p.normalized_name LIKE i.q || '%' THEN 1
         WHEN i.q <> '' AND p.normalized_name LIKE '%' || i.q || '%' THEN 2
         ELSE 3 END,
    CASE WHEN i.q = '' THEN 0 ELSE extensions.similarity(p.normalized_name, i.q) END DESC,
    p.rating_count DESC,
    p.rating_avg DESC NULLS LAST,
    p.name
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.sync_place_location() RETURNS TRIGGER AS $$
BEGIN
  NEW.location := extensions.ST_SetSRID(extensions.ST_MakePoint(NEW.lng, NEW.lat), 4326)::extensions.geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_place_location ON public.places;
CREATE TRIGGER trg_sync_place_location BEFORE INSERT OR UPDATE OF lat, lng ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.sync_place_location();

-- Editors create drafts and submit them; only admins make publication decisions.
CREATE OR REPLACE FUNCTION public.guard_place_editorial_workflow() RETURNS TRIGGER AS $$
BEGIN
  IF public.is_editor() AND NOT public.is_admin() THEN
    IF TG_OP = 'UPDATE' AND OLD.content_status = 'published' THEN
      RAISE EXCEPTION 'Create a draft revision instead of editing published content';
    END IF;
    IF NEW.content_status NOT IN ('draft', 'pending_review') THEN
      RAISE EXCEPTION 'Editors may only save drafts or submit for review';
    END IF;
    NEW.is_active := FALSE;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSIF public.is_admin() THEN
    NEW.is_active := NEW.content_status = 'published';
    IF NEW.content_status IN ('published', 'rejected', 'archived') THEN
      NEW.reviewed_by := auth.uid();
      NEW.reviewed_at := NOW();
    END IF;
  END IF;
  NEW.last_edited_by := auth.uid();
  IF TG_OP = 'INSERT' THEN
    NEW.version := 1;
  ELSE
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_place_editorial_workflow ON public.places;
CREATE TRIGGER trg_guard_place_editorial_workflow
  BEFORE INSERT OR UPDATE OF google_place_id, name, name_en, description, address, city,
    district, lat, lng, category, tags, suitable_for,
    avg_duration_min, opening_time, closing_time, opening_days, tips, best_time_of_day,
    best_months, image_urls, phone, website, source_name, source_url, is_active, content_status, review_note
  ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.guard_place_editorial_workflow();

CREATE TABLE IF NOT EXISTS public.place_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  editor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_status TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(place_id, version)
);
CREATE INDEX IF NOT EXISTS idx_place_revisions_place_created ON public.place_revisions(place_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.store_place_revision() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.place_revisions(place_id, version, editor_id, content_status, snapshot)
  VALUES (NEW.id, NEW.version, auth.uid(), NEW.content_status, to_jsonb(NEW))
  ON CONFLICT (place_id, version) DO UPDATE SET
    content_status = EXCLUDED.content_status,
    snapshot = EXCLUDED.snapshot,
    editor_id = COALESCE(public.place_revisions.editor_id, EXCLUDED.editor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_store_place_revision ON public.places;
CREATE TRIGGER trg_store_place_revision
  AFTER INSERT OR UPDATE OF google_place_id, name, name_en, description, address, city,
    district, lat, lng, category, tags, suitable_for, avg_duration_min,
    opening_time, closing_time, opening_days, tips, best_time_of_day, best_months,
    image_urls, phone, website, source_name, source_url, is_active, content_status, review_note
  ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.store_place_revision();

CREATE OR REPLACE FUNCTION public.submit_place_revision(p_place_id UUID, p_snapshot JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_version INTEGER;
BEGIN
  IF NOT public.is_editor() THEN RAISE EXCEPTION 'Editor role required'; END IF;
  IF p_snapshot IS NULL OR octet_length(p_snapshot::TEXT) > 50000 THEN RAISE EXCEPTION 'Revision payload is invalid or too large'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.places WHERE id = p_place_id) THEN RAISE EXCEPTION 'Place not found'; END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version FROM public.place_revisions WHERE place_id = p_place_id;
  INSERT INTO public.place_revisions(place_id, version, editor_id, content_status, snapshot)
  VALUES (p_place_id, v_version, auth.uid(), 'pending_review', p_snapshot - ARRAY['id','version','is_active','reviewed_by','reviewed_at'])
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_place_revision(p_revision_id UUID, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_revision public.place_revisions%ROWTYPE; v_snapshot JSONB;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin role required'; END IF;
  SELECT * INTO v_revision FROM public.place_revisions WHERE id = p_revision_id AND content_status = 'pending_review' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending revision not found'; END IF;
  IF NOT p_approve THEN
    UPDATE public.place_revisions SET content_status = 'rejected', snapshot = snapshot || jsonb_build_object('review_note', p_note) WHERE id = p_revision_id;
    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
    VALUES (auth.uid(), 'reject_revision', 'place', v_revision.place_id, v_revision.snapshot, jsonb_build_object('revision_id', p_revision_id, 'review_note', p_note));
    RETURN v_revision.place_id;
  END IF;
  v_snapshot := v_revision.snapshot;
  UPDATE public.places SET
    name = COALESCE(v_snapshot->>'name', name),
    name_en = COALESCE(v_snapshot->>'name_en', name_en),
    description = COALESCE(v_snapshot->>'description', description),
    address = COALESCE(v_snapshot->>'address', address),
    city = COALESCE(v_snapshot->>'city', city),
    district = CASE WHEN v_snapshot ? 'district' THEN v_snapshot->>'district' ELSE district END,
    category = COALESCE(v_snapshot->>'category', category),
    lat = COALESCE((v_snapshot->>'lat')::DECIMAL, lat),
    lng = COALESCE((v_snapshot->>'lng')::DECIMAL, lng),
    tags = CASE WHEN v_snapshot ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(v_snapshot->'tags')) ELSE tags END,
    suitable_for = CASE WHEN v_snapshot ? 'suitable_for' THEN ARRAY(SELECT jsonb_array_elements_text(v_snapshot->'suitable_for')) ELSE suitable_for END,
    avg_duration_min = COALESCE((v_snapshot->>'avg_duration_min')::INTEGER, avg_duration_min),
    opening_time = COALESCE((v_snapshot->>'opening_time')::TIME, opening_time),
    closing_time = COALESCE((v_snapshot->>'closing_time')::TIME, closing_time),
    opening_days = CASE WHEN v_snapshot ? 'opening_days' THEN ARRAY(SELECT jsonb_array_elements_text(v_snapshot->'opening_days'))::INTEGER[] ELSE opening_days END,
    tips = CASE WHEN v_snapshot ? 'tips' THEN v_snapshot->>'tips' ELSE tips END,
    best_time_of_day = CASE WHEN v_snapshot ? 'best_time_of_day' THEN v_snapshot->>'best_time_of_day' ELSE best_time_of_day END,
    best_months = CASE WHEN v_snapshot ? 'best_months' THEN ARRAY(SELECT jsonb_array_elements_text(v_snapshot->'best_months'))::INTEGER[] ELSE best_months END,
    phone = CASE WHEN v_snapshot ? 'phone' THEN v_snapshot->>'phone' ELSE phone END,
    website = CASE WHEN v_snapshot ? 'website' THEN v_snapshot->>'website' ELSE website END,
    source_name = COALESCE(v_snapshot->>'source_name', source_name),
    source_url = COALESCE(v_snapshot->>'source_url', source_url),
    image_urls = CASE WHEN v_snapshot ? 'image_urls' THEN ARRAY(SELECT jsonb_array_elements_text(v_snapshot->'image_urls')) ELSE image_urls END,
    content_status = 'published', review_note = p_note
  WHERE id = v_revision.place_id;
  UPDATE public.place_revisions
  SET content_status = 'published',
      snapshot = snapshot || jsonb_build_object('review_note', p_note, 'reviewed_at', NOW(), 'reviewed_by', auth.uid())
  WHERE id = p_revision_id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), 'approve_revision', 'place', v_revision.place_id, v_revision.snapshot, v_snapshot);
  RETURN v_revision.place_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_place_revision(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_place_revision(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_place_revision(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_place_revision(UUID, BOOLEAN, TEXT) TO authenticated;

-- Privileged server actions are logged here. No RLS policy means mobile clients
-- cannot read or write this table directly.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_moderate_place(
  p_place_id UUID,
  p_action TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before JSONB;
  v_status TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF p_action NOT IN ('publish', 'reject', 'archive') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MODERATION_ACTION';
  END IF;
  IF p_action = 'reject' AND char_length(trim(COALESCE(p_note, ''))) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'MODERATION_NOTE_REQUIRED';
  END IF;

  SELECT to_jsonb(p) INTO v_before FROM public.places p WHERE p.id = p_place_id FOR UPDATE;
  IF v_before IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PLACE_NOT_FOUND';
  END IF;
  v_status := CASE p_action WHEN 'publish' THEN 'published' WHEN 'reject' THEN 'rejected' ELSE 'archived' END;

  UPDATE public.places
  SET content_status = v_status,
      is_active = p_action = 'publish',
      review_note = CASE WHEN p_action = 'reject' THEN trim(p_note) ELSE NULL END
  WHERE id = p_place_id;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (
    auth.uid(), 'moderate_place_' || p_action, 'place', p_place_id, v_before,
    jsonb_build_object('content_status', v_status, 'review_note', CASE WHEN p_action = 'reject' THEN trim(p_note) ELSE NULL END)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_moderate_place(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_place(UUID, TEXT, TEXT) TO authenticated;

-- ================================================================
-- BẢNG itineraries
-- ================================================================
CREATE TABLE IF NOT EXISTS public.itineraries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Lịch trình Đà Nẵng' CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  description     TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  cover_image_url TEXT CHECK (cover_image_url IS NULL OR (char_length(cover_image_url) <= 2048 AND cover_image_url ~ '^https?://')),
  num_days        INTEGER NOT NULL DEFAULT 1 CHECK (num_days BETWEEN 1 AND 10),
  start_date      DATE NOT NULL,
  end_date        DATE GENERATED ALWAYS AS (start_date + (num_days - 1)) STORED,
  visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared')),
  transport       TEXT NOT NULL DEFAULT 'motorbike' CHECK (transport IN ('motorbike','car','walk','bicycle')),
  travel_style    TEXT[] NOT NULL DEFAULT '{}',
  num_people      INTEGER NOT NULL DEFAULT 1 CHECK (num_people BETWEEN 1 AND 30),
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','archived')),
  share_token     UUID UNIQUE,
  voting_status   TEXT NOT NULL DEFAULT 'locked' CHECK (voting_status IN ('open','locked')),
  share_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_itinerary_share_state CHECK (
    (visibility = 'private' AND share_token IS NULL AND share_expires_at IS NULL AND voting_status = 'locked')
    OR (visibility = 'shared' AND share_token IS NOT NULL AND share_expires_at > created_at)
  ),
  CONSTRAINT chk_itinerary_styles CHECK (
    travel_style <@ ARRAY['beach','mountain','history','food','entertainment','photo','relax','adventure','culture','family']::TEXT[]
    AND array_position(travel_style, '') IS NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user_updated ON public.itineraries(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_itineraries_share_token ON public.itineraries(share_token)
  WHERE visibility = 'shared';

-- ================================================================
-- BẢNG itinerary_days
-- ================================================================
CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id     UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number       INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 10),
  date             DATE NOT NULL,
  title            TEXT CHECK (title IS NULL OR char_length(title) <= 160),
  note             TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  weather_score    INTEGER CHECK (weather_score BETWEEN 0 AND 100),
  weather_summary  TEXT CHECK (weather_summary IS NULL OR char_length(weather_summary) <= 500),
  advice           JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(advice) = 'array' AND octet_length(advice::TEXT) <= 20000),
  UNIQUE (itinerary_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_itin_id ON public.itinerary_days(itinerary_id);

-- ================================================================
-- BẢNG itinerary_slots
-- ================================================================
CREATE TABLE IF NOT EXISTS public.itinerary_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id          UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  place_id        UUID REFERENCES public.places(id) ON DELETE SET NULL,
  place_name      TEXT NOT NULL CHECK (char_length(trim(place_name)) BETWEEN 1 AND 160),
  place_image_url TEXT CHECK (place_image_url IS NULL OR (char_length(place_image_url) <= 2048 AND place_image_url ~ '^https?://')),
  place_category  TEXT CHECK (place_category IS NULL OR char_length(place_category) <= 80),
  order_index     INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  start_time      TIME NOT NULL DEFAULT '08:00',
  duration_min    INTEGER NOT NULL DEFAULT 60 CHECK (duration_min BETWEEN 5 AND 720),
  note            TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  transport_mode  TEXT NOT NULL DEFAULT 'motorbike' CHECK (transport_mode IN ('motorbike','car','walk','bicycle')),
  travel_time_min INTEGER NOT NULL DEFAULT 0 CHECK (travel_time_min BETWEEN 0 AND 1440),
  weather_score   INTEGER CHECK (weather_score BETWEEN 0 AND 100),
  weather_note    TEXT CHECK (weather_note IS NULL OR char_length(weather_note) <= 500),
  rain_at_hour    REAL CHECK (rain_at_hour IS NULL OR rain_at_hour >= 0),
  is_meal         BOOLEAN NOT NULL DEFAULT FALSE,
  is_indoor       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_itinerary_slot_kind CHECK (
    (is_meal AND place_id IS NULL) OR (NOT is_meal AND place_id IS NOT NULL)
  ),
  UNIQUE (day_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_slots_day ON public.itinerary_slots(day_id, order_index);

CREATE OR REPLACE FUNCTION public.get_shared_itinerary(p_share_token TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', i.id,
    'title', i.title,
    'description', i.description,
    'cover_image_url', i.cover_image_url,
    'num_days', i.num_days,
    'start_date', i.start_date,
    'end_date', i.end_date,
    'transport', i.transport,
    'travel_style', i.travel_style,
    'num_people', i.num_people,
    'visibility', i.visibility,
    'status', i.status,
    'voting_status', i.voting_status,
    'share_expires_at', i.share_expires_at,
    'is_owner', auth.uid() = i.user_id,
    'author_name', COALESCE(owner.display_name, 'Du khách'),
    'created_at', i.created_at,
    'updated_at', i.updated_at,
    'itinerary_days', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'day_number', d.day_number,
          'date', d.date,
          'title', d.title,
          'note', d.note,
          'weather_score', d.weather_score,
          'weather_summary', d.weather_summary,
          'advice', d.advice,
          'itinerary_slots', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', s.id,
                'place_id', s.place_id,
                'place_name', s.place_name,
                'place_image_url', s.place_image_url,
                'place_category', s.place_category,
                'order_index', s.order_index,
                'start_time', to_char(s.start_time, 'HH24:MI'),
                'duration_min', s.duration_min,
                'note', s.note,
                'transport_mode', s.transport_mode,
                'travel_time_min', s.travel_time_min,
                'weather_score', s.weather_score,
                'weather_note', s.weather_note,
                'rain_at_hour', s.rain_at_hour,
                'is_meal', s.is_meal,
                'is_indoor', s.is_indoor,
                'places', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('lat', p.lat, 'lng', p.lng) END
              ) ORDER BY s.order_index
            )
            FROM public.itinerary_slots s
            LEFT JOIN public.places p ON p.id = s.place_id
            WHERE s.day_id = d.id
          ), '[]'::jsonb)
        ) ORDER BY d.day_number
      )
      FROM public.itinerary_days d
      WHERE d.itinerary_id = i.id
    ), '[]'::jsonb)
  )
  FROM public.itineraries i
  LEFT JOIN public.profiles owner ON owner.id = i.user_id
  WHERE i.share_token::TEXT = trim(p_share_token)
    AND i.visibility = 'shared'
    AND (i.share_expires_at IS NULL OR i.share_expires_at > NOW())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_itinerary(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_itinerary(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enable_itinerary_share(p_itinerary_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token UUID := gen_random_uuid();
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '7 days';
  v_existing public.itineraries%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ACCOUNT_NOT_ACTIVE';
  END IF;

  SELECT * INTO v_existing FROM public.itineraries
  WHERE id = p_itinerary_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ITINERARY_NOT_OWNED';
  END IF;
  IF v_existing.visibility = 'shared' AND v_existing.share_expires_at > NOW() THEN
    RETURN jsonb_build_object('share_token', v_existing.share_token::TEXT, 'share_expires_at', v_existing.share_expires_at);
  END IF;

  DELETE FROM public.group_votes WHERE itinerary_id = p_itinerary_id;
  UPDATE public.itineraries
  SET visibility = 'shared', share_token = v_token,
      share_expires_at = v_expires_at, voting_status = 'open'
  WHERE id = p_itinerary_id;

  RETURN jsonb_build_object('share_token', v_token::TEXT, 'share_expires_at', v_expires_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_itinerary_share(p_itinerary_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner_id UUID;
BEGIN
  UPDATE public.itineraries
  SET visibility = 'private', share_token = NULL,
      share_expires_at = NULL, voting_status = 'locked'
  WHERE id = p_itinerary_id AND user_id = auth.uid()
  RETURNING user_id INTO v_owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ITINERARY_NOT_OWNED';
  END IF;
  DELETE FROM public.group_votes WHERE itinerary_id = p_itinerary_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_itinerary_voting(p_itinerary_id UUID, p_voting_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_voting_status NOT IN ('open', 'locked') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_VOTING_STATUS';
  END IF;

  UPDATE public.itineraries
  SET voting_status = p_voting_status
  WHERE id = p_itinerary_id AND user_id = auth.uid()
    AND visibility = 'shared' AND share_expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'SHARE_NOT_OWNED_OR_EXPIRED';
  END IF;
END;
$$;

-- ================================================================
-- BẢNG group_votes
-- ================================================================
CREATE TABLE IF NOT EXISTS public.group_votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  place_id     UUID NOT NULL REFERENCES public.places(id),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voter_name   TEXT,
  vote         TEXT NOT NULL CHECK (vote IN ('up','down')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (itinerary_id, place_id, user_id)
);

CREATE OR REPLACE FUNCTION public.get_shared_votes(p_share_token TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'place_id', totals.place_id,
    'up', totals.up_count,
    'down', totals.down_count,
    'my_vote', totals.my_vote
  ) ORDER BY totals.place_id), '[]'::jsonb)
  FROM (
    SELECT gv.place_id,
      count(*) FILTER (WHERE gv.vote = 'up')::INTEGER AS up_count,
      count(*) FILTER (WHERE gv.vote = 'down')::INTEGER AS down_count,
      max(gv.vote) FILTER (WHERE gv.user_id = auth.uid()) AS my_vote
    FROM public.itineraries i
    JOIN public.group_votes gv ON gv.itinerary_id = i.id
    WHERE i.share_token::TEXT = trim(p_share_token)
      AND i.visibility = 'shared' AND i.share_expires_at > NOW()
    GROUP BY gv.place_id
  ) totals;
$$;

CREATE OR REPLACE FUNCTION public.vote_shared_itinerary(
  p_share_token TEXT,
  p_place_id UUID,
  p_vote TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_itinerary_id UUID;
  v_voter_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTHENTICATION_REQUIRED';
  END IF;
  IF p_vote NOT IN ('up', 'down') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_VOTE';
  END IF;

  SELECT id INTO v_itinerary_id
  FROM public.itineraries
  WHERE share_token::TEXT = trim(p_share_token)
    AND visibility = 'shared' AND voting_status = 'open'
    AND share_expires_at > NOW()
  FOR UPDATE;

  IF v_itinerary_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'SHARE_INVALID_OR_CLOSED';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.itinerary_slots s
    JOIN public.itinerary_days d ON d.id = s.day_id
    WHERE d.itinerary_id = v_itinerary_id AND s.place_id = p_place_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PLACE_NOT_IN_ITINERARY';
  END IF;

  SELECT display_name INTO v_voter_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.group_votes(itinerary_id, place_id, user_id, voter_name, vote)
  VALUES (v_itinerary_id, p_place_id, auth.uid(), COALESCE(v_voter_name, 'Người dùng'), p_vote)
  ON CONFLICT (itinerary_id, place_id, user_id)
  DO UPDATE SET vote = EXCLUDED.vote, voter_name = EXCLUDED.voter_name, created_at = NOW();
END;
$$;

-- ================================================================
-- BẢNG reviews & review_helpful
-- ================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  visit_type    TEXT CHECK (visit_type IN ('solo','couple','family','group')),
  visit_month   INTEGER CHECK (visit_month BETWEEN 1 AND 12),
  highlights    TEXT[],
  comment       TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),
  reviewer_name TEXT NOT NULL DEFAULT 'Du khách' CHECK (char_length(reviewer_name) BETWEEN 1 AND 80),
  reviewer_avatar_url TEXT CHECK (reviewer_avatar_url IS NULL OR char_length(reviewer_avatar_url) <= 2048),
  helpful_count INTEGER NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason   TEXT CHECK (flag_reason IS NULL OR char_length(flag_reason) <= 1000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (place_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_place_created ON public.reviews(place_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.snapshot_review_author() RETURNS TRIGGER AS $$
BEGIN
  SELECT display_name, avatar_url
  INTO NEW.reviewer_name, NEW.reviewer_avatar_url
  FROM public.profiles WHERE id = NEW.user_id;
  NEW.reviewer_name := COALESCE(NULLIF(trim(NEW.reviewer_name), ''), 'Du khách');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_snapshot_review_author
  BEFORE INSERT OR UPDATE OF user_id ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_review_author();

CREATE OR REPLACE FUNCTION public.update_place_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.places SET
    rating_avg = ROUND((SELECT AVG(rating) FROM public.reviews WHERE place_id = COALESCE(NEW.place_id, OLD.place_id) AND NOT is_flagged)::NUMERIC, 2),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE place_id = COALESCE(NEW.place_id, OLD.place_id) AND NOT is_flagged)
  WHERE id = COALESCE(NEW.place_id, OLD.place_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_place_rating ON public.reviews;
CREATE TRIGGER trg_update_place_rating AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_place_rating();

-- Rating aggregates and review metadata are system-owned. A direct client
-- update has trigger depth 1; the nested UPDATE issued by update_place_rating
-- has depth 2 and is allowed.
CREATE OR REPLACE FUNCTION public.protect_place_system_fields() RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'System-managed place fields cannot be updated directly';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_place_system_fields ON public.places;
CREATE TRIGGER trg_protect_place_system_fields
  BEFORE UPDATE OF rating_avg, rating_count, reviewed_at, reviewed_by ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.protect_place_system_fields();

-- Public image bucket contains published media only. To keep the MVP small and
-- avoid exposing unreviewed files, only admins may upload/delete place images;
-- editors submit textual revisions and an admin supplies/promotes final media.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('place-images', 'place-images', TRUE, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admins upload published place images" ON storage.objects;
CREATE POLICY "Admins upload published place images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'place-images'
    AND public.is_admin()
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
DROP POLICY IF EXISTS "Admins delete published place images" ON storage.objects;
CREATE POLICY "Admins delete published place images" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'place-images'
    AND public.is_admin()
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND owner_id = auth.uid()::TEXT);

CREATE TABLE IF NOT EXISTS public.review_helpful (
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (review_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_review_helpful_user ON public.review_helpful(user_id);

CREATE OR REPLACE FUNCTION public.update_review_helpful_count() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reviews
  SET helpful_count = (SELECT COUNT(*) FROM public.review_helpful WHERE review_id = COALESCE(NEW.review_id, OLD.review_id))
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_review_helpful_count
  AFTER INSERT OR DELETE ON public.review_helpful
  FOR EACH ROW EXECUTE FUNCTION public.update_review_helpful_count();

CREATE OR REPLACE FUNCTION public.protect_review_system_fields() RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() AND pg_trigger_depth() < 2 AND (
    NEW.place_id IS DISTINCT FROM OLD.place_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.reviewer_name IS DISTINCT FROM OLD.reviewer_name
    OR NEW.reviewer_avatar_url IS DISTINCT FROM OLD.reviewer_avatar_url
    OR NEW.helpful_count IS DISTINCT FROM OLD.helpful_count
    OR NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
    OR NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'System-managed review fields cannot be updated directly';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_review_system_fields
  BEFORE UPDATE OF place_id, user_id, reviewer_name, reviewer_avatar_url, helpful_count, is_flagged, flag_reason, created_at ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_review_system_fields();

CREATE OR REPLACE FUNCTION public.admin_moderate_review(
  p_review_id UUID,
  p_flagged BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF p_flagged AND char_length(trim(COALESCE(p_reason, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'MODERATION_REASON_REQUIRED';
  END IF;
  SELECT to_jsonb(r) INTO v_before FROM public.reviews r WHERE r.id = p_review_id FOR UPDATE;
  IF v_before IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'REVIEW_NOT_FOUND'; END IF;

  UPDATE public.reviews
  SET is_flagged = p_flagged, flag_reason = CASE WHEN p_flagged THEN trim(p_reason) ELSE NULL END
  WHERE id = p_review_id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), 'moderate_review', 'review', p_review_id, v_before,
    jsonb_build_object('is_flagged', p_flagged, 'flag_reason', CASE WHEN p_flagged THEN trim(p_reason) ELSE NULL END));
END;
$$;

-- ================================================================
-- BẢNG saved_places
-- ================================================================
CREATE TABLE IF NOT EXISTS public.saved_places (
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_places_user ON public.saved_places(user_id);

-- ================================================================
-- BẢNG ai_consultations
-- ================================================================
CREATE TABLE IF NOT EXISTS public.ai_consultations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới' CHECK (char_length(title) BETWEEN 1 AND 120),
  messages   JSONB NOT NULL DEFAULT '[]' CHECK (octet_length(messages::TEXT) <= 100000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- BẢNG support_tickets & ticket_replies
-- ================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category         TEXT NOT NULL CHECK (category IN ('payment_error','vip_not_activated','data_error','app_bug','place_wrong_info','suggestion','other')),
  title            TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description      TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 10000),
  related_place_id UUID REFERENCES public.places(id),
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_note       TEXT CHECK (admin_note IS NULL OR char_length(admin_note) <= 5000),
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON public.support_tickets(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.touch_ticket_after_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = NOW(),
      status = CASE WHEN NEW.is_admin THEN status ELSE 'in_progress' END,
      resolved_at = CASE WHEN NEW.is_admin THEN resolved_at ELSE NULL END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_ticket_after_reply
AFTER INSERT ON public.ticket_replies
FOR EACH ROW EXECUTE FUNCTION public.touch_ticket_after_reply();

CREATE OR REPLACE FUNCTION public.admin_reply_and_resolve_ticket(
  p_ticket_id UUID,
  p_body TEXT,
  p_status TEXT DEFAULT 'resolved'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_reply_id UUID; v_before JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF char_length(trim(COALESCE(p_body, ''))) NOT BETWEEN 1 AND 5000
     OR p_status NOT IN ('in_progress', 'resolved', 'closed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TICKET_REPLY';
  END IF;

  SELECT to_jsonb(t) INTO v_before FROM public.support_tickets t
  WHERE t.id = p_ticket_id FOR UPDATE;
  IF v_before IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'TICKET_NOT_FOUND'; END IF;

  INSERT INTO public.ticket_replies(ticket_id, user_id, body, is_admin)
  VALUES (p_ticket_id, auth.uid(), trim(p_body), TRUE)
  RETURNING id INTO v_reply_id;

  UPDATE public.support_tickets
  SET status = p_status,
      resolved_at = CASE WHEN p_status IN ('resolved','closed') THEN NOW() ELSE NULL END,
      resolved_by = CASE WHEN p_status IN ('resolved','closed') THEN auth.uid() ELSE NULL END
  WHERE id = p_ticket_id;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), 'reply_and_update_ticket', 'support_ticket', p_ticket_id,
    v_before, jsonb_build_object('reply_id', v_reply_id, 'status', p_status));
  RETURN v_reply_id;
END;
$$;

-- ================================================================
-- BẢNG place_reports
-- ================================================================
CREATE TABLE IF NOT EXISTS public.place_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    UUID NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL CHECK (reason IN ('wrong_hours','place_closed','wrong_image','wrong_address','other')),
  note        TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  resolution_note TEXT CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_place_reports_status_created ON public.place_reports(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_place_reports_pending_user_place
  ON public.place_reports(place_id, reporter_id) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.admin_resolve_place_report(
  p_report_id UUID,
  p_status TEXT,
  p_resolution_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_before JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF p_status NOT IN ('resolved','dismissed')
     OR char_length(trim(COALESCE(p_resolution_note, ''))) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_REPORT_RESOLUTION';
  END IF;

  SELECT to_jsonb(r) INTO v_before FROM public.place_reports r
  WHERE r.id = p_report_id AND r.status = 'pending' FOR UPDATE;
  IF v_before IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PENDING_REPORT_NOT_FOUND'; END IF;

  UPDATE public.place_reports SET status = p_status, resolution_note = trim(p_resolution_note),
    resolved_at = NOW(), resolved_by = auth.uid() WHERE id = p_report_id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), 'resolve_place_report', 'place_report', p_report_id, v_before,
    jsonb_build_object('status', p_status, 'resolution_note', trim(p_resolution_note)));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_access(
  p_user_id UUID,
  p_role TEXT DEFAULT NULL,
  p_is_banned BOOLEAN DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before public.profiles%ROWTYPE;
  v_next_role TEXT;
  v_next_banned BOOLEAN;
  v_other_active_admins INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_REQUIRED';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('user','editor','admin') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ROLE';
  END IF;
  SELECT * INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'USER_NOT_FOUND'; END IF;

  v_next_role := COALESCE(p_role, v_before.role);
  v_next_banned := COALESCE(p_is_banned, v_before.is_banned);
  IF p_user_id = auth.uid() AND (v_next_role <> 'admin' OR v_next_banned) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CANNOT_REMOVE_OWN_ADMIN_ACCESS';
  END IF;

  IF v_before.role = 'admin' AND NOT v_before.is_banned
     AND (v_next_role <> 'admin' OR v_next_banned) THEN
    SELECT count(*) INTO v_other_active_admins FROM public.profiles
    WHERE id <> p_user_id AND role = 'admin' AND NOT is_banned;
    IF v_other_active_admins = 0 THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'LAST_ADMIN_REQUIRED';
    END IF;
  END IF;

  UPDATE public.profiles SET role = v_next_role, is_banned = v_next_banned WHERE id = p_user_id;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), 'set_user_access', 'profile', p_user_id,
    jsonb_build_object('role', v_before.role, 'is_banned', v_before.is_banned),
    jsonb_build_object('role', v_next_role, 'is_banned', v_next_banned));
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_account(p_confirmation TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL OR p_confirmation <> 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ACCOUNT_DELETE_NOT_CONFIRMED';
  END IF;
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id)
  VALUES (v_user_id, 'delete_own_account', 'profile', v_user_id);
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars' AND (storage.foldername(name))[1] = v_user_id::TEXT;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- ================================================================
-- VIP PLANS, SUBSCRIPTIONS & VERIFIED PAYMENT LEDGER
-- ================================================================
CREATE TABLE IF NOT EXISTS public.vip_plans (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   TEXT NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{2,49}$'),
  name                   TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description            TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
  billing_period         TEXT NOT NULL CHECK (billing_period IN ('month','year')),
  billing_interval       SMALLINT NOT NULL DEFAULT 1 CHECK (billing_interval BETWEEN 1 AND 12),
  apple_product_id       TEXT UNIQUE,
  google_product_id      TEXT UNIQUE,
  entitlements           JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(entitlements) = 'object'),
  sort_order             INTEGER NOT NULL DEFAULT 0,
  is_active              BOOLEAN NOT NULL DEFAULT FALSE,
  created_by             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (is_active = FALSE OR apple_product_id IS NOT NULL OR google_product_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.vip_subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                  UUID NOT NULL REFERENCES public.vip_plans(id),
  provider                 TEXT NOT NULL CHECK (provider IN ('app_store','play_store','admin_grant')),
  provider_subscription_id TEXT,
  status                   TEXT NOT NULL CHECK (status IN ('pending','active','grace_period','canceled','expired','refunded','revoked')),
  auto_renew               BOOLEAN NOT NULL DEFAULT FALSE,
  started_at               TIMESTAMPTZ NOT NULL,
  current_period_start     TIMESTAMPTZ NOT NULL,
  current_period_end       TIMESTAMPTZ NOT NULL,
  canceled_at              TIMESTAMPTZ,
  ended_at                 TIMESTAMPTZ,
  granted_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_note               TEXT CHECK (admin_note IS NULL OR char_length(admin_note) <= 1000),
  last_verified_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (current_period_end > current_period_start),
  CHECK (provider = 'admin_grant' OR provider_subscription_id IS NOT NULL),
  UNIQUE (provider, provider_subscription_id)
);

CREATE TABLE IF NOT EXISTS public.vip_transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id         UUID REFERENCES public.vip_subscriptions(id) ON DELETE SET NULL,
  plan_id                 UUID NOT NULL REFERENCES public.vip_plans(id),
  provider                TEXT NOT NULL CHECK (provider IN ('app_store','play_store','admin_grant')),
  provider_transaction_id TEXT,
  transaction_type        TEXT NOT NULL CHECK (transaction_type IN ('purchase','renewal','refund','revoke','admin_extension')),
  amount_minor            BIGINT CHECK (amount_minor IS NULL OR amount_minor >= 0),
  currency                TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  status                  TEXT NOT NULL CHECK (status IN ('pending','verified','failed','refunded','revoked')),
  purchased_at            TIMESTAMPTZ,
  verified_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (provider = 'admin_grant' OR provider_transaction_id IS NOT NULL),
  UNIQUE (provider, provider_transaction_id)
);

CREATE TABLE IF NOT EXISTS public.payment_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL CHECK (provider IN ('app_store','play_store')),
  provider_event_id TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  payload           JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','ignored','failed')),
  error_code        TEXT,
  received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at      TIMESTAMPTZ,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX idx_vip_subscriptions_user_period
  ON public.vip_subscriptions(user_id, current_period_end DESC);
CREATE INDEX idx_vip_subscriptions_provider_ref
  ON public.vip_subscriptions(provider, provider_subscription_id);
CREATE INDEX idx_vip_transactions_user_created
  ON public.vip_transactions(user_id, created_at DESC);

-- Entitlement là dữ liệu dẫn xuất từ subscription đã được backend/admin tin cậy ghi.
-- Client không được gọi hàm này hay tự sửa các cột VIP trong profiles.
CREATE OR REPLACE FUNCTION public.refresh_vip_entitlement(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT s.started_at, s.current_period_end
  INTO v_started_at, v_expires_at
  FROM public.vip_subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'grace_period', 'canceled')
    AND s.current_period_end > NOW()
  ORDER BY s.current_period_end DESC, s.created_at DESC
  LIMIT 1;

  UPDATE public.profiles
  SET vip_status = CASE WHEN v_expires_at IS NULL THEN 'free' ELSE 'vip' END,
      vip_started_at = v_started_at,
      vip_expires_at = v_expires_at,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_vip_entitlement_from_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_vip_entitlement(OLD.user_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_vip_entitlement(NEW.user_id);
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.refresh_vip_entitlement(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_vip_entitlement
AFTER INSERT OR UPDATE OR DELETE ON public.vip_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_vip_entitlement_from_subscription();

CREATE OR REPLACE FUNCTION public.admin_grant_vip(
  p_user_id UUID,
  p_plan_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.vip_plans%ROWTYPE;
  v_subscription_id UUID;
  v_period_end TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin role required'; END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 1000 THEN RAISE EXCEPTION 'Admin note is too long'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND is_banned = FALSE) THEN
    RAISE EXCEPTION 'Active user not found';
  END IF;

  SELECT * INTO v_plan FROM public.vip_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'VIP plan not found'; END IF;
  v_period_end := NOW() + make_interval(months => CASE
    WHEN v_plan.billing_period = 'year' THEN v_plan.billing_interval * 12
    ELSE v_plan.billing_interval
  END);

  INSERT INTO public.vip_subscriptions(
    user_id, plan_id, provider, status, auto_renew, started_at,
    current_period_start, current_period_end, granted_by, admin_note, last_verified_at
  ) VALUES (
    p_user_id, p_plan_id, 'admin_grant', 'active', FALSE, NOW(),
    NOW(), v_period_end, auth.uid(), NULLIF(trim(p_note), ''), NOW()
  ) RETURNING id INTO v_subscription_id;

  INSERT INTO public.vip_transactions(
    user_id, subscription_id, plan_id, provider, transaction_type,
    status, purchased_at, verified_at
  ) VALUES (
    p_user_id, v_subscription_id, p_plan_id, 'admin_grant', 'admin_extension',
    'verified', NOW(), NOW()
  );
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, after_data)
  VALUES (auth.uid(), 'grant_vip', 'vip_subscription', v_subscription_id,
    jsonb_build_object('user_id', p_user_id, 'plan_id', p_plan_id, 'period_end', v_period_end, 'note', p_note));
  RETURN v_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_vip(
  p_subscription_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.vip_subscriptions%ROWTYPE;
  v_plan public.vip_plans%ROWTYPE;
  v_new_end TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin role required'; END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 1000 THEN RAISE EXCEPTION 'Admin note is too long'; END IF;
  SELECT * INTO v_subscription FROM public.vip_subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND OR v_subscription.provider <> 'admin_grant' THEN RAISE EXCEPTION 'Admin grant not found'; END IF;
  IF v_subscription.status IN ('refunded', 'revoked') THEN RAISE EXCEPTION 'Revoked grant cannot be extended'; END IF;
  SELECT * INTO v_plan FROM public.vip_plans WHERE id = v_subscription.plan_id;
  v_new_end := GREATEST(v_subscription.current_period_end, NOW()) + make_interval(months => CASE
    WHEN v_plan.billing_period = 'year' THEN v_plan.billing_interval * 12
    ELSE v_plan.billing_interval
  END);

  UPDATE public.vip_subscriptions
  SET status = 'active', current_period_start = LEAST(current_period_start, NOW()),
      current_period_end = v_new_end, ended_at = NULL,
      admin_note = NULLIF(trim(p_note), ''), last_verified_at = NOW()
  WHERE id = p_subscription_id;
  INSERT INTO public.vip_transactions(user_id, subscription_id, plan_id, provider, transaction_type, status, purchased_at, verified_at)
  VALUES (v_subscription.user_id, p_subscription_id, v_subscription.plan_id, 'admin_grant', 'admin_extension', 'verified', NOW(), NOW());
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), 'extend_vip', 'vip_subscription', p_subscription_id,
    jsonb_build_object('period_end', v_subscription.current_period_end),
    jsonb_build_object('period_end', v_new_end, 'note', p_note));
  RETURN v_new_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_vip(
  p_subscription_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.vip_subscriptions%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin role required'; END IF;
  IF p_note IS NULL OR char_length(trim(p_note)) < 3 OR char_length(p_note) > 1000 THEN
    RAISE EXCEPTION 'A revoke reason between 3 and 1000 characters is required';
  END IF;
  SELECT * INTO v_subscription FROM public.vip_subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND OR v_subscription.provider <> 'admin_grant' THEN
    RAISE EXCEPTION 'Only an admin grant can be revoked here';
  END IF;
  UPDATE public.vip_subscriptions
  SET status = 'revoked', auto_renew = FALSE, ended_at = NOW(), admin_note = trim(p_note), last_verified_at = NOW()
  WHERE id = p_subscription_id;
  INSERT INTO public.vip_transactions(user_id, subscription_id, plan_id, provider, transaction_type, status, purchased_at, verified_at)
  VALUES (v_subscription.user_id, p_subscription_id, v_subscription.plan_id, 'admin_grant', 'revoke', 'revoked', NOW(), NOW());
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (auth.uid(), 'revoke_vip', 'vip_subscription', p_subscription_id,
    jsonb_build_object('status', v_subscription.status, 'period_end', v_subscription.current_period_end),
    jsonb_build_object('status', 'revoked', 'note', trim(p_note)));
END;
$$;

-- ================================================================
-- TRIGGER CHO updated_at TỔNG QUÁT
-- ================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles', 'places', 'itineraries', 'reviews', 'support_tickets', 'place_reports', 'ai_consultations', 'vip_plans', 'vip_subscriptions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', tbl);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', tbl);
  END LOOP;
END;
$$;

-- ================================================================
-- TRIGGER auth.users -> profiles
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
DECLARE
  v_display_name TEXT;
  v_avatar_url TEXT;
BEGIN
  v_display_name := left(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Du khách'), 80);
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  IF v_avatar_url IS NOT NULL AND (
    char_length(v_avatar_url) > 2048 OR v_avatar_url !~ '^https://'
  ) THEN
    v_avatar_url := NULL;
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url, terms_version, terms_accepted_at)
  VALUES (
    NEW.id, v_display_name, v_avatar_url,
    CASE WHEN NEW.raw_user_meta_data->>'terms_version' = '2026-08-12' THEN '2026-08-12' ELSE NULL END,
    CASE WHEN NEW.raw_user_meta_data->>'terms_version' = '2026-08-12' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reset schema public không xóa auth.users. Tạo lại profile cho các tài khoản
-- Auth đã tồn tại để người dùng không bị kẹt ở trạng thái thiếu hồ sơ.
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
  u.id,
  left(COALESCE(NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''), 'Du khách'), 80),
  CASE
    WHEN char_length(u.raw_user_meta_data->>'avatar_url') <= 2048
      AND u.raw_user_meta_data->>'avatar_url' ~ '^https://'
    THEN u.raw_user_meta_data->>'avatar_url'
    ELSE NULL
  END
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- RPC atomic create/update itinerary. Client không được ghi trực tiếp các bảng con.
-- ================================================================
CREATE OR REPLACE FUNCTION public.upsert_itinerary(
  p_payload JSONB,
  p_itinerary_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_itinerary_id UUID;
  v_updated_at TIMESTAMPTZ;
  v_existing_updated_at TIMESTAMPTZ;
  v_title TEXT;
  v_num_days INTEGER;
  v_num_people INTEGER;
  v_transport TEXT;
  v_start_date DATE;
  v_travel_style TEXT[];
  v_day JSONB;
  v_day_ordinal BIGINT;
  v_day_id UUID;
  v_slot JSONB;
  v_slot_ordinal BIGINT;
  v_is_meal BOOLEAN;
  v_place_id UUID;
  v_place public.places%ROWTYPE;
  v_start_time TIME;
  v_duration_min INTEGER;
  v_start_min INTEGER;
  v_end_min INTEGER;
  v_previous_end_min INTEGER;
  v_real_slot_count INTEGER;
  v_distinct_place_count INTEGER;
  v_open_min INTEGER;
  v_close_min INTEGER;
  v_day_date DATE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_account() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ACCOUNT_NOT_ACTIVE';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object'
     OR octet_length(p_payload::TEXT) > 250000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITINERARY_PAYLOAD';
  END IF;

  v_title := trim(COALESCE(p_payload->>'title', ''));
  v_num_days := (p_payload->>'num_days')::INTEGER;
  v_num_people := (p_payload->>'num_people')::INTEGER;
  v_transport := p_payload->>'transport';
  v_start_date := CASE
    WHEN NULLIF(p_payload->>'start_date', '') IS NULL THEN NULL
    ELSE (p_payload->>'start_date')::DATE
  END;
  SELECT COALESCE(array_agg(value), '{}') INTO v_travel_style
  FROM jsonb_array_elements_text(COALESCE(p_payload->'travel_style', '[]'::JSONB));

  IF char_length(v_title) NOT BETWEEN 1 AND 120
     OR v_num_days NOT BETWEEN 1 AND 10
     OR v_num_people NOT BETWEEN 1 AND 30
     OR v_start_date IS NULL
     OR v_transport NOT IN ('motorbike','car','walk','bicycle') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITINERARY_FIELDS';
  END IF;
  IF p_itinerary_id IS NULL
     AND v_start_date < (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'START_DATE_IN_PAST';
  END IF;
  IF NOT (v_travel_style <@ ARRAY['beach','mountain','history','food','entertainment','photo','relax','adventure','culture','family']::TEXT[]) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TRAVEL_STYLE';
  END IF;
  IF cardinality(v_travel_style) > 10
     OR cardinality(v_travel_style) <> (
       SELECT count(DISTINCT style) FROM unnest(v_travel_style) style
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_TRAVEL_STYLE';
  END IF;
  IF jsonb_typeof(p_payload->'days') <> 'array'
     OR jsonb_array_length(p_payload->'days') <> v_num_days THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DAYS_PAYLOAD';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_payload->'days') day
    WHERE jsonb_typeof(day) <> 'object'
      OR jsonb_typeof(day->'slots') <> 'array'
      OR jsonb_array_length(day->'slots') > 40
  ) OR (
    SELECT COALESCE(sum(jsonb_array_length(day->'slots')), 0)
    FROM jsonb_array_elements(p_payload->'days') day
  ) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_ITINERARY_SLOTS';
  END IF;

  SELECT count(*), count(DISTINCT slot->>'place_id')
  INTO v_real_slot_count, v_distinct_place_count
  FROM jsonb_array_elements(p_payload->'days') day
  CROSS JOIN LATERAL jsonb_array_elements(day->'slots') slot
  WHERE COALESCE(slot->>'is_meal', 'false') = 'false';
  IF v_real_slot_count NOT BETWEEN 1 AND 40
     OR v_distinct_place_count <> v_real_slot_count THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_PLACE_SELECTION';
  END IF;

  IF p_itinerary_id IS NULL THEN
    INSERT INTO public.itineraries(
      user_id, title, description, cover_image_url, num_days, start_date,
      transport, travel_style, num_people, status
    ) VALUES (
      auth.uid(), v_title, NULLIF(trim(p_payload->>'description'), ''),
      NULLIF(p_payload->>'cover_image_url', ''), v_num_days, v_start_date,
      v_transport, v_travel_style, v_num_people, 'draft'
    ) RETURNING id, updated_at INTO v_itinerary_id, v_updated_at;
  ELSE
    SELECT updated_at INTO v_existing_updated_at
    FROM public.itineraries
    WHERE id = p_itinerary_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ITINERARY_NOT_OWNED';
    END IF;
    IF NULLIF(p_payload->>'expected_updated_at', '') IS NOT NULL
       AND v_existing_updated_at IS DISTINCT FROM (p_payload->>'expected_updated_at')::TIMESTAMPTZ THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'ITINERARY_EDIT_CONFLICT';
    END IF;

    UPDATE public.itineraries SET
      title = v_title,
      description = NULLIF(trim(p_payload->>'description'), ''),
      cover_image_url = NULLIF(p_payload->>'cover_image_url', ''),
      num_days = v_num_days,
      start_date = v_start_date,
      transport = v_transport,
      travel_style = v_travel_style,
      num_people = v_num_people
    WHERE id = p_itinerary_id
    RETURNING id, updated_at INTO v_itinerary_id, v_updated_at;

    DELETE FROM public.itinerary_days WHERE itinerary_id = v_itinerary_id;
  END IF;

  FOR v_day, v_day_ordinal IN
    SELECT value, ordinality FROM jsonb_array_elements(p_payload->'days') WITH ORDINALITY
  LOOP
    v_day_date := v_start_date + (v_day_ordinal::INTEGER - 1);
    IF COALESCE((v_day->>'day_number')::INTEGER, 0) <> v_day_ordinal
       OR jsonb_typeof(COALESCE(v_day->'advice', '[]'::JSONB)) <> 'array'
       OR octet_length(COALESCE(v_day->'advice', '[]'::JSONB)::TEXT) > 20000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_DAY_ORDER';
    END IF;
    INSERT INTO public.itinerary_days (
      itinerary_id, day_number, date, title, note,
      weather_score, weather_summary, advice
    ) VALUES (
      v_itinerary_id,
      v_day_ordinal,
      v_day_date,
      NULLIF(v_day->>'title', ''),
      NULLIF(v_day->>'note', ''),
      NULLIF(v_day->>'weather_score', '')::INTEGER,
      NULLIF(v_day->>'weather_summary', ''),
      COALESCE(v_day->'advice', '[]'::jsonb)
    )
    RETURNING id INTO v_day_id;

    v_previous_end_min := NULL;
    FOR v_slot, v_slot_ordinal IN
      SELECT value, ordinality FROM jsonb_array_elements(v_day->'slots') WITH ORDINALITY
    LOOP
      IF jsonb_typeof(v_slot) <> 'object'
         OR COALESCE((v_slot->>'order_index')::INTEGER, -1) <> v_slot_ordinal - 1
         OR COALESCE(v_slot->>'start_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         OR COALESCE(v_slot->>'is_meal', 'false') NOT IN ('true','false') THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_SLOT_PAYLOAD';
      END IF;

      v_is_meal := COALESCE((v_slot->>'is_meal')::BOOLEAN, FALSE);
      v_start_time := (v_slot->>'start_time')::TIME;
      v_duration_min := COALESCE((v_slot->>'duration_min')::INTEGER, 60);
      v_start_min := EXTRACT(HOUR FROM v_start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM v_start_time)::INTEGER;
      v_end_min := v_start_min + v_duration_min;
      IF v_duration_min NOT BETWEEN 5 AND 720
         OR v_start_min < 480 OR v_end_min > 1260
         OR (v_previous_end_min IS NOT NULL AND v_start_min < v_previous_end_min) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ITINERARY_SLOT_TIME_CONFLICT';
      END IF;
      v_previous_end_min := v_end_min;

      IF v_is_meal THEN
        v_place_id := NULL;
        v_place := NULL;
        IF char_length(trim(COALESCE(v_slot->>'place_name', ''))) NOT BETWEEN 1 AND 160 THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_MEAL_NAME';
        END IF;
      ELSE
        v_place_id := (v_slot->>'place_id')::UUID;
        SELECT * INTO v_place FROM public.places
        WHERE id = v_place_id AND is_active AND content_status = 'published';
        IF NOT FOUND THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PLACE_NOT_AVAILABLE';
        END IF;
        IF array_length(v_place.opening_days, 1) IS NOT NULL
           AND NOT (EXTRACT(ISODOW FROM v_day_date)::INTEGER = ANY(v_place.opening_days)) THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PLACE_CLOSED_ON_DAY';
        END IF;
        v_open_min := EXTRACT(HOUR FROM v_place.opening_time)::INTEGER * 60
          + EXTRACT(MINUTE FROM v_place.opening_time)::INTEGER;
        v_close_min := EXTRACT(HOUR FROM v_place.closing_time)::INTEGER * 60
          + EXTRACT(MINUTE FROM v_place.closing_time)::INTEGER;
        IF v_open_min <> v_close_min AND (
          (v_open_min < v_close_min AND (v_start_min < v_open_min OR v_end_min > v_close_min))
          OR (v_open_min > v_close_min AND NOT (
            (v_start_min >= v_open_min AND v_end_min <= 1440)
            OR (v_start_min < v_close_min AND v_end_min <= v_close_min)
          ))
        ) THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PLACE_CLOSED_AT_TIME';
        END IF;
      END IF;

      INSERT INTO public.itinerary_slots (
        day_id, place_id, place_name, place_image_url, place_category,
        order_index, start_time, duration_min, travel_time_min,
        transport_mode, weather_score, weather_note, rain_at_hour, is_meal, is_indoor
      ) VALUES (
        v_day_id,
        v_place_id,
        CASE WHEN v_is_meal THEN trim(v_slot->>'place_name') ELSE v_place.name END,
        CASE WHEN v_is_meal THEN NULL ELSE v_place.image_urls[1] END,
        CASE WHEN v_is_meal THEN NULL ELSE v_place.category END,
        v_slot_ordinal - 1,
        v_start_time,
        v_duration_min,
        COALESCE((v_slot->>'travel_time_min')::INTEGER, 0),
        v_transport,
        NULLIF(v_slot->>'weather_score', '')::INTEGER,
        NULLIF(v_slot->>'weather_note', ''),
        NULLIF(v_slot->>'rain_at_hour', '')::REAL,
        v_is_meal,
        CASE WHEN v_is_meal THEN TRUE ELSE COALESCE((v_slot->>'is_indoor')::BOOLEAN, FALSE) END
      );
    END LOOP;
  END LOOP;

  SELECT updated_at INTO v_updated_at FROM public.itineraries WHERE id = v_itinerary_id;
  RETURN jsonb_build_object('id', v_itinerary_id, 'updated_at', v_updated_at);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_itinerary(JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_itinerary(JSONB, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.search_places(TEXT, TEXT[], TEXT[], INTEGER, DECIMAL, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_places(TEXT, TEXT[], TEXT[], INTEGER, DECIMAL, BOOLEAN, INTEGER, INTEGER) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_system_fields_unchanged(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, DATE, TEXT, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_system_fields_unchanged(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, DATE, TEXT, TIMESTAMPTZ, BOOLEAN, TIMESTAMPTZ) TO authenticated;
REVOKE ALL ON FUNCTION public.refresh_vip_entitlement(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_vip_entitlement_from_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_ticket_after_reply() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_grant_vip(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_extend_vip(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_vip(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_extend_vip(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_vip(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.enable_itinerary_share(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_itinerary_share(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_itinerary_voting(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vote_shared_itinerary(TEXT, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_votes(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reply_and_resolve_ticket(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_resolve_place_report(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_access(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_account(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_moderate_review(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_moderate_place(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enable_itinerary_share(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_itinerary_share(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_itinerary_voting(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_shared_itinerary(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_votes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reply_and_resolve_ticket(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_place_report(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_access(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_review(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_place(UUID, TEXT, TEXT) TO authenticated;

-- ================================================================
-- ROW LEVEL SECURITY (RLS) & PHÂN QUYỀN V2 (An toàn hơn)
-- ================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Cấp quyền tường minh; bảng mới không tự động lộ cho client.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.places, public.reviews, public.vip_plans TO anon;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.places TO authenticated;
GRANT SELECT, DELETE ON public.itineraries TO authenticated;
GRANT SELECT ON public.itinerary_days, public.itinerary_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.review_helpful, public.saved_places TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_consultations TO authenticated;
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.ticket_replies TO authenticated;
GRANT SELECT, INSERT ON public.place_reports TO authenticated;
GRANT SELECT ON public.vip_plans, public.vip_subscriptions, public.vip_transactions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vip_plans, public.vip_subscriptions, public.vip_transactions TO authenticated;
GRANT SELECT ON public.place_revisions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Xóa các policy cũ để ghi đè (Tránh lỗi do policy name trùng khi chạy lại)
DO $$
DECLARE
  tbl  TEXT;
  stmt TEXT;
BEGIN
  FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    SELECT string_agg(
      format('DROP POLICY IF EXISTS %I ON public.%I;', policyname, tablename),
      ' '
    )
    INTO stmt
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl;

    IF stmt IS NOT NULL AND length(stmt) > 0 THEN
      EXECUTE stmt;
    END IF;
  END LOOP;
END;
$$;

-- 1. profiles
CREATE POLICY "View own profile or admin list" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND public.profile_system_fields_unchanged(
    id, role, vip_status, vip_started_at, vip_expires_at, ai_msg_count, ai_msg_reset_date,
    terms_version, terms_accepted_at, is_banned, created_at
  ));

-- 2. places
CREATE POLICY "Published places viewable" ON public.places FOR SELECT
  USING ((is_active AND content_status = 'published') OR public.is_editor());
CREATE POLICY "Editor create places" ON public.places FOR INSERT TO authenticated WITH CHECK (public.is_editor());
CREATE POLICY "Editor update places" ON public.places FOR UPDATE TO authenticated USING (public.is_editor()) WITH CHECK (public.is_editor());
CREATE POLICY "Admin delete places" ON public.places FOR DELETE TO authenticated USING (public.is_admin());

-- 3. itineraries
CREATE POLICY "Owners view itineraries" ON public.itineraries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Owners delete itineraries" ON public.itineraries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. itinerary_days
CREATE POLICY "Owners view days" ON public.itinerary_days FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.itineraries WHERE id = itinerary_id AND user_id = auth.uid()));

-- 5. itinerary_slots. Shared data and votes are exposed only through token RPCs.
CREATE POLICY "Owners view slots" ON public.itinerary_slots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.itinerary_days d JOIN public.itineraries i ON i.id = d.itinerary_id
    WHERE d.id = day_id AND i.user_id = auth.uid()
  ));

-- 6. reviews & helpful
CREATE POLICY "Visible reviews viewable" ON public.reviews FOR SELECT
  USING (NOT is_flagged OR user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Insert reviews for published places" ON public.reviews FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND public.is_active_account()
  AND EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.is_active AND p.content_status = 'published')
);
CREATE POLICY "Update own reviews" ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND public.is_active_account()
    AND EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.is_active AND p.content_status = 'published')
  );
CREATE POLICY "Delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "View own helpful votes" ON public.review_helpful FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert helpful on others reviews" ON public.review_helpful FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND public.is_active_account()
  AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.user_id <> auth.uid())
);
CREATE POLICY "Delete own helpful" ON public.review_helpful FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. saved_places
CREATE POLICY "View own saved places" ON public.saved_places FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Save published places" ON public.saved_places FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND public.is_active_account()
  AND EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.is_active AND p.content_status = 'published')
);
CREATE POLICY "Delete own saved places" ON public.saved_places FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. support_tickets & replies
CREATE POLICY "View own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Insert own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_active_account());

CREATE POLICY "View own replies" ON public.ticket_replies FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid()) OR public.is_admin());
CREATE POLICY "Users reply to own open tickets" ON public.ticket_replies FOR INSERT WITH CHECK (
  user_id = auth.uid() AND public.is_active_account()
  AND is_admin = FALSE
  AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid() AND t.status NOT IN ('resolved','closed'))
);

-- 9. place_reports
CREATE POLICY "View reports" ON public.place_reports FOR SELECT USING (reporter_id = auth.uid() OR public.is_admin());
CREATE POLICY "Insert reports" ON public.place_reports FOR INSERT WITH CHECK (
  reporter_id = auth.uid() AND public.is_active_account()
  AND status = 'pending' AND resolution_note IS NULL AND resolved_at IS NULL AND resolved_by IS NULL
  AND EXISTS (SELECT 1 FROM public.places p WHERE p.id = place_id AND p.is_active AND p.content_status = 'published')
);

-- 10. ai_consultations
CREATE POLICY "View own AI sessions" ON public.ai_consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own AI sessions" ON public.ai_consultations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_active_account());
CREATE POLICY "Update own AI sessions" ON public.ai_consultations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND public.is_active_account());
CREATE POLICY "Delete own AI sessions" ON public.ai_consultations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 14. VIP catalog, subscriptions and transaction ledger
CREATE POLICY "Active VIP plans viewable" ON public.vip_plans FOR SELECT
  USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "Admin manage VIP plans" ON public.vip_plans FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "View own VIP subscriptions" ON public.vip_subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin manage VIP subscriptions" ON public.vip_subscriptions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "View own vip transactions" ON public.vip_transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admin manage vip transactions" ON public.vip_transactions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- payment_events chứa payload xác minh từ provider: chỉ service_role/backend được truy cập.
REVOKE ALL ON public.payment_events FROM anon, authenticated;

-- 15. immutable editorial history
CREATE POLICY "Editorial team view revisions" ON public.place_revisions
  FOR SELECT TO authenticated USING (public.is_editor());
REVOKE INSERT, UPDATE, DELETE ON public.place_revisions FROM anon, authenticated;
GRANT SELECT ON public.place_revisions TO authenticated;

-- Function execution is deny-by-default. Explicit role grants above remain valid.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.immutable_unaccent(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_editor() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_account() TO authenticated;

-- Prevent future objects from silently inheriting broad PostgREST privileges.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
