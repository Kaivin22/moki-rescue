CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Dedicated login for the Spring API. The installer must set its password
-- separately; rerunning this schema never overwrites an existing password.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'motorescue_api') THEN
    CREATE ROLE motorescue_api
      LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
  ELSE
    ALTER ROLE motorescue_api
      LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
  END IF;
END;
$$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Người dùng' CHECK (char_length(display_name) BETWEEN 1 AND 80),
  avatar_path TEXT CHECK (avatar_path IS NULL OR char_length(avatar_path) <= 500),
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'provider', 'dispatcher', 'admin')),
  locale TEXT NOT NULL DEFAULT 'vi' CHECK (locale IN ('vi', 'en')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  terms_version TEXT CHECK (terms_version IS NULL OR char_length(terms_version) BETWEEN 1 AND 30),
  terms_accepted_at TIMESTAMPTZ,
  deletion_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((terms_version IS NULL) = (terms_accepted_at IS NULL))
);

COMMENT ON TABLE public.profiles IS
  'Hồ sơ tối thiểu. Email/số điện thoại và danh tính xác thực chỉ nằm trong auth.users.';

CREATE TABLE public.rescue_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 2 AND 120),
  partner_reference TEXT NOT NULL UNIQUE CHECK (
    partner_reference = UPPER(partner_reference)
    AND partner_reference ~ '^[A-Z0-9][A-Z0-9._/-]{3,79}$'
  ),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'suspended')),
  hotline TEXT NOT NULL CHECK (hotline ~ '^\+[1-9][0-9]{7,14}$'),
  base_latitude DOUBLE PRECISION CHECK (base_latitude IS NULL OR base_latitude BETWEEN -90 AND 90),
  base_longitude DOUBLE PRECISION CHECK (base_longitude IS NULL OR base_longitude BETWEEN -180 AND 180),
  service_radius_km NUMERIC(5,2) NOT NULL DEFAULT 15 CHECK (service_radius_km > 0 AND service_radius_km <= 100),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((base_latitude IS NULL) = (base_longitude IS NULL)),
  CHECK (status <> 'verified' OR verified_at IS NOT NULL)
);

COMMENT ON COLUMN public.rescue_teams.partner_reference IS
  'Mã hồ sơ đối tác nội bộ dùng để đối soát quy trình phê duyệt ngoại tuyến; không chứa số giấy tờ định danh.';
COMMENT ON COLUMN public.rescue_teams.verified_by IS
  'Admin chịu trách nhiệm cho lần xác minh đang có hiệu lực; có thể rỗng nếu tài khoản admin đã bị xóa.';

CREATE TABLE public.team_verification_requirements (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]{2,39}$'),
  label_vi TEXT NOT NULL CHECK (char_length(label_vi) BETWEEN 2 AND 100),
  description_vi TEXT NOT NULL CHECK (char_length(description_vi) BETWEEN 2 AND 300),
  label_en TEXT NOT NULL CHECK (char_length(label_en) BETWEEN 2 AND 100),
  description_en TEXT NOT NULL CHECK (char_length(description_en) BETWEEN 2 AND 300),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 0 AND 1000)
);

INSERT INTO public.team_verification_requirements
  (code, label_vi, description_vi, label_en, description_en, sort_order)
VALUES
  ('partnership_verified', 'Quan hệ đối tác đã xác minh', 'Admin đã xác minh đơn vị được phép tham gia mạng lưới qua quy trình ngoại tuyến; ứng dụng không quản lý hồ sơ pháp lý.', 'Partnership verified', 'An admin verified offline that the unit may join the partner network; the app does not manage legal documents.', 10),
  ('representative_contact', 'Đầu mối đại diện', 'Đã xác nhận đầu mối chịu trách nhiệm và kênh liên hệ công việc của đơn vị.', 'Authorized contact', 'The responsible contact and the unit work channel were confirmed.', 20),
  ('service_hotline', 'Hotline vận hành', 'Đã gọi thử và xác nhận hotline có thể tiếp nhận liên hệ trong thời gian hoạt động.', 'Operations hotline', 'The hotline was tested and can receive calls during operating hours.', 30),
  ('service_area', 'Khu vực phục vụ', 'Đã thống nhất tâm hoạt động và bán kính nhận ca thực tế của đội.', 'Service area', 'The operating base and practical service radius were agreed.', 40),
  ('capability_equipment', 'Năng lực và thiết bị', 'Đã đối chiếu loại sự cố đội nhận xử lý với phương tiện, dụng cụ hiện có.', 'Capability and equipment', 'Supported incident types were checked against available vehicles and equipment.', 50),
  ('provider_roster', 'Danh sách cứu hộ viên', 'Đã đối chiếu danh sách tài khoản cứu hộ viên do đơn vị xác nhận; không lưu bản sao giấy tờ cá nhân.', 'Provider roster', 'Provider accounts confirmed by the unit were checked; no identity-document copies are stored.', 60);

CREATE TABLE public.team_verification_checks (
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE CASCADE,
  requirement_code TEXT NOT NULL REFERENCES public.team_verification_requirements(code) ON DELETE RESTRICT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT CHECK (note IS NULL OR char_length(note) BETWEEN 5 AND 300),
  checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, requirement_code),
  CHECK (completed = (checked_at IS NOT NULL))
);

COMMENT ON TABLE public.team_verification_checks IS
  'Chỉ lưu kết quả checklist và ghi chú tối thiểu; không lưu tài liệu pháp lý hoặc giấy tờ nhận dạng.';

CREATE TABLE public.service_types (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]{2,39}$'),
  label_vi TEXT NOT NULL CHECK (char_length(label_vi) BETWEEN 2 AND 80),
  description_vi TEXT NOT NULL CHECK (char_length(description_vi) BETWEEN 2 AND 300),
  label_en TEXT NOT NULL CHECK (char_length(label_en) BETWEEN 2 AND 80),
  description_en TEXT NOT NULL CHECK (char_length(description_en) BETWEEN 2 AND 300),
  icon_name TEXT NOT NULL CHECK (icon_name IN (
    'construct-outline', 'battery-dead-outline', 'flash-outline',
    'water-outline', 'build-outline', 'trail-sign-outline'
  )),
  requires_quote BOOLEAN NOT NULL DEFAULT FALSE,
  requires_destination BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 0 AND 1000),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.service_types
  (code, label_vi, description_vi, label_en, description_en, icon_name,
   requires_quote, requires_destination, sort_order)
