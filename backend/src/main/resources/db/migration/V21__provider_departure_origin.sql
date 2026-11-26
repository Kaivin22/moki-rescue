-- Only an explicit GPS selection has an expiry. Legacy coordinates without one
-- do not opt a shop-based provider into location sharing.
ALTER TABLE public.provider_members ADD COLUMN departure_expires_at TIMESTAMPTZ;
ALTER TABLE public.dispatch_offers
  ADD COLUMN origin_latitude DOUBLE PRECISION CHECK (origin_latitude BETWEEN -90 AND 90),
  ADD COLUMN origin_longitude DOUBLE PRECISION CHECK (origin_longitude BETWEEN -180 AND 180),
  ADD COLUMN origin_accuracy_m DOUBLE PRECISION CHECK (origin_accuracy_m BETWEEN 0 AND 1000),
  ADD CHECK ((origin_latitude IS NULL) = (origin_longitude IS NULL));

CREATE OR REPLACE FUNCTION public.api_provider_receiving_until(target_provider UUID, at_time TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT LEAST(pm.availability_until, hours.ends_at, pm.departure_expires_at)
  FROM public.provider_members pm
  JOIN public.profiles profile ON profile.id = pm.user_id
  CROSS JOIN LATERAL (SELECT public.api_team_receiving_until(pm.team_id, at_time) AS ends_at) hours
  WHERE pm.user_id = target_provider AND pm.is_available AND pm.status = 'active'
    AND profile.is_active AND profile.role = 'provider'
    AND pm.availability_until > at_time AND hours.ends_at > at_time
    AND (pm.departure_expires_at IS NULL OR (pm.departure_expires_at > at_time
      AND public.api_is_in_service_area(pm.last_latitude, pm.last_longitude)));
$$;

CREATE FUNCTION public.clear_readiness_gps() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.departure_expires_at IS NOT NULL AND (NOT NEW.is_available OR NEW.team_id <> OLD.team_id) THEN
    NEW.last_latitude := NULL;
    NEW.last_longitude := NULL;
    NEW.location_accuracy_m := NULL;
    NEW.last_location := NULL;
    NEW.location_updated_at := NULL;
    IF NEW.team_id <> OLD.team_id OR OLD.departure_expires_at > statement_timestamp() THEN
      NEW.departure_expires_at := NULL;
      NEW.is_available := FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clear_readiness_gps BEFORE UPDATE OF is_available, team_id ON public.provider_members
  FOR EACH ROW EXECUTE FUNCTION public.clear_readiness_gps();

-- Acceptance changes the request before marking the invitation accepted.
-- Pre-upgrade offers and direct (non-offer) assignments use the registered shop.
CREATE OR REPLACE FUNCTION public.capture_assignment_position()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.assigned_provider_id IS NULL OR NEW.status IN ('completed', 'cancelled', 'needs_dispatch') THEN
    NEW.assigned_provider_latitude := NULL;
    NEW.assigned_provider_longitude := NULL;
    NEW.assigned_provider_accuracy_m := NULL;
    NEW.assigned_provider_position_at := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.assigned_provider_id IS DISTINCT FROM OLD.assigned_provider_id THEN
    SELECT COALESCE(offer.origin_latitude, team.base_latitude), COALESCE(offer.origin_longitude, team.base_longitude),
           offer.origin_accuracy_m, COALESCE(offer.offered_at, statement_timestamp())
    INTO NEW.assigned_provider_latitude, NEW.assigned_provider_longitude,
         NEW.assigned_provider_accuracy_m, NEW.assigned_provider_position_at
    FROM public.rescue_teams team LEFT JOIN public.dispatch_offers offer
      ON offer.team_id = team.id AND offer.request_id = NEW.id AND offer.provider_id = NEW.assigned_provider_id
      AND offer.status = 'pending'
    WHERE team.id = NEW.assigned_team_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.clear_resolved_offer_origin() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.origin_latitude := NULL;
  NEW.origin_longitude := NULL;
  NEW.origin_accuracy_m := NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clear_resolved_offer_origin BEFORE UPDATE OF status ON public.dispatch_offers
  FOR EACH ROW WHEN (NEW.status <> 'pending') EXECUTE FUNCTION public.clear_resolved_offer_origin();
REVOKE ALL ON FUNCTION public.clear_readiness_gps(), public.clear_resolved_offer_origin()
  FROM PUBLIC, anon, authenticated, motorescue_api;
