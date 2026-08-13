-- STAGING TEST ONLY. Run after 01_schema.sql in Supabase SQL Editor.
-- The whole test is rolled back. A failure raises an exception and identifies
-- the violated contract. Never include this file in a production migration.
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_value BOOLEAN, p_message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF NOT COALESCE(p_value, FALSE) THEN RAISE EXCEPTION 'RLS TEST FAILED: %', p_message; END IF;
END;
$$;

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, 'authenticated', 'authenticated', 'rls-a@example.invalid', '', NOW(), '{}', '{"full_name":"RLS User A"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', NULL, 'authenticated', 'authenticated', 'rls-b@example.invalid', '', NOW(), '{}', '{"full_name":"RLS User B"}', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', NULL, 'authenticated', 'authenticated', 'rls-admin@example.invalid', '', NOW(), '{}', '{"full_name":"RLS Admin"}', NOW(), NOW());

UPDATE public.profiles SET role = 'admin' WHERE id = '33333333-3333-3333-3333-333333333333';

INSERT INTO public.places (
  id, name, description, address, city, lat, lng, category, tags, suitable_for,
  avg_duration_min, opening_time, closing_time, opening_days, image_urls,
  source_name, source_url, is_active, content_status
) VALUES (
  '44444444-4444-4444-4444-444444444444', 'RLS Test Place', 'Temporary staging test row',
  'Staging only', 'Đà Nẵng', 16.0544, 108.2022, 'park', '{}', ARRAY['family'],
  60, '07:00', '21:00', ARRAY[1,2,3,4,5,6,7], '{}',
  'RLS integration test', 'https://example.invalid/rls-test', TRUE, 'published'
);

SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.places WHERE id = '44444444-4444-4444-4444-444444444444'),
  'anon must see a published place'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', TRUE);
SELECT set_config(
  'app.test_itinerary_id',
  (public.upsert_itinerary(
    jsonb_build_object(
      'title', 'RLS itinerary', 'num_days', 1, 'num_people', 2,
      'transport', 'motorbike',
      'start_date', (timezone('Asia/Ho_Chi_Minh', NOW())::DATE + 7),
      'travel_style', jsonb_build_array('culture'),
      'days', jsonb_build_array(jsonb_build_object(
        'day_number', 1, 'advice', '[]'::jsonb,
        'slots', jsonb_build_array(jsonb_build_object(
          'place_id', '44444444-4444-4444-4444-444444444444',
          'place_name', 'Ignored client snapshot', 'order_index', 0,
          'start_time', '08:00', 'duration_min', 60, 'is_meal', FALSE
        ))
      ))
    ), NULL
  )->>'id'),
  TRUE
);
SELECT pg_temp.assert_true(
  (SELECT place_name = 'RLS Test Place' FROM public.itinerary_slots s
    JOIN public.itinerary_days d ON d.id = s.day_id
    WHERE d.itinerary_id = current_setting('app.test_itinerary_id')::uuid),
  'RPC must use the canonical published place snapshot'
);
SELECT set_config(
  'app.test_share_token',
  (public.enable_itinerary_share(current_setting('app.test_itinerary_id')::uuid)->>'share_token'),
  TRUE
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.itineraries WHERE id = current_setting('app.test_itinerary_id')::uuid),
  'another user must not read the owner row'
);
DO $$
BEGIN
  BEGIN
    PERFORM public.admin_set_user_access('11111111-1111-1111-1111-111111111111', 'editor', NULL);
    RAISE EXCEPTION 'RLS TEST FAILED: non-admin changed user access';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
-- The RPC must reject values outside its public 'up'/'down' contract.
DO $$
BEGIN
  BEGIN
    PERFORM public.vote_shared_itinerary(
      current_setting('app.test_share_token'),
      '44444444-4444-4444-4444-444444444444',
      'invalid'
    );
    RAISE EXCEPTION 'RLS TEST FAILED: invalid vote was accepted';
  EXCEPTION
    WHEN invalid_parameter_value THEN
      IF SQLERRM IS DISTINCT FROM 'INVALID_VOTE' THEN RAISE; END IF;
  END;
END;
$$;

SELECT public.vote_shared_itinerary(
  current_setting('app.test_share_token'),
  '44444444-4444-4444-4444-444444444444',
  'up'
);
SELECT pg_temp.assert_true(
  (public.get_shared_votes(current_setting('app.test_share_token'))->0->>'up')::INTEGER = 1
    AND (public.get_shared_votes(current_setting('app.test_share_token'))->0->>'down')::INTEGER = 0
    AND (public.get_shared_votes(current_setting('app.test_share_token'))->0->>'my_vote') = 'up',
  'a valid vote must be recorded and visible to the voter'
);
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
SELECT pg_temp.assert_true(
  (public.get_shared_itinerary(current_setting('app.test_share_token'))->>'title') = 'RLS itinerary',
  'active token must expose the allowlisted shared payload'
);
SELECT pg_temp.assert_true(
  NOT (public.get_shared_itinerary(current_setting('app.test_share_token')) ? 'user_id'),
  'shared payload must not reveal owner id'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', TRUE);
SELECT public.revoke_itinerary_share(current_setting('app.test_itinerary_id')::uuid);
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', TRUE);
SELECT pg_temp.assert_true(
  public.get_shared_itinerary(current_setting('app.test_share_token')) IS NULL,
  'revoked token must stop reading immediately'
);
RESET ROLE;

ROLLBACK;