VALUES
  ('flat_tire', 'Vá hoặc thay lốp', 'Lốp thủng, xì hơi hoặc cần thay săm/lốp tại chỗ.', 'Flat tire repair', 'Repair a puncture or replace a tube/tire at the pickup point.', 'construct-outline', FALSE, FALSE, 10),
  ('dead_battery', 'Hết ắc quy', 'Kích bình hoặc hỗ trợ kiểm tra ắc quy cho xe xăng.', 'Dead battery', 'Jump-start or inspect the battery of a gasoline motorcycle.', 'battery-dead-outline', FALSE, FALSE, 20),
  ('electric_battery', 'Xe điện hết pin', 'Hỗ trợ vận chuyển xe điện đến điểm sạc hoặc địa điểm phù hợp.', 'Electric bike out of charge', 'Transport an electric motorcycle to a suitable charging point.', 'flash-outline', TRUE, TRUE, 30),
  ('out_of_fuel', 'Hết xăng', 'Mang lượng nhiên liệu khẩn cấp đến vị trí xe gặp sự cố.', 'Out of fuel', 'Deliver a small emergency fuel supply to the pickup point.', 'water-outline', FALSE, FALSE, 40),
  ('minor_repair', 'Sửa chữa nhẹ', 'Kiểm tra và xử lý lỗi nhẹ có thể khắc phục an toàn tại chỗ.', 'Minor roadside repair', 'Inspect and handle a minor issue that can be repaired safely on site.', 'build-outline', TRUE, FALSE, 50),
  ('motorbike_transport', 'Chở xe cứu hộ', 'Vận chuyển xe máy đến cửa hàng hoặc địa điểm do khách chọn.', 'Motorcycle transport', 'Transport the motorcycle to a shop or another customer-selected location.', 'trail-sign-outline', TRUE, TRUE, 60);

CREATE TABLE public.service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 2 AND 120),
  boundary extensions.geography(POLYGON, 4326) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial operational coverage for the Da Nang launch. This polygon is business
-- configuration, not a UI constant; replace/refine it before a real deployment.
INSERT INTO public.service_zones(name, boundary)
VALUES (
  'Da Nang launch zone',
  extensions.ST_GeogFromText(
    'SRID=4326;POLYGON((107.8000 16.0500,107.8400 16.2000,108.0000 16.2800,108.1800 16.2200,108.3500 16.1200,108.3100 15.9600,108.2000 15.8400,108.0300 15.8700,107.8800 15.9400,107.8000 16.0500))'
  )
);

CREATE TABLE public.provider_members (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 80),
  contact_phone_e164 TEXT NOT NULL CHECK (contact_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'left')),
  is_available BOOLEAN NOT NULL DEFAULT FALSE,
  rescue_vehicle_label TEXT CHECK (rescue_vehicle_label IS NULL OR char_length(rescue_vehicle_label) <= 80),
  last_latitude DOUBLE PRECISION CHECK (last_latitude IS NULL OR last_latitude BETWEEN -90 AND 90),
  last_longitude DOUBLE PRECISION CHECK (last_longitude IS NULL OR last_longitude BETWEEN -180 AND 180),
  last_location extensions.geography(POINT, 4326),
  location_accuracy_m NUMERIC(8,2) CHECK (location_accuracy_m IS NULL OR location_accuracy_m BETWEEN 0 AND 1000),
  location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((last_latitude IS NULL) = (last_longitude IS NULL)),
  CHECK ((last_latitude IS NULL) = (location_accuracy_m IS NULL))
);

COMMENT ON TABLE public.provider_members IS
  'Chỉ lưu kết quả xác minh và trạng thái vận hành; giấy tờ gốc được xác minh ngoại tuyến.';
COMMENT ON COLUMN public.provider_members.contact_phone_e164 IS
  'Số liên hệ công việc do đơn vị vận hành xác minh; chỉ backend được trả về trong ca đang hoạt động.';

CREATE TABLE public.team_capabilities (
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL REFERENCES public.service_types(code) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, service_code)
);

