-- In-app delivery is persistent and independent of device push registration.
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  target_type TEXT NOT NULL CHECK (target_type IN ('rescue', 'support', 'announcement')),
  target_id UUID NOT NULL,
  event_key TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_key)
);
CREATE INDEX user_notifications_history_idx ON public.user_notifications(user_id, created_at DESC, id DESC);
CREATE INDEX user_notifications_unread_idx ON public.user_notifications(user_id) WHERE read_at IS NULL;

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  incident_id UUID UNIQUE REFERENCES public.incident_reports(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 5 AND 160),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting_user', 'resolved', 'dismissed')),
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX support_tickets_owner_idx ON public.support_tickets(owner_id, created_at DESC, id DESC);
CREATE INDEX support_tickets_queue_idx ON public.support_tickets(status, created_at DESC, id DESC);
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('customer', 'provider', 'admin', 'system')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT internal OR author_role = 'admin')
);
CREATE INDEX support_messages_thread_idx ON public.support_messages(ticket_id, created_at DESC, id DESC);
CREATE INDEX support_messages_rate_idx ON public.support_messages(author_id, created_at DESC);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  audience TEXT NOT NULL CHECK (audience IN ('all', 'customer', 'provider', 'admin')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 4000),
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX announcements_history_idx ON public.announcements(created_at DESC, id DESC);

-- Existing complaints are linked once, not copied into an unrelated complaint workflow.
INSERT INTO public.support_tickets(incident_id, owner_id, subject, description, status, created_at, updated_at)
SELECT id, customer_id, 'Khiếu nại ca cứu hộ', description, status, created_at, COALESCE(resolved_at, created_at)
FROM public.incident_reports;
INSERT INTO public.support_messages(ticket_id, author_id, author_role, body, created_at)
SELECT ticket.id, incident.resolved_by, 'system', incident.resolution_note, incident.resolved_at
FROM public.support_tickets ticket JOIN public.incident_reports incident ON incident.id = ticket.incident_id
WHERE incident.resolution_note IS NOT NULL AND incident.resolved_at IS NOT NULL;

CREATE FUNCTION public.sync_incident_support_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE ticket_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.support_tickets(incident_id, owner_id, subject, description, status)
    VALUES (NEW.id, NEW.customer_id, 'Khiếu nại ca cứu hộ', NEW.description, NEW.status)
    RETURNING id INTO ticket_id;
    INSERT INTO public.user_notifications(user_id, kind, title, body, target_type, target_id, event_key)
    SELECT id, 'support', 'Khiếu nại mới', 'Có khiếu nại cần kiểm tra và phản hồi.', 'support', ticket_id,
      'incident-new:' || NEW.id FROM public.profiles WHERE role = 'admin' AND is_active;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    UPDATE public.support_tickets SET status = NEW.status, updated_at = NOW(), version = version + 1
    WHERE incident_id = NEW.id RETURNING id INTO ticket_id;
    IF ticket_id IS NOT NULL THEN
      INSERT INTO public.support_messages(ticket_id, author_id, author_role, body)
      VALUES (ticket_id, NEW.resolved_by, 'system', COALESCE(NEW.resolution_note, 'Trạng thái khiếu nại đã thay đổi.'));
      INSERT INTO public.user_notifications(user_id, kind, title, body, target_type, target_id, event_key)
      VALUES (NEW.customer_id, 'support', 'Khiếu nại đã có kết quả',
        'Mở phiếu hỗ trợ để xem phản hồi của quản trị viên.', 'support', ticket_id,
        'incident-status:' || NEW.id || ':' || NEW.status) ON CONFLICT (user_id, event_key) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER incident_support_ticket AFTER INSERT OR UPDATE OF status ON public.incident_reports
FOR EACH ROW EXECUTE FUNCTION public.sync_incident_support_ticket();
REVOKE ALL ON FUNCTION public.sync_incident_support_ticket() FROM PUBLIC, anon, authenticated, motorescue_api;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
-- API-only tables. Actor ownership, admin role and private-note checks are server-side.
REVOKE ALL ON public.user_notifications, public.support_tickets, public.support_messages, public.announcements
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications, public.support_tickets,
public.support_messages, public.announcements TO motorescue_api;
