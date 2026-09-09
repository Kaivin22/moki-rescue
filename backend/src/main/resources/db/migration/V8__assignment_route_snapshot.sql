-- A fixed position for the reference route, independent of later provider GPS.
ALTER TABLE public.rescue_requests
  ADD COLUMN assigned_provider_latitude DOUBLE PRECISION CHECK (assigned_provider_latitude BETWEEN -90 AND 90),
  ADD COLUMN assigned_provider_longitude DOUBLE PRECISION CHECK (assigned_provider_longitude BETWEEN -180 AND 180),
  ADD COLUMN assigned_provider_accuracy_m DOUBLE PRECISION CHECK (assigned_provider_accuracy_m >= 0),
  ADD COLUMN assigned_provider_position_at TIMESTAMPTZ;

CREATE FUNCTION public.capture_assignment_position()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.assigned_provider_id IS NULL OR NEW.status IN ('completed', 'cancelled', 'needs_dispatch') THEN
    NEW.assigned_provider_latitude := NULL;
    NEW.assigned_provider_longitude := NULL;
    NEW.assigned_provider_accuracy_m := NULL;
    NEW.assigned_provider_position_at := NULL;
  ELSIF TG_OP = 'INSERT' OR NEW.assigned_provider_id IS DISTINCT FROM OLD.assigned_provider_id THEN
    SELECT pm.last_latitude, pm.last_longitude, pm.location_accuracy_m, pm.location_updated_at
    INTO NEW.assigned_provider_latitude, NEW.assigned_provider_longitude,
         NEW.assigned_provider_accuracy_m, NEW.assigned_provider_position_at
    FROM public.provider_members pm WHERE pm.user_id = NEW.assigned_provider_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.capture_assignment_position() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rescue_requests_assignment_position
  BEFORE INSERT OR UPDATE OF assigned_provider_id, status ON public.rescue_requests
  FOR EACH ROW EXECUTE FUNCTION public.capture_assignment_position();

-- Existing cases stay without a snapshot: current GPS cannot be labelled as
-- historical assignment GPS. Availability GPS and status polling are unchanged.
-- Block GPS broadcast/read for older app versions as well as the new UI.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(topic_name TEXT, wants_write BOOLEAN)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT FALSE;
$$;

UPDATE public.case_attention_flags
SET status = 'resolved', resolved_at = NOW(),
    resolution_note = 'Live GPS tracking retired; navigation handled by external map app.'
WHERE code = 'provider_gps_stale' AND status = 'open';