CREATE TABLE public.rescue_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  service_code TEXT NOT NULL REFERENCES public.service_types(code) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN (
    'searching', 'offered', 'assigned', 'en_route', 'awaiting_arrival_confirmation',
    'arrived', 'diagnosing', 'awaiting_quote', 'quote_approved', 'repairing', 'transporting',
    'awaiting_completion', 'needs_dispatch', 'completed', 'cancelled', 'no_provider'
  )),
  vehicle_power_type TEXT NOT NULL CHECK (vehicle_power_type IN ('gasoline', 'electric', 'unknown')),
  vehicle_description TEXT CHECK (vehicle_description IS NULL OR char_length(vehicle_description) <= 160),
  pickup_area_label TEXT NOT NULL CHECK (char_length(pickup_area_label) BETWEEN 2 AND 160),
  pickup_note TEXT CHECK (pickup_note IS NULL OR char_length(pickup_note) <= 500),
  pickup_latitude DOUBLE PRECISION NOT NULL CHECK (pickup_latitude BETWEEN -90 AND 90),
  pickup_longitude DOUBLE PRECISION NOT NULL CHECK (pickup_longitude BETWEEN -180 AND 180),
  pickup_source TEXT NOT NULL CHECK (pickup_source IN ('gps', 'manual', 'geocoded')),
  pickup_accuracy_m NUMERIC(8,2) CHECK (pickup_accuracy_m IS NULL OR pickup_accuracy_m BETWEEN 0 AND 1000),
  pickup_location extensions.geography(POINT, 4326) NOT NULL,
  destination_area_label TEXT CHECK (
    destination_area_label IS NULL OR char_length(destination_area_label) BETWEEN 2 AND 160
  ),
  destination_note TEXT CHECK (destination_note IS NULL OR char_length(destination_note) <= 500),
  destination_latitude DOUBLE PRECISION CHECK (destination_latitude IS NULL OR destination_latitude BETWEEN -90 AND 90),
  destination_longitude DOUBLE PRECISION CHECK (destination_longitude IS NULL OR destination_longitude BETWEEN -180 AND 180),
  destination_location extensions.geography(POINT, 4326),
  safety_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_team_id UUID REFERENCES public.rescue_teams(id) ON DELETE RESTRICT,
  assigned_provider_id UUID REFERENCES public.provider_members(user_id) ON DELETE RESTRICT,
  road_distance_m INTEGER CHECK (road_distance_m IS NULL OR road_distance_m >= 0),
  eta_minutes INTEGER CHECK (eta_minutes IS NULL OR eta_minutes BETWEEN 0 AND 1440),
  routing_status TEXT NOT NULL DEFAULT 'pending' CHECK (routing_status IN ('pending', 'road', 'unavailable')),
  location_precision TEXT NOT NULL DEFAULT 'exact' CHECK (location_precision IN ('exact', 'approximate')),
  cancellation_code TEXT CHECK (cancellation_code IS NULL OR cancellation_code IN (
    'issue_resolved', 'changed_mind', 'wrong_location', 'duplicate_request',
    'provider_not_present', 'provider_unavailable', 'safety_issue',
    'customer_unreachable', 'duplicate_or_fraud', 'other'
  )),
  cancellation_stage TEXT CHECK (cancellation_stage IS NULL OR cancellation_stage IN (
    'pre_dispatch', 'assigned', 'en_route', 'arrival_disputed', 'reassignment', 'operational'
  )),
  cancellation_reason TEXT CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 300),
  is_late_cancellation BOOLEAN NOT NULL DEFAULT FALSE,
  provider_near_pickup_on_cancel BOOLEAN,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  work_type TEXT CHECK (work_type IS NULL OR work_type IN ('repair', 'transport')),
  customer_retry_count SMALLINT NOT NULL DEFAULT 0 CHECK (customer_retry_count BETWEEN 0 AND 10),
  last_customer_retry_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  offered_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, idempotency_key),
  CHECK ((assigned_team_id IS NULL) = (assigned_provider_id IS NULL)),
  CHECK (
    status NOT IN ('assigned', 'en_route', 'awaiting_arrival_confirmation', 'arrived', 'diagnosing',
      'awaiting_quote', 'quote_approved', 'repairing', 'transporting', 'awaiting_completion', 'completed')
    OR (assigned_team_id IS NOT NULL AND assigned_provider_id IS NOT NULL)
  ),
  CHECK (safety_acknowledged),
  CHECK (pickup_source <> 'gps' OR pickup_accuracy_m IS NOT NULL),
  CHECK (status <> 'repairing' OR work_type = 'repair'),
  CHECK (status <> 'transporting' OR work_type = 'transport'),
  CHECK (status NOT IN ('awaiting_completion', 'completed') OR work_type IS NOT NULL),
  CHECK (
    (destination_area_label IS NULL AND destination_latitude IS NULL
      AND destination_longitude IS NULL AND destination_location IS NULL)
    OR
    (destination_area_label IS NOT NULL AND destination_latitude IS NOT NULL
      AND destination_longitude IS NOT NULL AND destination_location IS NOT NULL)
  ),
  CHECK (work_type IS DISTINCT FROM 'transport' OR destination_location IS NOT NULL),
  CHECK (
    status = 'cancelled'
    OR (
      cancellation_code IS NULL AND cancellation_stage IS NULL AND cancellation_reason IS NULL
      AND NOT is_late_cancellation AND provider_near_pickup_on_cancel IS NULL AND cancelled_by IS NULL
    )
  ),
  CHECK (NOT is_late_cancellation OR cancellation_stage IN ('en_route', 'arrival_disputed')),
  CHECK (provider_near_pickup_on_cancel IS NULL OR cancellation_stage IN ('en_route', 'arrival_disputed'))
);

COMMENT ON TABLE public.rescue_requests IS
  'Vị trí chính xác chỉ hiển thị cho khách, cứu hộ viên được phân công và điều phối viên khi ca đang hoạt động.';

CREATE TABLE public.dispatch_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_members(user_id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  road_distance_m INTEGER NOT NULL CHECK (road_distance_m >= 0),
  eta_seconds INTEGER NOT NULL CHECK (eta_seconds >= 0),
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  UNIQUE (request_id, provider_id),
  CHECK (expires_at > offered_at)
);

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_members(user_id) ON DELETE RESTRICT,
  version SMALLINT NOT NULL CHECK (version > 0),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 2 AND 500),
  amount_vnd NUMERIC(12,0) NOT NULL CHECK (amount_vnd >= 0 AND amount_vnd <= 100000000),
  work_type TEXT NOT NULL CHECK (work_type IN ('repair', 'transport')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  UNIQUE (request_id, version)
);

CREATE TABLE public.request_status_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.case_attention_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code IN (
    'provider_start_timeout', 'provider_gps_stale', 'arrival_confirmation_overdue',
    'quote_decision_overdue', 'completion_confirmation_overdue', 'work_progress_overdue',
    'provider_withdrew', 'arrival_dispute', 'completion_dispute', 'customer_support_requested',
    'approved_work_start_overdue', 'customer_incident_reported'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  context_note TEXT CHECK (context_note IS NULL OR char_length(context_note) BETWEEN 5 AND 300),
  resolution_note TEXT CHECK (resolution_note IS NULL OR char_length(resolution_note) BETWEEN 5 AND 500),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CHECK (
    (status = 'open' AND resolved_at IS NULL AND resolution_note IS NULL)
    OR (status = 'resolved' AND resolved_at IS NOT NULL AND resolution_note IS NOT NULL)
  )
);

