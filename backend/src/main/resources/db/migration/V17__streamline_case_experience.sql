-- Provider records arrival and completion; customer quote consent remains required.
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
    WHEN 'en_route' THEN NEW.status IN ('diagnosing', 'awaiting_arrival_confirmation', 'searching', 'needs_dispatch', 'cancelled')
    WHEN 'awaiting_arrival_confirmation' THEN NEW.status IN ('diagnosing', 'arrived', 'en_route', 'searching', 'needs_dispatch', 'cancelled')
    WHEN 'arrived' THEN NEW.status IN ('diagnosing', 'needs_dispatch', 'cancelled')
    WHEN 'diagnosing' THEN NEW.status IN ('completed', 'en_route', 'awaiting_quote', 'repairing', 'transporting', 'needs_dispatch', 'cancelled')
    WHEN 'awaiting_quote' THEN NEW.status IN ('repairing', 'transporting', 'diagnosing', 'quote_approved', 'needs_dispatch', 'cancelled')
    WHEN 'quote_approved' THEN NEW.status IN ('repairing', 'transporting', 'needs_dispatch', 'cancelled')
    WHEN 'repairing' THEN NEW.status IN ('completed', 'awaiting_completion', 'needs_dispatch', 'cancelled')
    WHEN 'transporting' THEN NEW.status IN ('completed', 'awaiting_completion', 'needs_dispatch', 'cancelled')
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
  IF NEW.status = 'arrived' OR (OLD.status IN ('en_route', 'awaiting_arrival_confirmation') AND NEW.status = 'diagnosing') THEN NEW.arrived_at := COALESCE(NEW.arrived_at, NOW()); END IF;
  IF NEW.status = 'completed' THEN NEW.completed_at := COALESCE(NEW.completed_at, NOW()); END IF;
  IF NEW.status = 'cancelled' THEN NEW.cancelled_at := COALESCE(NEW.cancelled_at, NOW()); END IF;
  RETURN NEW;
END;
$$;


-- Remove display-only test prefixes; preserve accounts, roles and fixture identifiers.
UPDATE public.profiles SET display_name = COALESCE(NULLIF(btrim(replace(display_name, '[TEST]', '')), ''), 'Người dùng') WHERE display_name LIKE '%[TEST]%';
UPDATE public.provider_members SET display_name=btrim(replace(display_name, '[TEST]', '')),
 rescue_vehicle_label=replace(rescue_vehicle_label, '[TEST] ', '') WHERE display_name LIKE '%[TEST]%' OR rescue_vehicle_label LIKE '%[TEST]%';
UPDATE public.rescue_teams SET name=btrim(replace(name, '[TEST]', '')), base_address=replace(base_address, '[TEST] ', '') WHERE name LIKE '%[TEST]%' OR base_address LIKE '%[TEST]%';
UPDATE auth.users SET raw_user_meta_data=jsonb_set(raw_user_meta_data, '{display_name}', to_jsonb(btrim(replace(raw_user_meta_data->>'display_name', '[TEST]', '')))) WHERE raw_user_meta_data->>'display_name' LIKE '%[TEST]%';
UPDATE public.team_verification_checks SET note=replace(note,'[TEST] ','') WHERE note LIKE '%[TEST]%';
UPDATE public.user_notifications SET title=replace(title,'[TEST] ',''), body=replace(body,'[TEST] ','')
WHERE title LIKE '%[TEST]%' OR body LIKE '%[TEST]%';

-- A support ticket linked to an incident belongs to that rescue case.
CREATE FUNCTION public.notification_rescue_id(target_kind TEXT, target UUID) RETURNS UUID
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE WHEN target_kind='rescue' THEN target WHEN target_kind='support' THEN
   (SELECT i.request_id FROM public.support_tickets t JOIN public.incident_reports i ON i.id=t.incident_id WHERE t.id=target)
 ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.notification_rescue_id(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_rescue_id(TEXT, UUID) TO motorescue_api;

-- Keep the newest entry, preserving unread status if any merged entry was unread.
WITH grouped AS (
 SELECT n.id, row_number() OVER (PARTITION BY n.user_id, public.notification_rescue_id(n.target_type,n.target_id) ORDER BY n.created_at DESC,n.id DESC) AS rn,
 bool_or(n.read_at IS NULL) OVER (PARTITION BY n.user_id, public.notification_rescue_id(n.target_type,n.target_id)) AS unread
 FROM public.user_notifications n JOIN public.profiles p ON p.id=n.user_id AND p.role='admin'
 WHERE public.notification_rescue_id(n.target_type,n.target_id) IS NOT NULL
)
UPDATE public.user_notifications n SET read_at=NULL FROM grouped g WHERE n.id=g.id AND g.rn=1 AND g.unread;
WITH duplicates AS (
 SELECT n.id, row_number() OVER (PARTITION BY n.user_id, public.notification_rescue_id(n.target_type,n.target_id) ORDER BY n.created_at DESC,n.id DESC) AS rn
 FROM public.user_notifications n JOIN public.profiles p ON p.id=n.user_id AND p.role='admin'
 WHERE public.notification_rescue_id(n.target_type,n.target_id) IS NOT NULL
)
DELETE FROM public.user_notifications n USING duplicates d WHERE n.id=d.id AND d.rn>1;
UPDATE public.user_notifications n SET event_key='admin-rescue:' || public.notification_rescue_id(n.target_type,n.target_id),
 target_id=public.notification_rescue_id(n.target_type,n.target_id), target_type='rescue'
FROM public.profiles p WHERE p.id=n.user_id AND p.role='admin' AND public.notification_rescue_id(n.target_type,n.target_id) IS NOT NULL;

CREATE FUNCTION public.group_admin_rescue_notification() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rescue_id UUID;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=NEW.user_id AND role='admin') THEN RETURN NEW; END IF;
 rescue_id := public.notification_rescue_id(NEW.target_type, NEW.target_id);
 IF rescue_id IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('admin-rescue:' || NEW.user_id || ':' || rescue_id,0));
 NEW.event_key := 'admin-rescue:' || rescue_id;
 IF EXISTS (SELECT 1 FROM public.user_notifications WHERE user_id=NEW.user_id AND event_key=NEW.event_key) THEN RETURN NULL; END IF;
 NEW.target_type := 'rescue'; NEW.target_id := rescue_id;
 NEW.title := CASE WHEN (SELECT locale FROM public.profiles WHERE id=NEW.user_id)='en' THEN 'Rescue case needs attention' ELSE 'Ca cứu hộ cần hỗ trợ' END;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.group_admin_rescue_notification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER group_admin_rescue_notification BEFORE INSERT ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.group_admin_rescue_notification();
