-- The request and its recovery job commit together, including retry/reassignment.
CREATE TABLE public.dispatch_recovery_jobs (
  request_id UUID PRIMARY KEY REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 seconds',
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_id UUID,
  last_error_type VARCHAR(100)
);
CREATE INDEX dispatch_recovery_due_idx ON public.dispatch_recovery_jobs(available_at);
ALTER TABLE public.dispatch_recovery_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dispatch_recovery_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispatch_recovery_jobs TO motorescue_api;

CREATE FUNCTION public.sync_dispatch_recovery_job()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'searching' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.dispatch_recovery_jobs(request_id) VALUES (NEW.id)
      ON CONFLICT (request_id) DO UPDATE
      SET available_at = NOW() + INTERVAL '30 seconds', attempts = 0, lease_id = NULL,
          last_error_type = NULL;
    END IF;
  ELSE
    DELETE FROM public.dispatch_recovery_jobs WHERE request_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_dispatch_recovery_job() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rescue_requests_dispatch_recovery
AFTER INSERT OR UPDATE OF status ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_dispatch_recovery_job();

-- Recover requests stranded before this migration was deployed as well.
INSERT INTO public.dispatch_recovery_jobs(request_id)
SELECT id FROM public.rescue_requests WHERE status = 'searching';