CREATE TABLE public.request_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('reject_arrival', 'reject_repair', 'reject_transport')),
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'provider_not_visible', 'wrong_meeting_point', 'cannot_contact_provider',
    'issue_persists', 'work_not_as_agreed', 'destination_not_reached', 'other'
  )),
  note TEXT CHECK (note IS NULL OR char_length(note) BETWEEN 5 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reason_code <> 'other' OR note IS NOT NULL),
  CHECK (
    (action = 'reject_arrival' AND reason_code IN (
      'provider_not_visible', 'wrong_meeting_point', 'cannot_contact_provider', 'other'))
    OR
    (action IN ('reject_repair', 'reject_transport') AND reason_code IN (
      'issue_persists', 'work_not_as_agreed', 'destination_not_reached', 'other'))
  )
);

CREATE TABLE public.provider_location_checkpoints (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.provider_members(user_id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m NUMERIC(8,2) NOT NULL CHECK (accuracy_m BETWEEN 0 AND 1000),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.provider_location_checkpoints IS
  'Dữ liệu tạm thời phục vụ ca đang hoạt động; phải xóa tự động sau thời hạn lưu trữ.';

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.provider_members(user_id) ON DELETE RESTRICT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_note TEXT CHECK (moderation_note IS NULL OR char_length(moderation_note) BETWEEN 5 AND 500),
  moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((moderated_by IS NULL) = (moderated_at IS NULL)),
  CHECK (NOT is_hidden OR (moderation_note IS NOT NULL AND moderated_at IS NOT NULL))
);

CREATE TABLE public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.provider_members(user_id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN (
    'provider_conduct', 'service_quality', 'safety', 'property_damage', 'other'
  )),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  resolution_note TEXT CHECK (resolution_note IS NULL OR char_length(resolution_note) BETWEEN 5 AND 500),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (request_id, customer_id, category),
  CHECK (
    (status = 'open' AND resolved_at IS NULL AND resolution_note IS NULL)
    OR (status <> 'open' AND resolved_at IS NOT NULL AND resolution_note IS NOT NULL)
  )
);

CREATE TABLE public.team_quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE RESTRICT,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'warned', 'resolved')),
  average_rating NUMERIC(3,2) NOT NULL CHECK (average_rating BETWEEN 1 AND 5),
  rating_count INTEGER NOT NULL CHECK (rating_count > 0),
  review_count_checkpoint INTEGER NOT NULL CHECK (review_count_checkpoint > 0),
  warning_number SMALLINT CHECK (warning_number IS NULL OR warning_number BETWEEN 1 AND 100),
  action_note TEXT CHECK (action_note IS NULL OR char_length(action_note) BETWEEN 5 AND 500),
  actioned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'open' AND actioned_at IS NULL) OR (status <> 'open' AND actioned_at IS NOT NULL)),
  CHECK (status <> 'warned' OR warning_number IS NOT NULL)
);

COMMENT ON TABLE public.team_quality_alerts IS
  'Tin hieu chat luong tu danh gia that. He thong tao co canh bao; admin xac minh va quyet dinh canh bao hoac dinh chi, khong tu dong khoa theo diem sao.';

CREATE TABLE public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  installation_id UUID NOT NULL UNIQUE,
  expo_push_token TEXT NOT NULL UNIQUE CHECK (char_length(expo_push_token) BETWEEN 10 AND 300),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.push_delivery_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_device_id UUID NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  expo_ticket_id TEXT NOT NULL UNIQUE CHECK (char_length(expo_ticket_id) BETWEEN 8 AND 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'expired')),
  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 20),
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  last_error_code TEXT CHECK (
    last_error_code IS NULL OR last_error_code ~ '^[A-Za-z][A-Za-z0-9_]{1,79}$'
  ),
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'pending' AND checked_at IS NULL)
    OR (status <> 'pending' AND checked_at IS NOT NULL)
  ),
  CHECK (status <> 'delivered' OR last_error_code IS NULL)
);

COMMENT ON TABLE public.push_delivery_receipts IS
  'Chỉ lưu ticket và trạng thái giao nhận tối thiểu; không lưu nội dung thông báo, token bản sao hoặc dữ liệu ca.';

CREATE TABLE public.audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  entity_type TEXT NOT NULL CHECK (char_length(entity_type) BETWEEN 2 AND 50),
  entity_id TEXT CHECK (entity_id IS NULL OR char_length(entity_id) <= 100),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.assistant_usage_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.api_rate_limit_windows (
  subject_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('mutation', 'location', 'assistant')),
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count BETWEEN 1 AND 10000),
  PRIMARY KEY (subject_id, category, window_start)
);

COMMENT ON TABLE public.assistant_usage_events IS
  'Chi luu moc thoi gian de gioi han quota tro ly; khong luu cau hoi, cau tra loi hay lich su hoi thoai.';

COMMENT ON TABLE public.audit_logs IS
  'Không ghi token, số điện thoại, tọa độ chính xác hoặc giấy tờ nhận dạng vào metadata.';

CREATE INDEX rescue_requests_customer_recent_idx ON public.rescue_requests(customer_id, requested_at DESC);
CREATE UNIQUE INDEX rescue_requests_one_active_customer_idx ON public.rescue_requests(customer_id)
  WHERE status NOT IN ('completed', 'cancelled');
CREATE UNIQUE INDEX rescue_requests_one_active_provider_idx ON public.rescue_requests(assigned_provider_id)
  WHERE assigned_provider_id IS NOT NULL AND status NOT IN ('completed', 'cancelled');
CREATE INDEX rescue_requests_active_idx ON public.rescue_requests(status, requested_at DESC)
  WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX service_zones_boundary_gix ON public.service_zones USING GIST(boundary)
  WHERE is_active;
CREATE INDEX rescue_requests_pickup_gix ON public.rescue_requests USING GIST(pickup_location);
CREATE INDEX rescue_requests_destination_gix ON public.rescue_requests USING GIST(destination_location)
  WHERE destination_location IS NOT NULL;
CREATE INDEX provider_members_available_idx ON public.provider_members(team_id, location_updated_at DESC)
  WHERE status = 'active' AND is_available;
CREATE INDEX provider_members_location_gix ON public.provider_members USING GIST(last_location);
CREATE INDEX dispatch_offers_provider_pending_idx ON public.dispatch_offers(provider_id, expires_at)
  WHERE status = 'pending';
