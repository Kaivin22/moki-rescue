-- Matching counts completed requests for the same provider and service type.
-- Keep that lookup bounded as request history grows.
CREATE INDEX rescue_requests_provider_service_completed_idx
  ON public.rescue_requests(assigned_provider_id, service_code)
  WHERE status = 'completed' AND assigned_provider_id IS NOT NULL;
