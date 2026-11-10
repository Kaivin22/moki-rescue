-- Representative authority is separate from the global customer/provider/admin role.
CREATE TABLE public.shop_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
  address TEXT NOT NULL CHECK (char_length(address) BETWEEN 5 AND 300),
  contact_phone TEXT NOT NULL CHECK (contact_phone ~ '^\+84[0-9]{9}$'),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  service_codes TEXT[] NOT NULL CHECK (cardinality(service_codes) BETWEEN 1 AND 10),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  team_id UUID REFERENCES public.rescue_teams(id),
  review_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'approved') = (team_id IS NOT NULL))
);
CREATE UNIQUE INDEX shop_applications_live_user ON public.shop_applications(applicant_id)
  WHERE status IN ('pending','approved');
CREATE TABLE public.team_representatives (
  team_id UUID PRIMARY KEY REFERENCES public.rescue_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.rescue_teams(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL CHECK (contact_phone ~ '^\+84[0-9]{9}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','revoked','expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX team_invitations_one_pending ON public.team_invitations(team_id, invitee_id) WHERE status = 'pending';
CREATE INDEX team_invitations_inbox ON public.team_invitations(invitee_id, created_at DESC);
ALTER TABLE public.user_notifications DROP CONSTRAINT user_notifications_target_type_check;
ALTER TABLE public.user_notifications ADD CONSTRAINT user_notifications_target_type_check
  CHECK (target_type IN ('rescue','support','announcement','shop_application','team_invitation','shop'));
ALTER TABLE public.shop_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shop_applications, public.team_representatives, public.team_invitations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shop_applications, public.team_representatives, public.team_invitations TO motorescue_api;

-- Accept the same exact international number with or without the stored leading +.
-- Do not search substrings or return a customer directory.
CREATE OR REPLACE FUNCTION public.api_lookup_account_by_phone(search_phone TEXT)
RETURNS TABLE(user_id UUID, display_name TEXT, role TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF search_phone IS NULL OR search_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'INVALID_ACCOUNT_PHONE' USING ERRCODE = '22023';
  END IF;
  IF (SELECT COUNT(*) FROM auth.users u JOIN public.profiles p ON p.id = u.id
      WHERE ltrim(u.phone, '+') = ltrim(search_phone, '+') AND p.is_active) > 1 THEN
    RAISE EXCEPTION 'ACCOUNT_PHONE_NOT_UNIQUE' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY SELECT p.id, p.display_name, p.role
    FROM auth.users u JOIN public.profiles p ON p.id = u.id
    WHERE ltrim(u.phone, '+') = ltrim(search_phone, '+') AND p.is_active;
END $$;
