-- Contact details are supplied after email/Google sign-in. They are NOT verified
-- identities and must never grant roles, ownership, or authorize membership.
-- Keep contact data in private auth metadata, not public provider directories.
CREATE FUNCTION public.account_contact_phone(account_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN u.raw_user_meta_data->>'contact_phone' ~ '^\+84[0-9]{9,10}$'
      THEN u.raw_user_meta_data->>'contact_phone'
    WHEN ltrim(u.phone, '+') ~ '^84[0-9]{9,10}$' THEN '+' || ltrim(u.phone, '+')
    ELSE NULL END
  FROM auth.users u WHERE u.id = account_id;
$$;
REVOKE ALL ON FUNCTION public.account_contact_phone(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.api_customer_case_phone(request_id UUID, viewer_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.account_contact_phone(request.customer_id)
  FROM public.rescue_requests request
  JOIN public.profiles viewer ON viewer.id = viewer_id AND viewer.is_active
  WHERE request.id = request_id AND request.assigned_provider_id IS NOT NULL
    AND request.status IN ('assigned', 'en_route', 'awaiting_arrival_confirmation',
      'arrived', 'diagnosing', 'awaiting_quote', 'quote_approved', 'repairing',
      'transporting', 'awaiting_completion')
    AND (viewer.role = 'admin' OR (viewer.role = 'provider' AND viewer.id = request.assigned_provider_id));
$$;

CREATE OR REPLACE FUNCTION public.api_lookup_account_by_phone(search_phone TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, role TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF search_phone IS NULL OR search_phone !~ '^\+84[0-9]{9,10}$' THEN
    RAISE EXCEPTION 'INVALID_ACCOUNT_PHONE' USING ERRCODE = '22023';
  END IF;
  IF (SELECT COUNT(*) FROM public.profiles p WHERE p.is_active
      AND public.account_contact_phone(p.id) = search_phone) > 1 THEN
    RAISE EXCEPTION 'ACCOUNT_PHONE_NOT_UNIQUE' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY SELECT p.id, p.display_name, p.role FROM public.profiles p
    WHERE p.is_active AND public.account_contact_phone(p.id) = search_phone;
END $$;

CREATE FUNCTION public.require_customer_contact_phone()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.account_contact_phone(NEW.customer_id) IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_CONTACT_PHONE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.require_customer_contact_phone() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rescue_require_customer_contact BEFORE INSERT ON public.rescue_requests
FOR EACH ROW EXECUTE FUNCTION public.require_customer_contact_phone();