CREATE INDEX request_status_events_request_idx ON public.request_status_events(request_id, created_at);
CREATE UNIQUE INDEX case_attention_flags_one_open_idx
  ON public.case_attention_flags(request_id, code) WHERE status = 'open';
CREATE INDEX case_attention_flags_open_idx
  ON public.case_attention_flags(detected_at, request_id) WHERE status = 'open';
CREATE INDEX request_feedback_events_request_idx
  ON public.request_feedback_events(request_id, created_at DESC);
CREATE INDEX provider_location_checkpoints_request_idx ON public.provider_location_checkpoints(request_id, recorded_at DESC);
CREATE INDEX reviews_provider_visible_idx ON public.reviews(provider_id) WHERE NOT is_hidden;
CREATE INDEX reviews_team_visible_idx ON public.reviews(team_id) WHERE NOT is_hidden;
CREATE INDEX incident_reports_open_idx ON public.incident_reports(created_at, request_id)
  WHERE status = 'open';
CREATE INDEX team_quality_alerts_team_recent_idx
  ON public.team_quality_alerts(team_id, created_at DESC);
CREATE UNIQUE INDEX team_quality_alerts_one_open_idx
  ON public.team_quality_alerts(team_id) WHERE status = 'open';
CREATE INDEX push_delivery_receipts_pending_idx
  ON public.push_delivery_receipts(next_check_at, id) WHERE status = 'pending';
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX assistant_usage_events_user_time_idx
  ON public.assistant_usage_events(user_id, created_at DESC);
CREATE INDEX api_rate_limit_windows_expiry_idx ON public.api_rate_limit_windows(window_start);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER rescue_teams_touch_updated_at BEFORE UPDATE ON public.rescue_teams
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER team_verification_checks_touch_updated_at BEFORE UPDATE ON public.team_verification_checks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER service_types_touch_updated_at BEFORE UPDATE ON public.service_types
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER service_zones_touch_updated_at BEFORE UPDATE ON public.service_zones
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER provider_members_touch_updated_at BEFORE UPDATE ON public.provider_members
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER rescue_requests_touch_updated_at BEFORE UPDATE ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER reviews_touch_updated_at BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.sync_provider_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.last_latitude IS NULL THEN
    NEW.last_location := NULL;
    NEW.location_updated_at := NULL;
  ELSIF TG_OP = 'INSERT'
    OR NEW.last_latitude IS DISTINCT FROM OLD.last_latitude
    OR NEW.last_longitude IS DISTINCT FROM OLD.last_longitude THEN
    NEW.last_location := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.last_longitude, NEW.last_latitude), 4326
    )::extensions.geography;
    NEW.location_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER provider_members_sync_location
BEFORE INSERT OR UPDATE OF last_latitude, last_longitude ON public.provider_members
FOR EACH ROW EXECUTE FUNCTION public.sync_provider_location();

CREATE OR REPLACE FUNCTION public.sync_request_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.pickup_location := extensions.ST_SetSRID(
    extensions.ST_MakePoint(NEW.pickup_longitude, NEW.pickup_latitude), 4326
  )::extensions.geography;
  IF NEW.destination_latitude IS NULL THEN
    NEW.destination_location := NULL;
  ELSE
    NEW.destination_location := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.destination_longitude, NEW.destination_latitude), 4326
    )::extensions.geography;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rescue_requests_sync_location
BEFORE INSERT OR UPDATE OF pickup_latitude, pickup_longitude, destination_latitude, destination_longitude
ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_request_location();

CREATE OR REPLACE FUNCTION public.validate_location_checkpoint()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.rescue_requests rr
    JOIN public.provider_members pm ON pm.user_id = NEW.provider_id
    WHERE rr.id = NEW.request_id
      AND rr.assigned_provider_id = NEW.provider_id
      AND rr.assigned_team_id = pm.team_id
      AND rr.status IN ('assigned', 'en_route', 'awaiting_arrival_confirmation', 'arrived',
        'diagnosing', 'awaiting_quote', 'quote_approved', 'repairing', 'transporting', 'awaiting_completion')
  ) THEN
    RAISE EXCEPTION 'LOCATION_CHECKPOINT_NOT_ALLOWED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER provider_location_checkpoints_validate
BEFORE INSERT ON public.provider_location_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.validate_location_checkpoint();

CREATE OR REPLACE FUNCTION public.validate_request_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.assigned_provider_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.provider_members pm
    WHERE pm.user_id = NEW.assigned_provider_id
      AND pm.team_id = NEW.assigned_team_id
      AND pm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'INVALID_PROVIDER_ASSIGNMENT' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rescue_requests_validate_assignment
BEFORE INSERT OR UPDATE OF assigned_team_id, assigned_provider_id ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_request_assignment();

