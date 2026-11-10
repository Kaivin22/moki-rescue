-- Initial estimate is attached to an assignment, not a payment or final invoice.
ALTER TABLE public.rescue_requests ADD COLUMN base_price_vnd BIGINT
  CHECK (base_price_vnd BETWEEN 0 AND 100000000);
CREATE INDEX rescue_customer_cancelled_provider_idx
  ON public.rescue_requests(customer_id, assigned_provider_id, cancelled_at DESC)
  WHERE status = 'cancelled' AND cancelled_by = customer_id;

CREATE FUNCTION public.api_customer_provider_cooldown(customer UUID, provider UUID, at_time TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.rescue_requests previous
    WHERE previous.customer_id = customer AND previous.assigned_provider_id = provider
      AND previous.status = 'cancelled' AND previous.cancelled_by = customer
      AND previous.cancelled_at > at_time - INTERVAL '15 minutes');
$$;
REVOKE ALL ON FUNCTION public.api_customer_provider_cooldown(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_customer_provider_cooldown(UUID, UUID, TIMESTAMPTZ) TO motorescue_api;

-- Revalidate at display/accept time as well as before OSRM ranking.
CREATE OR REPLACE FUNCTION public.api_offer_is_receivable(target_offer UUID, at_time TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dispatch_offers offer
    JOIN public.provider_members pm ON pm.user_id = offer.provider_id AND pm.team_id = offer.team_id
    JOIN public.rescue_requests rr ON rr.id = offer.request_id
    WHERE offer.id = target_offer AND offer.status = 'pending' AND offer.expires_at > at_time
      AND offer.availability_started_at = pm.available_since
      AND public.api_provider_receiving_until(pm.user_id, at_time) IS NOT NULL
      AND NOT public.api_customer_provider_cooldown(rr.customer_id, pm.user_id, at_time)
  );
$$;

CREATE FUNCTION public.clear_assignment_base_price() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.assigned_provider_id IS DISTINCT FROM OLD.assigned_provider_id THEN
    NEW.base_price_vnd := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rescue_clear_assignment_base_price BEFORE UPDATE OF assigned_provider_id
ON public.rescue_requests FOR EACH ROW EXECUTE FUNCTION public.clear_assignment_base_price();
REVOKE ALL ON FUNCTION public.clear_assignment_base_price() FROM PUBLIC, anon, authenticated;

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
    WHEN 'awaiting_arrival_confirmation' THEN NEW.status IN ('diagnosing', 'arrived', 'en_route', 'searching', 'needs_dispatch', 'cancelled')
    WHEN 'arrived' THEN NEW.status IN ('diagnosing', 'needs_dispatch', 'cancelled')
    WHEN 'diagnosing' THEN NEW.status IN ('awaiting_quote', 'repairing', 'transporting', 'needs_dispatch', 'cancelled')
    WHEN 'awaiting_quote' THEN NEW.status IN ('repairing', 'transporting', 'diagnosing', 'quote_approved', 'needs_dispatch', 'cancelled')
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
  IF NEW.status = 'arrived' OR (OLD.status = 'awaiting_arrival_confirmation' AND NEW.status = 'diagnosing') THEN NEW.arrived_at := COALESCE(NEW.arrived_at, NOW()); END IF;
  IF NEW.status = 'completed' THEN NEW.completed_at := COALESCE(NEW.completed_at, NOW()); END IF;
  IF NEW.status = 'cancelled' THEN NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW()); END IF;
  RETURN NEW;
END;
$$;

