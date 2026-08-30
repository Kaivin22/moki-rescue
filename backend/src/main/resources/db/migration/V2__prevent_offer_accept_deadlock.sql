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

  IF NOT FOUND OR selected_offer.status <> 'pending' OR selected_offer.expires_at <= NOW() THEN
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