CREATE OR REPLACE FUNCTION public.enforce_request_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  allowed BOOLEAN := FALSE;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  allowed := CASE OLD.status
    WHEN 'searching' THEN NEW.status IN ('offered', 'no_provider', 'cancelled')
    WHEN 'offered' THEN NEW.status IN ('assigned', 'searching', 'no_provider', 'cancelled')
    WHEN 'assigned' THEN NEW.status IN ('en_route', 'searching', 'needs_dispatch', 'cancelled')
    WHEN 'en_route' THEN NEW.status IN ('awaiting_arrival_confirmation', 'searching', 'needs_dispatch', 'cancelled')
    WHEN 'awaiting_arrival_confirmation' THEN NEW.status IN ('arrived', 'en_route', 'searching', 'needs_dispatch', 'cancelled')
    WHEN 'arrived' THEN NEW.status IN ('diagnosing', 'needs_dispatch', 'cancelled')
    WHEN 'diagnosing' THEN NEW.status IN ('awaiting_quote', 'repairing', 'transporting', 'needs_dispatch', 'cancelled')
    WHEN 'awaiting_quote' THEN NEW.status IN ('diagnosing', 'quote_approved', 'needs_dispatch', 'cancelled')
    WHEN 'quote_approved' THEN NEW.status IN ('repairing', 'transporting', 'needs_dispatch', 'cancelled')
    WHEN 'repairing' THEN NEW.status IN ('awaiting_completion', 'needs_dispatch', 'cancelled')
    WHEN 'transporting' THEN NEW.status IN ('awaiting_completion', 'needs_dispatch', 'cancelled')
    WHEN 'awaiting_completion' THEN
      NEW.status = 'completed'
      OR (OLD.work_type = 'repair' AND NEW.status = 'repairing')
      OR (OLD.work_type = 'transport' AND NEW.status = 'transporting')
      OR NEW.status = 'needs_dispatch'
      OR NEW.status = 'cancelled'
    WHEN 'no_provider' THEN NEW.status IN ('searching', 'cancelled')
    WHEN 'needs_dispatch' THEN NEW.status IN ('searching', 'cancelled')
    ELSE FALSE
  END;

  IF NOT allowed THEN
    RAISE EXCEPTION 'INVALID_REQUEST_TRANSITION_%_TO_%', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  NEW.version := OLD.version + 1;
  IF NEW.status = 'offered' THEN NEW.offered_at := COALESCE(NEW.offered_at, NOW()); END IF;
  IF NEW.status = 'assigned' THEN NEW.accepted_at := COALESCE(NEW.accepted_at, NOW()); END IF;
  IF NEW.status = 'arrived' THEN NEW.arrived_at := COALESCE(NEW.arrived_at, NOW()); END IF;
  IF NEW.status = 'completed' THEN NEW.completed_at := COALESCE(NEW.completed_at, NOW()); END IF;
  IF NEW.status = 'cancelled' THEN NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW()); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rescue_requests_enforce_state_machine
BEFORE UPDATE OF status ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_request_state_machine();

CREATE OR REPLACE FUNCTION public.record_request_status_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor UUID;
BEGIN
  BEGIN
    actor := NULLIF(current_setting('app.actor_id', TRUE), '')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    actor := NULL;
  END;
  actor := COALESCE(actor, auth.uid());

  INSERT INTO public.request_status_events(request_id, from_status, to_status, actor_id)
  VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END, NEW.status, actor);
  RETURN NEW;
END;
$$;

CREATE TRIGGER rescue_requests_record_initial_status
AFTER INSERT ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.record_request_status_event();
CREATE TRIGGER rescue_requests_record_status_change
AFTER UPDATE OF status ON public.rescue_requests
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.record_request_status_event();

CREATE OR REPLACE FUNCTION public.prevent_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'STATUS_EVENTS_ARE_APPEND_ONLY' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER request_status_events_immutable
BEFORE UPDATE OR DELETE ON public.request_status_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_event_mutation();

CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.rescue_requests rr
    WHERE rr.id = NEW.request_id
      AND rr.status = 'completed'
      AND rr.customer_id = NEW.customer_id
      AND rr.assigned_provider_id = NEW.provider_id
  ) THEN
    RAISE EXCEPTION 'REVIEW_REQUIRES_COMPLETED_ASSIGNED_REQUEST' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_validate_relationship
BEFORE INSERT OR UPDATE OF request_id, customer_id, team_id, provider_id ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_review();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  safe_name TEXT;
BEGIN
  safe_name := LEFT(TRIM(COALESCE(
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'full_name',
    'Người dùng'
  )), 80);
  IF safe_name = '' THEN safe_name := 'Người dùng'; END IF;

  INSERT INTO public.profiles(id, display_name, role, locale)
  VALUES (
    NEW.id,
    safe_name,
    'customer',
    CASE WHEN NEW.raw_user_meta_data ->> 'locale' = 'en' THEN 'en' ELSE 'vi' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Reset schema public không xóa auth.users. Backfill mọi tài khoản đã tồn tại và
-- cố ý đưa vai trò về customer; admin sẽ được bootstrap lại bằng script 03.
INSERT INTO public.profiles(id, display_name, role, locale)
SELECT
  user_row.id,
  COALESCE(NULLIF(LEFT(TRIM(COALESCE(
    user_row.raw_user_meta_data ->> 'display_name',
    user_row.raw_user_meta_data ->> 'full_name',
    'Người dùng'
  )), 80), ''), 'Người dùng'),
  'customer',
  CASE WHEN user_row.raw_user_meta_data ->> 'locale' = 'en' THEN 'en' ELSE 'vi' END
FROM auth.users AS user_row
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active
$$;

-- The mobile admin searches by the account's verified login phone instead of
-- copying a UUID. Only the backend login can execute this minimal, exact-match
-- lookup; phone numbers are never returned or written to audit metadata.
CREATE OR REPLACE FUNCTION public.api_lookup_account_by_phone(search_phone TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, role TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF search_phone IS NULL OR search_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'INVALID_ACCOUNT_PHONE' USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM auth.users user_account
    JOIN public.profiles profile ON profile.id = user_account.id
    WHERE user_account.phone = search_phone AND profile.is_active
  ) > 1 THEN
    RAISE EXCEPTION 'ACCOUNT_PHONE_NOT_UNIQUE' USING ERRCODE = '23505';
  END IF;

  RETURN QUERY
  SELECT profile.id, profile.display_name, profile.role
  FROM auth.users user_account
  JOIN public.profiles profile ON profile.id = user_account.id
  WHERE user_account.phone = search_phone
    AND profile.is_active;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_dispatch_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.current_profile_role() IN ('dispatcher', 'admin'), FALSE)
$$;

