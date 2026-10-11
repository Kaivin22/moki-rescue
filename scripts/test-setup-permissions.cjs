// Server-only grants used by create-test-accounts.cjs. No database connection here.
const setupGrantsSql = String.raw`-- BEGIN TEST SETUP PERMISSIONS
-- Explicit grants survive a reset of public and do not rely on Supabase defaults.
-- Never grant these privileges to anon/authenticated or expose the server key in the app.
DO $setup_role_guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'SUPABASE_SERVICE_ROLE_REQUIRED';
  END IF;
END;
$setup_role_guard$;

GRANT USAGE ON SCHEMA public, extensions TO service_role;
GRANT SELECT ON public.profiles, public.service_types, public.team_verification_requirements,
  public.rescue_teams, public.provider_members, public.team_capabilities,
  public.team_verification_checks TO service_role;
GRANT UPDATE (role) ON public.profiles TO service_role;
GRANT INSERT ON public.rescue_teams, public.provider_members, public.team_capabilities,
  public.team_verification_checks TO service_role;
GRANT UPDATE (status, verified_by, verified_at) ON public.rescue_teams TO service_role;
-- END TEST SETUP PERMISSIONS
`;

const setupVerificationSql = String.raw`DO $setup_permissions_check$
DECLARE
  target_table TEXT;
  target_column TEXT;
BEGIN
  IF NOT has_schema_privilege('service_role', 'public', 'USAGE')
    OR NOT has_schema_privilege('service_role', 'extensions', 'USAGE') THEN
    RAISE EXCEPTION 'TEST_SETUP_SCHEMA_USAGE_MISSING';
  END IF;
  FOREACH target_table IN ARRAY ARRAY['profiles', 'service_types', 'team_verification_requirements',
    'rescue_teams', 'provider_members', 'team_capabilities', 'team_verification_checks'] LOOP
    IF NOT has_table_privilege('service_role', 'public.' || target_table, 'SELECT') THEN
      RAISE EXCEPTION 'TEST_SETUP_SELECT_MISSING: %', target_table;
    END IF;
  END LOOP;
  FOREACH target_table IN ARRAY ARRAY['rescue_teams', 'provider_members',
    'team_capabilities', 'team_verification_checks'] LOOP
    IF NOT has_table_privilege('service_role', 'public.' || target_table, 'INSERT') THEN
      RAISE EXCEPTION 'TEST_SETUP_INSERT_MISSING: %', target_table;
    END IF;
  END LOOP;
  IF NOT has_column_privilege('service_role', 'public.profiles', 'role', 'UPDATE') THEN
    RAISE EXCEPTION 'TEST_SETUP_PROFILE_ROLE_UPDATE_MISSING';
  END IF;
  FOREACH target_column IN ARRAY ARRAY['status', 'verified_by', 'verified_at'] LOOP
    IF NOT has_column_privilege('service_role', 'public.rescue_teams', target_column, 'UPDATE') THEN
      RAISE EXCEPTION 'TEST_SETUP_TEAM_UPDATE_MISSING: %', target_column;
    END IF;
  END LOOP;
END;
$setup_permissions_check$;
`;

function setupPermissionsBlock() {
  return `${setupGrantsSql}\n${setupVerificationSql}`;
}

module.exports = { setupGrantsSql, setupVerificationSql, setupPermissionsBlock };
