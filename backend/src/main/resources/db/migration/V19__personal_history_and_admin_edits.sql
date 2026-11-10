ALTER TABLE public.user_notifications ADD COLUMN deleted_at TIMESTAMPTZ;
GRANT INSERT ON public.service_types TO motorescue_api;
CREATE INDEX user_notifications_visible_idx ON public.user_notifications(user_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
ALTER TABLE public.announcements ADD COLUMN withdrawn_at TIMESTAMPTZ,
  ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

CREATE TABLE public.hidden_request_history (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.rescue_requests(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, request_id)
);
ALTER TABLE public.hidden_request_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hidden_request_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.hidden_request_history TO motorescue_api;
