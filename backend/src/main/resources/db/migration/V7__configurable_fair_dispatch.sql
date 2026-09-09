-- Dispatch policy belongs to each service type so experiments can change
-- priorities without changing the matching flow or rebuilding the backend.
ALTER TABLE public.service_types
  ADD COLUMN matching_eta_window_seconds INTEGER NOT NULL DEFAULT 300
    CHECK (matching_eta_window_seconds BETWEEN 60 AND 3600),
  ADD COLUMN matching_eta_weight NUMERIC(6,5) NOT NULL DEFAULT 0.55
    CHECK (matching_eta_weight BETWEEN 0 AND 1),
  ADD COLUMN matching_experience_weight NUMERIC(6,5) NOT NULL DEFAULT 0.15
    CHECK (matching_experience_weight BETWEEN 0 AND 1),
  ADD COLUMN matching_waiting_weight NUMERIC(6,5) NOT NULL DEFAULT 0.15
    CHECK (matching_waiting_weight BETWEEN 0 AND 1),
  ADD COLUMN matching_recent_cases_weight NUMERIC(6,5) NOT NULL DEFAULT 0.15
    CHECK (matching_recent_cases_weight BETWEEN 0 AND 1),
  ADD COLUMN matching_experience_reference_cases INTEGER NOT NULL DEFAULT 50
    CHECK (matching_experience_reference_cases BETWEEN 1 AND 10000),
  ADD COLUMN matching_waiting_reference_seconds INTEGER NOT NULL DEFAULT 7200
    CHECK (matching_waiting_reference_seconds BETWEEN 60 AND 604800),
  ADD COLUMN matching_recent_window_days INTEGER NOT NULL DEFAULT 7
    CHECK (matching_recent_window_days BETWEEN 1 AND 90),
  ADD COLUMN matching_recent_reference_cases INTEGER NOT NULL DEFAULT 10
    CHECK (matching_recent_reference_cases BETWEEN 1 AND 1000),
  ADD COLUMN matching_starvation_skip_threshold INTEGER NOT NULL DEFAULT 3
    CHECK (matching_starvation_skip_threshold BETWEEN 1 AND 100),
  ADD COLUMN matching_offer_ttl_seconds INTEGER NOT NULL DEFAULT 45
    CHECK (matching_offer_ttl_seconds BETWEEN 20 AND 180),
  ADD CONSTRAINT service_types_matching_weight_check CHECK (
    matching_eta_weight + matching_experience_weight
      + matching_waiting_weight + matching_recent_cases_weight > 0
  );

-- Waiting starts when a provider becomes available, not when their account was created.
ALTER TABLE public.provider_members
  ADD COLUMN available_since TIMESTAMPTZ;

UPDATE public.provider_members
SET available_since = COALESCE(location_updated_at, updated_at, created_at)
WHERE is_available;

-- Starvation state is service-specific. A provider offered one service does not
-- lose their opportunity history for a different capability.
CREATE TABLE public.provider_dispatch_stats (
  provider_id UUID NOT NULL REFERENCES public.provider_members(user_id) ON DELETE CASCADE,
  service_code TEXT NOT NULL REFERENCES public.service_types(code) ON DELETE CASCADE,
  consecutive_skips INTEGER NOT NULL DEFAULT 0
    CHECK (consecutive_skips BETWEEN 0 AND 1000000),
  last_offered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, service_code)
);

CREATE INDEX provider_dispatch_stats_service_skips_idx
  ON public.provider_dispatch_stats(service_code, consecutive_skips DESC);
CREATE INDEX dispatch_offers_provider_accepted_recent_idx
  ON public.dispatch_offers(provider_id, responded_at DESC)
  WHERE status = 'accepted';

ALTER TABLE public.provider_dispatch_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_dispatch_stats_no_client_access ON public.provider_dispatch_stats
  FOR ALL TO anon, authenticated USING (FALSE) WITH CHECK (FALSE);

REVOKE ALL ON public.provider_dispatch_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_dispatch_stats TO motorescue_api;
