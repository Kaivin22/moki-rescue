-- Routing dataset: routing/data/wsl-demo-20260909/map.osm (Overpass bbox).
-- This is a demo operating limit, NOT the administrative boundary of Da Nang.
-- Being inside this envelope does not guarantee a routable road segment.
UPDATE public.service_zones
SET boundary = extensions.ST_MakeEnvelope(108.05, 15.95, 108.34, 16.18, 4326)::extensions.geography
WHERE name = 'Da Nang launch zone';

-- Central policy shared by request creation, availability, matching and acceptance.
-- Geometry covers includes the border without geography's great-circle edge bulge.
CREATE OR REPLACE FUNCTION public.api_is_in_service_area(latitude DOUBLE PRECISION, longitude DOUBLE PRECISION)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT COALESCE(
    latitude BETWEEN 15.95 AND 16.18 AND longitude BETWEEN 108.05 AND 108.34
    AND EXISTS (
      SELECT 1 FROM public.service_zones zone
      WHERE zone.is_active AND extensions.ST_Covers(
        zone.boundary::extensions.geometry,
        extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326)
      )
    ), FALSE);
$$;
REVOKE ALL ON FUNCTION public.api_is_in_service_area(DOUBLE PRECISION, DOUBLE PRECISION)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_is_in_service_area(DOUBLE PRECISION, DOUBLE PRECISION)
  TO motorescue_api;

-- Offers created before a GPS/coverage change cannot bypass the current policy.
-- The existing acceptance function locks request + provider rows before this trigger.
CREATE OR REPLACE FUNCTION public.enforce_assignment_service_area()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'assigned' AND (
    TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.assigned_provider_id IS DISTINCT FROM NEW.assigned_provider_id
  ) THEN
    IF NOT public.api_is_in_service_area(NEW.pickup_latitude, NEW.pickup_longitude)
      OR (NEW.destination_latitude IS NOT NULL AND NOT public.api_is_in_service_area(
        NEW.destination_latitude, NEW.destination_longitude))
      OR NOT EXISTS (
        SELECT 1 FROM public.provider_members pm
        WHERE pm.user_id = NEW.assigned_provider_id
          AND public.api_is_in_service_area(pm.last_latitude, pm.last_longitude)
      ) THEN
      RAISE EXCEPTION 'OFFER_OUTSIDE_SERVICE_AREA' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_assignment_service_area() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS rescue_requests_service_area ON public.rescue_requests;
CREATE TRIGGER rescue_requests_service_area
BEFORE INSERT OR UPDATE OF status, assigned_provider_id ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_assignment_service_area();

-- Stop stale availability only; do not cancel, reassign or alter accepted jobs.
UPDATE public.provider_members
SET is_available = FALSE, available_since = NULL,
    last_latitude = NULL, last_longitude = NULL, location_accuracy_m = NULL
WHERE is_available AND NOT public.api_is_in_service_area(last_latitude, last_longitude);
