-- Share a customer's login phone only with the assigned provider or an operator
-- during an active assignment. Runtime still has no general auth.users access.
CREATE FUNCTION public.api_customer_case_phone(request_id UUID, viewer_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN ltrim(account.phone, '+') ~ '^[1-9][0-9]{7,14}$'
              THEN '+' || ltrim(account.phone, '+') ELSE NULL END
  FROM public.rescue_requests request
  JOIN public.profiles viewer ON viewer.id = viewer_id AND viewer.is_active
  JOIN auth.users account ON account.id = request.customer_id
  WHERE request.id = request_id
    AND request.assigned_provider_id IS NOT NULL
    AND request.status IN ('assigned', 'en_route', 'awaiting_arrival_confirmation',
      'arrived', 'diagnosing', 'awaiting_quote', 'quote_approved', 'repairing',
      'transporting', 'awaiting_completion')
    AND (viewer.role = 'admin' OR
      (viewer.role = 'provider' AND viewer.id = request.assigned_provider_id));
$$;
REVOKE ALL ON FUNCTION public.api_customer_case_phone(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_customer_case_phone(UUID, UUID) TO motorescue_api;