CREATE OR REPLACE FUNCTION public.can_view_request(target_request UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rescue_requests rr
    WHERE rr.id = target_request
      AND (
        rr.customer_id = auth.uid()
        OR rr.assigned_provider_id = auth.uid()
        OR public.is_dispatch_staff()
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(topic_name TEXT, wants_write BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  topic_kind TEXT;
  topic_id UUID;
BEGIN
  topic_kind := split_part(topic_name, ':', 1);
  BEGIN
    topic_id := split_part(topic_name, ':', 2)::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;

  IF topic_kind = 'user' THEN
    RETURN NOT wants_write AND topic_id = auth.uid();
  END IF;
  IF topic_kind <> 'request' THEN
    RETURN FALSE;
  END IF;
  IF NOT wants_write THEN
    RETURN public.can_view_request(topic_id);
  END IF;

  RETURN public.is_dispatch_staff() OR EXISTS (
    SELECT 1 FROM public.rescue_requests rr
    JOIN public.provider_members pm ON pm.user_id = auth.uid()
    WHERE rr.id = topic_id
      AND rr.assigned_provider_id = auth.uid()
      AND rr.status IN ('assigned', 'en_route', 'awaiting_arrival_confirmation', 'arrived',
        'diagnosing', 'awaiting_quote', 'quote_approved', 'repairing', 'transporting', 'awaiting_completion')
      AND pm.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.api_accept_dispatch_offer(
  actor_id UUID,
  offer_id UUID,
  expected_request_version INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_offer public.dispatch_offers%ROWTYPE;
  selected_request public.rescue_requests%ROWTYPE;
  locked_provider UUID;
BEGIN
  SELECT * INTO selected_offer
  FROM public.dispatch_offers
  WHERE id = offer_id AND provider_id = actor_id
  FOR UPDATE;

  IF NOT FOUND OR selected_offer.status <> 'pending' OR selected_offer.expires_at <= NOW() THEN
    RAISE EXCEPTION 'OFFER_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO selected_request
  FROM public.rescue_requests
  WHERE id = selected_offer.request_id
  FOR UPDATE;

  IF selected_request.status <> 'offered'
    OR selected_request.version <> expected_request_version THEN
    RAISE EXCEPTION 'REQUEST_ALREADY_CHANGED' USING ERRCODE = '40001';
  END IF;

  SELECT pm.user_id INTO locked_provider
  FROM public.provider_members pm
  JOIN public.profiles p ON p.id = pm.user_id
  JOIN public.rescue_teams rt ON rt.id = pm.team_id
  JOIN public.team_capabilities capability
    ON capability.team_id = pm.team_id
   AND capability.service_code = selected_request.service_code
   AND capability.is_active
  WHERE pm.user_id = actor_id
    AND pm.team_id = selected_offer.team_id
    AND p.role = 'provider'
    AND p.is_active
    AND pm.status = 'active'
    AND pm.is_available
    AND rt.status = 'verified'
  FOR UPDATE OF pm;

  IF locked_provider IS NULL THEN
    RAISE EXCEPTION 'PROVIDER_NOT_ELIGIBLE' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.actor_id', actor_id::TEXT, TRUE);

  UPDATE public.rescue_requests
  SET status = 'assigned',
      assigned_team_id = selected_offer.team_id,
      assigned_provider_id = selected_offer.provider_id,
      road_distance_m = selected_offer.road_distance_m,
      eta_minutes = CEIL(selected_offer.eta_seconds / 60.0)::INTEGER,
      routing_status = 'road'
  WHERE id = selected_offer.request_id;

  UPDATE public.dispatch_offers
  SET status = CASE WHEN id = selected_offer.id THEN 'accepted' ELSE 'withdrawn' END,
      responded_at = CASE WHEN id = selected_offer.id THEN NOW() ELSE responded_at END
  WHERE request_id = selected_offer.request_id AND status = 'pending';

  UPDATE public.provider_members SET is_available = FALSE WHERE user_id = actor_id;
  RETURN selected_offer.request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_location_checkpoints(retention INTERVAL DEFAULT INTERVAL '24 hours')
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  IF retention < INTERVAL '1 hour' OR retention > INTERVAL '30 days' THEN
    RAISE EXCEPTION 'INVALID_LOCATION_RETENTION';
  END IF;
  DELETE FROM public.provider_location_checkpoints
  WHERE recorded_at < NOW() - retention;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.minimize_closed_request_data(retention INTERVAL DEFAULT INTERVAL '30 days')
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  changed_count BIGINT;
BEGIN
  IF retention < INTERVAL '1 day' OR retention > INTERVAL '365 days' THEN
    RAISE EXCEPTION 'INVALID_REQUEST_RETENTION';
  END IF;
  UPDATE public.rescue_requests
  SET pickup_latitude = ROUND(pickup_latitude::NUMERIC, 2)::DOUBLE PRECISION,
      pickup_longitude = ROUND(pickup_longitude::NUMERIC, 2)::DOUBLE PRECISION,
      pickup_note = NULL,
      destination_latitude = CASE WHEN destination_latitude IS NULL THEN NULL
        ELSE ROUND(destination_latitude::NUMERIC, 2)::DOUBLE PRECISION END,
      destination_longitude = CASE WHEN destination_longitude IS NULL THEN NULL
        ELSE ROUND(destination_longitude::NUMERIC, 2)::DOUBLE PRECISION END,
      destination_note = NULL,
      vehicle_description = NULL,
      location_precision = 'approximate'
  WHERE status IN ('completed', 'cancelled')
    AND location_precision = 'exact'
    AND COALESCE(completed_at, cancelled_at, updated_at) < NOW() - retention;
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_assistant_usage_events(retention INTERVAL DEFAULT INTERVAL '2 days')
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  IF retention < INTERVAL '1 day' OR retention > INTERVAL '30 days' THEN
    RAISE EXCEPTION 'INVALID_ASSISTANT_USAGE_RETENTION';
  END IF;
  DELETE FROM public.assistant_usage_events
  WHERE created_at < NOW() - retention;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_push_delivery_receipts(retention INTERVAL DEFAULT INTERVAL '2 days')
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  IF retention < INTERVAL '1 day' OR retention > INTERVAL '30 days' THEN
    RAISE EXCEPTION 'INVALID_PUSH_RECEIPT_RETENTION';
  END IF;
  DELETE FROM public.push_delivery_receipts
  WHERE created_at < NOW() - retention;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_dispatch_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.api_accept_dispatch_offer(UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_location_checkpoints(INTERVAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.minimize_closed_request_data(INTERVAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_assistant_usage_events(INTERVAL) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_push_delivery_receipts(INTERVAL) TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_verification_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_attention_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_location_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_quality_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limit_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid() AND is_active)
WITH CHECK (id = auth.uid() AND is_active);

CREATE POLICY teams_select_verified_or_staff ON public.rescue_teams
FOR SELECT TO authenticated
USING (status = 'verified' OR public.is_dispatch_staff());
CREATE POLICY team_verification_requirements_no_client_access ON public.team_verification_requirements
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY team_verification_checks_no_client_access ON public.team_verification_checks
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY service_types_select_active ON public.service_types
FOR SELECT TO authenticated
USING (is_active OR public.is_dispatch_staff());
CREATE POLICY service_zones_no_client_access ON public.service_zones
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY provider_members_select_own_or_staff ON public.provider_members
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_dispatch_staff());
CREATE POLICY capabilities_select_authenticated ON public.team_capabilities
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY requests_select_participants ON public.rescue_requests
FOR SELECT TO authenticated
USING (public.can_view_request(id));
CREATE POLICY offers_select_recipient_or_staff ON public.dispatch_offers
FOR SELECT TO authenticated
USING (provider_id = auth.uid() OR public.is_dispatch_staff());
CREATE POLICY quotes_select_participants ON public.quotes
FOR SELECT TO authenticated
USING (public.can_view_request(request_id));
CREATE POLICY status_events_select_participants ON public.request_status_events
FOR SELECT TO authenticated
USING (public.can_view_request(request_id));
CREATE POLICY case_attention_flags_no_client_access ON public.case_attention_flags
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY request_feedback_events_no_client_access ON public.request_feedback_events
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY locations_select_participants ON public.provider_location_checkpoints
FOR SELECT TO authenticated
USING (public.can_view_request(request_id));
CREATE POLICY reviews_select_authenticated ON public.reviews
FOR SELECT TO authenticated
USING (NOT is_hidden OR customer_id = auth.uid() OR provider_id = auth.uid() OR public.is_dispatch_staff());
CREATE POLICY incident_reports_no_client_access ON public.incident_reports
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY team_quality_alerts_no_client_access ON public.team_quality_alerts
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY push_devices_select_own ON public.push_devices
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY push_delivery_receipts_no_client_access ON public.push_delivery_receipts
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY audit_logs_select_staff ON public.audit_logs
FOR SELECT TO authenticated USING (public.is_dispatch_staff());
-- Deliberately deny PostgREST clients. The backend role bypasses RLS and has
-- only SELECT/INSERT on this quota table.
CREATE POLICY assistant_usage_no_client_access ON public.assistant_usage_events
FOR SELECT TO authenticated USING (FALSE);
CREATE POLICY api_rate_limit_windows_no_client_access ON public.api_rate_limit_windows
FOR SELECT TO authenticated USING (FALSE);

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- Mobile only reads/updates its minimal profile through PostgREST. All rescue,
-- dispatch, quote, location and operator reads go through the authenticated API.
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_path, locale, terms_version, terms_accepted_at)
  ON public.profiles TO authenticated;

-- Spring API least-privilege grants. BYPASSRLS is needed because JWT identity
-- is validated by Spring Security, not by PostgREST/auth.uid(). It does not
-- grant any table, schema-owner or DDL privilege by itself.
REVOKE ALL ON SCHEMA public FROM motorescue_api;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM motorescue_api;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM motorescue_api;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM motorescue_api;
GRANT USAGE ON SCHEMA public TO motorescue_api;
GRANT USAGE ON SCHEMA extensions TO motorescue_api;
GRANT SELECT ON public.profiles TO motorescue_api;
GRANT UPDATE (role, is_active, deletion_requested_at) ON public.profiles TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.rescue_teams TO motorescue_api;
GRANT SELECT ON public.team_verification_requirements TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.team_verification_checks TO motorescue_api;
GRANT SELECT, UPDATE ON public.service_types TO motorescue_api;
GRANT SELECT ON public.service_zones TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.provider_members TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.team_capabilities TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.rescue_requests TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.dispatch_offers TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.quotes TO motorescue_api;
GRANT SELECT ON public.request_status_events TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.case_attention_flags TO motorescue_api;
GRANT SELECT, INSERT ON public.request_feedback_events TO motorescue_api;
GRANT SELECT, INSERT ON public.provider_location_checkpoints TO motorescue_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.incident_reports TO motorescue_api;
GRANT SELECT, INSERT, UPDATE ON public.team_quality_alerts TO motorescue_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO motorescue_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_delivery_receipts TO motorescue_api;
GRANT SELECT, INSERT ON public.audit_logs TO motorescue_api;
GRANT SELECT, INSERT, DELETE ON public.assistant_usage_events TO motorescue_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_rate_limit_windows TO motorescue_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO motorescue_api;
GRANT EXECUTE ON FUNCTION public.api_lookup_account_by_phone(TEXT) TO motorescue_api;
GRANT EXECUTE ON FUNCTION public.api_accept_dispatch_offer(UUID, UUID, INTEGER) TO motorescue_api;
GRANT EXECUTE ON FUNCTION public.purge_expired_location_checkpoints(INTERVAL) TO motorescue_api;
GRANT EXECUTE ON FUNCTION public.minimize_closed_request_data(INTERVAL) TO motorescue_api;
GRANT EXECUTE ON FUNCTION public.purge_assistant_usage_events(INTERVAL) TO motorescue_api;
GRANT EXECUTE ON FUNCTION public.purge_push_delivery_receipts(INTERVAL) TO motorescue_api;

DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS motorescue_realtime_read ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS motorescue_realtime_write ON realtime.messages';
    EXECUTE $policy$
      CREATE POLICY motorescue_realtime_read ON realtime.messages
      FOR SELECT TO authenticated
      USING (public.can_access_realtime_topic(realtime.topic(), FALSE))
    $policy$;
    EXECUTE $policy$
      CREATE POLICY motorescue_realtime_write ON realtime.messages
      FOR INSERT TO authenticated
      WITH CHECK (public.can_access_realtime_topic(realtime.topic(), TRUE))
    $policy$;
  END IF;
END;
$$;
