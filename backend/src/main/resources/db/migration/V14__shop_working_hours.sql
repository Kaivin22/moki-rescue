-- Shop receiving hours, in Vietnam time. Empty schedule means closed.
ALTER TABLE public.rescue_teams
  ADD COLUMN receiving_paused BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN working_hours_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.provider_members ADD COLUMN availability_until TIMESTAMPTZ;
ALTER TABLE public.dispatch_offers ADD COLUMN availability_started_at TIMESTAMPTZ;

CREATE TABLE public.team_working_hours (
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  opens_minute INTEGER NOT NULL CHECK (opens_minute BETWEEN 0 AND 1439),
  closes_minute INTEGER NOT NULL CHECK (closes_minute BETWEEN 1 AND 1440),
  PRIMARY KEY (team_id, day_of_week),
  CHECK (opens_minute <> closes_minute)
);
COMMENT ON TABLE public.team_working_hours IS
  'ISO weekday of shift START, Asia/Ho_Chi_Minh. End < start is overnight; 0..1440 is all day.';
ALTER TABLE public.team_working_hours ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.team_working_hours FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_working_hours TO motorescue_api;
-- Server-only fixture setup also works after upgrading an existing test database.
GRANT SELECT, INSERT ON public.team_working_hours TO service_role;

CREATE FUNCTION public.api_team_receiving_until(target_team UUID, at_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE sql STABLE SET search_path = '' AS $$
  WITH dates AS (
    SELECT (at_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE - offset_days AS shift_date
    FROM generate_series(0, 1) AS offsets(offset_days)
  ), periods AS (
    SELECT (dates.shift_date + hours.opens_minute * INTERVAL '1 minute')
             AT TIME ZONE 'Asia/Ho_Chi_Minh' AS starts_at,
           (dates.shift_date + hours.closes_minute * INTERVAL '1 minute'
             + CASE WHEN hours.closes_minute < hours.opens_minute THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END)
             AT TIME ZONE 'Asia/Ho_Chi_Minh' AS ends_at
    FROM dates
    JOIN public.team_working_hours hours
      ON hours.team_id = target_team
     AND hours.day_of_week = EXTRACT(ISODOW FROM dates.shift_date)::INTEGER
    JOIN public.rescue_teams team ON team.id = hours.team_id
    WHERE NOT team.receiving_paused AND team.status = 'verified'
  )
  SELECT MAX(ends_at) FROM periods WHERE at_time >= starts_at AND at_time < ends_at;
$$;

CREATE FUNCTION public.api_provider_receiving_until(target_provider UUID, at_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT LEAST(pm.availability_until, hours.ends_at)
  FROM public.provider_members pm
  JOIN public.profiles profile ON profile.id = pm.user_id
  CROSS JOIN LATERAL (
    SELECT public.api_team_receiving_until(pm.team_id, at_time) AS ends_at
  ) hours
  WHERE pm.user_id = target_provider AND pm.is_available AND pm.status = 'active'
    AND profile.is_active AND profile.role = 'provider'
    AND pm.availability_until > at_time AND hours.ends_at > at_time;
$$;

CREATE FUNCTION public.api_offer_is_receivable(target_offer UUID, at_time TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dispatch_offers offer
    JOIN public.provider_members pm ON pm.user_id = offer.provider_id AND pm.team_id = offer.team_id
    WHERE offer.id = target_offer AND offer.status = 'pending' AND offer.expires_at > at_time
      AND offer.availability_started_at = pm.available_since
      AND public.api_provider_receiving_until(pm.user_id, at_time) IS NOT NULL
  );
$$;

-- Only an explicit availability write can begin a new readiness session.
-- A stale TRUE left by a stopped scheduler cannot carry over into tomorrow.
CREATE FUNCTION public.bound_provider_availability()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE period_end TIMESTAMPTZ; current_time_value TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF NOT NEW.is_available THEN
    NEW.availability_until := NULL;
    NEW.available_since := NULL;
    RETURN NEW;
  END IF;
  period_end := public.api_team_receiving_until(NEW.team_id, current_time_value);
  IF period_end IS NULL THEN
    RAISE EXCEPTION 'WORKING_HOURS_CLOSED' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.availability_until := period_end;
    NEW.available_since := current_time_value;
  ELSIF NOT OLD.is_available OR OLD.availability_until IS NULL
      OR OLD.availability_until <= current_time_value OR OLD.team_id <> NEW.team_id THEN
    NEW.availability_until := period_end;
    NEW.available_since := current_time_value;
  ELSE
    NEW.availability_until := LEAST(OLD.availability_until, period_end);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER provider_availability_hours
BEFORE INSERT OR UPDATE OF is_available, team_id ON public.provider_members
FOR EACH ROW EXECUTE FUNCTION public.bound_provider_availability();

-- All callers, including database acceptance, share this session boundary.
CREATE FUNCTION public.bound_dispatch_offer_hours()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE period_end TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'pending' THEN
    period_end := public.api_provider_receiving_until(NEW.provider_id, clock_timestamp());
    IF period_end IS NULL THEN
      RAISE EXCEPTION 'OFFER_OUTSIDE_WORKING_HOURS' USING ERRCODE = 'P0001';
    END IF;
    NEW.expires_at := LEAST(NEW.expires_at, period_end);
    SELECT available_since INTO NEW.availability_started_at
    FROM public.provider_members WHERE user_id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dispatch_offer_hours
BEFORE INSERT OR UPDATE OF status, expires_at ON public.dispatch_offers
FOR EACH ROW EXECUTE FUNCTION public.bound_dispatch_offer_hours();

-- Existing shops must configure their real hours; do not invent 24/7 availability.
-- Only pending invitations are retired; assigned/in-progress cases are untouched.
UPDATE public.provider_members SET is_available = FALSE WHERE is_available;
UPDATE public.dispatch_offers SET status = 'withdrawn', responded_at = NOW() WHERE status = 'pending';
UPDATE public.rescue_requests SET status = 'searching', routing_status = 'pending' WHERE status = 'offered';

REVOKE ALL ON FUNCTION public.api_team_receiving_until(UUID, TIMESTAMPTZ),
  public.api_provider_receiving_until(UUID, TIMESTAMPTZ),
  public.api_offer_is_receivable(UUID, TIMESTAMPTZ),
  public.bound_provider_availability(), public.bound_dispatch_offer_hours()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bound_provider_availability(), public.bound_dispatch_offer_hours()
  FROM motorescue_api;
GRANT EXECUTE ON FUNCTION public.api_team_receiving_until(UUID, TIMESTAMPTZ),
  public.api_provider_receiving_until(UUID, TIMESTAMPTZ),
  public.api_offer_is_receivable(UUID, TIMESTAMPTZ) TO motorescue_api;

-- Every accept transaction for the same rescue request must lock rows in the
-- same order. Locking each provider's offer first can deadlock when both later
-- update the shared request and all pending offers.
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
  target_request_id UUID;
  selected_offer public.dispatch_offers%ROWTYPE;
  selected_request public.rescue_requests%ROWTYPE;
  locked_provider UUID;
BEGIN
  -- Resolve the shared request without retaining an offer row lock. Every
  -- contender then serializes on the same request row before locking its offer.
  SELECT request_id INTO target_request_id
  FROM public.dispatch_offers
  WHERE id = offer_id AND provider_id = actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OFFER_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO selected_request
  FROM public.rescue_requests
  WHERE id = target_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OFFER_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO selected_offer
  FROM public.dispatch_offers
  WHERE id = offer_id AND provider_id = actor_id
  FOR UPDATE;

  IF NOT FOUND OR selected_offer.status <> 'pending' OR selected_offer.expires_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'OFFER_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

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

  -- Recheck after the provider lock: the shop may have closed while we waited.
  IF NOT public.api_offer_is_receivable(offer_id, clock_timestamp()) THEN
    RAISE EXCEPTION 'OFFER_OUTSIDE_WORKING_HOURS' USING ERRCODE = 'P0001';
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
