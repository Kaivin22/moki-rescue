CREATE TABLE public.push_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  request_version INTEGER NOT NULL,
  kind VARCHAR(40) NOT NULL,
  detail VARCHAR(100) NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'failed', 'expired')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  lease_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(device_id, request_id, request_version, kind, detail)
);
CREATE INDEX push_outbox_due_idx ON public.push_outbox(available_at) WHERE state = 'pending';
CREATE INDEX push_outbox_retention_idx ON public.push_outbox(created_at);
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_outbox TO motorescue_api;
COMMENT ON TABLE public.push_outbox IS
  'Durable per-installation notification metadata only; never store tokens, coordinates or free-text notes here.';
