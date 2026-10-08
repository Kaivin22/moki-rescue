-- Kiểm tra trạng thái ĐẾN V10; không dùng để xác minh schema legacy chỉ ở B1.
-- Chỉ đọc metadata và một số bất biến dữ liệu; không thay thế test RLS bằng JWT.
BEGIN TRANSACTION READ ONLY;

DO $$
DECLARE
  table_name TEXT;
  missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'rescue_teams', 'team_verification_requirements', 'team_verification_checks',
    'service_types', 'service_zones', 'provider_members', 'team_capabilities',
    'rescue_requests', 'dispatch_offers', 'quotes', 'request_status_events',
    'case_attention_flags', 'request_feedback_events', 'provider_location_checkpoints',
    'reviews', 'incident_reports', 'team_quality_alerts', 'push_devices',
    'push_delivery_receipts', 'audit_logs', 'assistant_usage_events', 'api_rate_limit_windows',
    'provider_dispatch_stats', 'dispatch_recovery_jobs', 'push_outbox'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NULL THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;

  IF cardinality(missing_tables) > 0 THEN
    RAISE EXCEPTION 'MISSING_TABLES: %', array_to_string(missing_tables, ', ');
  END IF;
END;
$$;

DO $$
DECLARE
  missing_columns TEXT;
BEGIN
  SELECT string_agg(required.table_name || '.' || required.column_name, ', ' ORDER BY 1)
  INTO missing_columns
  FROM (VALUES
    ('rescue_teams', 'partner_reference'),
    ('rescue_teams', 'verified_by'),
    ('rescue_teams', 'verified_at'),
    ('team_verification_checks', 'checked_by'),
    ('team_verification_checks', 'checked_at'),
    ('provider_members', 'contact_phone_e164'),
    ('provider_members', 'location_accuracy_m'),
    ('provider_members', 'available_since'),
    ('provider_location_checkpoints', 'accuracy_m'),
    ('service_types', 'label_en'),
    ('service_types', 'description_en'),
    ('service_types', 'requires_destination'),
    ('service_types', 'matching_eta_window_seconds'),
    ('service_types', 'matching_eta_weight'),
    ('service_types', 'matching_experience_weight'),
    ('service_types', 'matching_waiting_weight'),
    ('service_types', 'matching_recent_cases_weight'),
    ('service_types', 'matching_experience_reference_cases'),
    ('service_types', 'matching_waiting_reference_seconds'),
    ('service_types', 'matching_recent_window_days'),
    ('service_types', 'matching_recent_reference_cases'),
    ('service_types', 'matching_starvation_skip_threshold'),
    ('service_types', 'matching_offer_ttl_seconds'),
    ('provider_dispatch_stats', 'consecutive_skips'),
    ('provider_dispatch_stats', 'last_offered_at'),
    ('dispatch_recovery_jobs', 'lease_id'),
    ('dispatch_recovery_jobs', 'available_at'),
    ('push_outbox', 'state'),
    ('push_outbox', 'expires_at'),
    ('push_outbox', 'lease_id'),
    ('service_zones', 'boundary'),
    ('rescue_requests', 'pickup_location'),
    ('rescue_requests', 'pickup_source'),
    ('rescue_requests', 'pickup_accuracy_m'),
    ('rescue_requests', 'assigned_provider_latitude'),
    ('rescue_requests', 'assigned_provider_longitude'),
    ('rescue_requests', 'assigned_provider_accuracy_m'),
    ('rescue_requests', 'assigned_provider_position_at'),
    ('rescue_requests', 'destination_location'),
    ('rescue_requests', 'work_type'),
    ('rescue_requests', 'cancellation_code'),
    ('rescue_requests', 'cancellation_stage'),
    ('rescue_requests', 'is_late_cancellation'),
    ('rescue_requests', 'provider_near_pickup_on_cancel'),
    ('rescue_requests', 'cancelled_by'),
    ('push_devices', 'installation_id'),
    ('push_delivery_receipts', 'push_device_id'),
    ('push_delivery_receipts', 'expo_ticket_id'),
    ('push_delivery_receipts', 'status'),
    ('push_delivery_receipts', 'next_check_at'),
    ('push_delivery_receipts', 'attempt_count'),
    ('reviews', 'team_id'),
    ('reviews', 'moderation_note'),
    ('incident_reports', 'resolution_note'),
    ('team_quality_alerts', 'review_count_checkpoint')
  ) AS required(table_name, column_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns column_info
    WHERE column_info.table_schema = 'public'
      AND column_info.table_name = required.table_name
      AND column_info.column_name = required.column_name
  );

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'MISSING_REQUIRED_COLUMNS: %', missing_columns;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'push_delivery_receipts'
      AND column_name IN (
        'expo_push_token', 'title', 'body', 'message', 'payload', 'request_id', 'latitude', 'longitude'
      )
  ) THEN
    RAISE EXCEPTION 'PUSH_RECEIPT_SENSITIVE_COLUMN_FOUND';
  END IF;
END;
$$;

DO $$
DECLARE
  missing_indexes TEXT;
BEGIN
  SELECT string_agg(required.index_name, ', ' ORDER BY required.index_name)
  INTO missing_indexes
  FROM (VALUES
    ('rescue_requests_one_active_customer_idx'),
    ('rescue_requests_one_active_provider_idx'),
    ('rescue_requests_pickup_gix'),
    ('rescue_requests_destination_gix'),
    ('service_zones_boundary_gix'),
    ('provider_members_location_gix'),
    ('push_devices_installation_id_key'),
    ('push_delivery_receipts_pending_idx'),
    ('provider_dispatch_stats_service_skips_idx'),
    ('dispatch_offers_provider_accepted_recent_idx'),
    ('rescue_requests_provider_service_completed_idx'),
    ('dispatch_recovery_due_idx'),
    ('push_outbox_due_idx'),
    ('push_outbox_retention_idx')
  ) AS required(index_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indexrelid = to_regclass('public.' || required.index_name)
      AND i.indisvalid AND i.indisready
  );

  IF missing_indexes IS NOT NULL THEN
    RAISE EXCEPTION 'MISSING_SAFETY_INDEXES: %', missing_indexes;
  END IF;
END;
$$;

DO $$
DECLARE
  unprotected TEXT;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO unprotected
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND c.relname IN (
      'profiles', 'rescue_teams', 'team_verification_requirements', 'team_verification_checks',
      'service_types', 'service_zones', 'provider_members', 'team_capabilities',
      'rescue_requests', 'dispatch_offers', 'quotes', 'request_status_events',
      'case_attention_flags', 'request_feedback_events', 'provider_location_checkpoints',
      'reviews', 'incident_reports', 'team_quality_alerts', 'push_devices',
      'push_delivery_receipts', 'audit_logs', 'assistant_usage_events', 'api_rate_limit_windows',
      'provider_dispatch_stats', 'dispatch_recovery_jobs', 'push_outbox'
    )
    AND NOT c.relrowsecurity;

  IF unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'RLS_DISABLED_ON: %', unprotected;
  END IF;
END;
$$;

DO $$
DECLARE
  exposed_function TEXT;
BEGIN
  SELECT p.proname
  INTO exposed_function
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR (
        has_function_privilege('authenticated', p.oid, 'EXECUTE')
        AND p.proname NOT IN (
          'current_profile_role', 'is_dispatch_staff',
          'can_view_request', 'can_access_realtime_topic'
        )
      )
    )
  LIMIT 1;

  IF exposed_function IS NOT NULL THEN
    RAISE EXCEPTION 'UNEXPECTED_CLIENT_FUNCTION_EXECUTE: %', exposed_function;
  END IF;

  IF NOT has_function_privilege(
    'authenticated', 'public.can_access_realtime_topic(text,boolean)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'REALTIME_AUTH_FUNCTION_NOT_EXECUTABLE';
  END IF;
END;
$$;

DO $$
DECLARE
  role_constraint TEXT;
BEGIN
  SELECT pg_get_constraintdef(constraint_record.oid)
  INTO role_constraint
  FROM pg_constraint constraint_record
  WHERE constraint_record.conrelid = 'public.profiles'::regclass
    AND constraint_record.conname = 'profiles_role_check';

  IF role_constraint IS NULL
    OR role_constraint LIKE '%dispatcher%'
    OR role_constraint NOT LIKE '%customer%'
    OR role_constraint NOT LIKE '%provider%'
    OR role_constraint NOT LIKE '%admin%' THEN
    RAISE EXCEPTION 'UNEXPECTED_PROFILE_ROLE_CONSTRAINT: %', role_constraint;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE role NOT IN ('customer', 'provider', 'admin')
  ) THEN
    RAISE EXCEPTION 'UNEXPECTED_PROFILE_ROLE_VALUE';
  END IF;
END;
$$;

DO $$
DECLARE
  unsafe_grants TEXT;
BEGIN
  SELECT string_agg(table_name || ':' || privilege_type, ', ' ORDER BY table_name, privilege_type)
  INTO unsafe_grants
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee IN ('anon', 'authenticated')
    AND table_name IN (
      'rescue_teams', 'team_verification_requirements', 'team_verification_checks',
      'service_types', 'service_zones', 'provider_members', 'team_capabilities', 'rescue_requests',
      'dispatch_offers', 'quotes', 'request_status_events', 'case_attention_flags',
      'request_feedback_events', 'provider_location_checkpoints', 'reviews', 'incident_reports',
      'team_quality_alerts', 'push_devices', 'push_delivery_receipts',
      'audit_logs', 'assistant_usage_events', 'api_rate_limit_windows', 'provider_dispatch_stats'
    )
    AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');

  IF unsafe_grants IS NOT NULL THEN
    RAISE EXCEPTION 'DIRECT_BUSINESS_MUTATION_GRANTED: %', unsafe_grants;
  END IF;
END;
$$;

DO $$
DECLARE
  exposed_reads TEXT;
BEGIN
  SELECT string_agg(table_name, ', ' ORDER BY table_name)
  INTO exposed_reads
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND grantee IN ('anon', 'authenticated')
    AND privilege_type = 'SELECT'
    AND table_name IN (
      'rescue_teams', 'team_verification_requirements', 'team_verification_checks',
      'service_types', 'service_zones', 'provider_members', 'team_capabilities',
      'rescue_requests', 'dispatch_offers', 'quotes', 'request_status_events',
      'case_attention_flags', 'request_feedback_events', 'provider_location_checkpoints',
      'reviews', 'incident_reports', 'team_quality_alerts', 'push_devices',
      'push_delivery_receipts', 'audit_logs', 'assistant_usage_events', 'api_rate_limit_windows',
      'provider_dispatch_stats'
    );

  IF exposed_reads IS NOT NULL THEN
    RAISE EXCEPTION 'SENSITIVE_POSTGREST_READ_GRANTED: %', exposed_reads;
  END IF;
END;
$$;

DO $$
DECLARE
  missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF to_regprocedure('public.current_profile_role()') IS NULL THEN
    missing_functions := array_append(missing_functions, 'current_profile_role');
  END IF;
  IF to_regprocedure('public.can_view_request(uuid)') IS NULL THEN
    missing_functions := array_append(missing_functions, 'can_view_request');
  END IF;
  IF to_regprocedure('public.api_accept_dispatch_offer(uuid,uuid,integer)') IS NULL THEN
    missing_functions := array_append(missing_functions, 'api_accept_dispatch_offer');
  END IF;
  IF to_regprocedure('public.api_lookup_account_by_phone(text)') IS NULL THEN
    missing_functions := array_append(missing_functions, 'api_lookup_account_by_phone');
  END IF;
  IF to_regprocedure('public.purge_expired_location_checkpoints(interval)') IS NULL THEN
    missing_functions := array_append(missing_functions, 'purge_expired_location_checkpoints');
  END IF;
  IF to_regprocedure('public.minimize_closed_request_data(interval)') IS NULL THEN
    missing_functions := array_append(missing_functions, 'minimize_closed_request_data');
  END IF;
  IF to_regprocedure('public.purge_assistant_usage_events(interval)') IS NULL THEN
    missing_functions := array_append(missing_functions, 'purge_assistant_usage_events');
  END IF;
  IF to_regprocedure('public.purge_push_delivery_receipts(interval)') IS NULL THEN
    missing_functions := array_append(missing_functions, 'purge_push_delivery_receipts');
  END IF;

  IF cardinality(missing_functions) > 0 THEN
    RAISE EXCEPTION 'MISSING_SECURITY_FUNCTIONS: %', array_to_string(missing_functions, ', ');
  END IF;
END;
$$;

DO $$
DECLARE
  exposed_rpc TEXT;
BEGIN
  SELECT p.proname
  INTO exposed_rpc
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'api_accept_dispatch_offer', 'purge_expired_location_checkpoints',
      'minimize_closed_request_data', 'purge_assistant_usage_events',
      'purge_push_delivery_receipts'
    )
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    )
  LIMIT 1;

  IF exposed_rpc IS NOT NULL THEN
    RAISE EXCEPTION 'PRIVILEGED_RPC_EXPOSED_TO_CLIENT: %', exposed_rpc;
  END IF;
END;
$$;

DO $$
DECLARE
  missing_policy_tables TEXT;
BEGIN
  SELECT string_agg(required.table_name, ', ' ORDER BY required.table_name)
  INTO missing_policy_tables
  FROM (VALUES
    ('profiles'), ('rescue_teams'), ('team_verification_requirements'),
    ('team_verification_checks'), ('service_types'), ('service_zones'), ('provider_members'),
    ('team_capabilities'), ('rescue_requests'), ('dispatch_offers'), ('quotes'),
    ('request_status_events'), ('case_attention_flags'), ('request_feedback_events'),
    ('provider_location_checkpoints'), ('reviews'), ('incident_reports'), ('team_quality_alerts'),
    ('push_devices'), ('push_delivery_receipts'), ('audit_logs'), ('assistant_usage_events'),
    ('api_rate_limit_windows'), ('provider_dispatch_stats')
  ) AS required(table_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = required.table_name
  );

  IF missing_policy_tables IS NOT NULL THEN
    RAISE EXCEPTION 'TABLE_WITHOUT_POLICY: %', missing_policy_tables;
  END IF;
END;
$$;

DO $$
DECLARE
  runtime_role RECORD;
BEGIN
  SELECT rolname, rolcanlogin, rolinherit, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
  INTO runtime_role
  FROM pg_roles
  WHERE rolname = 'motorescue_api';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MOTORESCUE_API_ROLE_MISSING';
  END IF;
  IF runtime_role.rolsuper OR runtime_role.rolcreatedb OR runtime_role.rolcreaterole
    OR runtime_role.rolreplication OR NOT runtime_role.rolbypassrls
    OR NOT runtime_role.rolcanlogin OR runtime_role.rolinherit THEN
    RAISE EXCEPTION 'MOTORESCUE_API_ROLE_UNSAFE';
  END IF;
  IF has_schema_privilege('motorescue_api', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'MOTORESCUE_API_HAS_DDL_PRIVILEGE';
  END IF;
  IF NOT has_schema_privilege('motorescue_api', 'extensions', 'USAGE') THEN
    RAISE EXCEPTION 'MOTORESCUE_API_EXTENSION_USAGE_MISSING';
  END IF;
  IF NOT (
    has_table_privilege('motorescue_api', 'public.assistant_usage_events', 'SELECT')
    AND has_table_privilege('motorescue_api', 'public.assistant_usage_events', 'INSERT')
    AND has_table_privilege('motorescue_api', 'public.assistant_usage_events', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_ASSISTANT_GRANT_MISSING';
  END IF;
  IF NOT (
    has_table_privilege('motorescue_api', 'public.api_rate_limit_windows', 'SELECT')
    AND has_table_privilege('motorescue_api', 'public.api_rate_limit_windows', 'INSERT')
    AND has_table_privilege('motorescue_api', 'public.api_rate_limit_windows', 'UPDATE')
    AND has_table_privilege('motorescue_api', 'public.api_rate_limit_windows', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_RATE_LIMIT_GRANT_MISSING';
  END IF;
  IF NOT (
    has_table_privilege('motorescue_api', 'public.provider_dispatch_stats', 'SELECT')
    AND has_table_privilege('motorescue_api', 'public.provider_dispatch_stats', 'INSERT')
    AND has_table_privilege('motorescue_api', 'public.provider_dispatch_stats', 'UPDATE')
    AND has_table_privilege('motorescue_api', 'public.provider_dispatch_stats', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_DISPATCH_STATS_GRANT_MISSING';
  END IF;
  IF NOT (
    has_table_privilege('motorescue_api', 'public.service_types', 'SELECT')
    AND has_table_privilege('motorescue_api', 'public.service_types', 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_CATALOG_GRANT_MISSING';
  END IF;
  IF NOT (
    has_table_privilege('motorescue_api', 'public.team_quality_alerts', 'SELECT')
    AND has_table_privilege('motorescue_api', 'public.team_quality_alerts', 'INSERT')
    AND has_table_privilege('motorescue_api', 'public.team_quality_alerts', 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_QUALITY_ALERT_GRANT_MISSING';
  END IF;
  IF NOT (
    has_table_privilege('motorescue_api', 'public.push_delivery_receipts', 'SELECT')
    AND has_table_privilege('motorescue_api', 'public.push_delivery_receipts', 'INSERT')
    AND has_table_privilege('motorescue_api', 'public.push_delivery_receipts', 'UPDATE')
    AND has_table_privilege('motorescue_api', 'public.push_delivery_receipts', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_PUSH_RECEIPT_GRANT_MISSING';
  END IF;
  IF NOT has_table_privilege(
    'motorescue_api', 'public.team_verification_requirements', 'SELECT'
  ) OR NOT (
    has_table_privilege('motorescue_api', 'public.team_verification_checks', 'SELECT')
    AND has_table_privilege('motorescue_api', 'public.team_verification_checks', 'INSERT')
    AND has_table_privilege('motorescue_api', 'public.team_verification_checks', 'UPDATE')
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_PARTNER_VERIFICATION_GRANT_MISSING';
  END IF;
  IF NOT has_function_privilege(
    'motorescue_api', 'public.api_lookup_account_by_phone(text)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_API_ACCOUNT_LOOKUP_GRANT_MISSING';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'provider_location_checkpoints'
      AND column_name = 'accuracy_m'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'CHECKPOINT_ACCURACY_MUST_BE_REQUIRED';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'profiles', 'rescue_teams', 'team_verification_checks',
        'provider_members', 'rescue_requests', 'audit_logs'
      )
      AND column_name IN (
        'cccd', 'citizen_id', 'driver_license', 'password', 'access_token', 'refresh_token',
        'contract_file', 'contract_path', 'identity_document_path'
      )
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_SENSITIVE_COLUMN_FOUND';
  END IF;
END;
$$;

DO $$
DECLARE
  missing_profile_count BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO missing_profile_count
  FROM auth.users auth_user
  LEFT JOIN public.profiles profile ON profile.id = auth_user.id
  WHERE profile.id IS NULL;

  IF missing_profile_count > 0 THEN
    RAISE EXCEPTION 'AUTH_USERS_WITHOUT_PROFILE: %', missing_profile_count;
  END IF;

  IF (SELECT COUNT(*) FROM public.service_types) <> 6 THEN
    RAISE EXCEPTION 'UNEXPECTED_SERVICE_CATALOG_SIZE';
  END IF;
  IF (SELECT COUNT(*) FROM public.team_verification_requirements WHERE is_active AND is_required) <> 6 THEN
    RAISE EXCEPTION 'UNEXPECTED_PARTNER_VERIFICATION_REQUIREMENTS';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger trigger_info
    WHERE trigger_info.tgrelid = 'auth.users'::regclass
      AND trigger_info.tgname = 'on_auth_user_created'
      AND trigger_info.tgenabled IN ('O', 'A')
      AND NOT trigger_info.tgisinternal
  ) THEN
    RAISE EXCEPTION 'AUTH_PROFILE_TRIGGER_MISSING';
  END IF;

  IF to_regclass('realtime.messages') IS NULL THEN
    RAISE EXCEPTION 'REALTIME_MESSAGES_TABLE_MISSING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'motorescue_realtime_read'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime' AND tablename = 'messages'
      AND policyname = 'motorescue_realtime_write'
  ) THEN
    RAISE EXCEPTION 'MOTORESCUE_REALTIME_POLICIES_MISSING';
  END IF;
END;
$$;

-- Hai bảng hàng đợi bật RLS nhưng cố ý không có policy client (deny-by-default).
-- Dùng effective privileges: phát hiện cả quyền qua PUBLIC hoặc role được kế thừa.
DO $$
DECLARE
  queue_name TEXT;
  client_role TEXT;
  privilege_name TEXT;
BEGIN
  FOREACH queue_name IN ARRAY ARRAY['dispatch_recovery_jobs', 'push_outbox'] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
        IF has_table_privilege(client_role, 'public.' || queue_name, privilege_name) THEN
          RAISE EXCEPTION 'QUEUE_EXPOSED: %.% %', client_role, queue_name, privilege_name;
        END IF;
      END LOOP;
      IF has_any_column_privilege(client_role, 'public.' || queue_name, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'QUEUE_COLUMN_EXPOSED: %.%', client_role, queue_name;
      END IF;
    END LOOP;
    FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      IF NOT has_table_privilege('motorescue_api', 'public.' || queue_name, privilege_name) THEN
        RAISE EXCEPTION 'QUEUE_RUNTIME_GRANT_MISSING: % %', queue_name, privilege_name;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

DO $$
DECLARE
  column_name TEXT;
  trigger_name TEXT;
BEGIN
  FOREACH column_name IN ARRAY ARRAY['id', 'role', 'is_active', 'deletion_requested_at'] LOOP
    IF has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE')
      OR has_column_privilege('anon', 'public.profiles', column_name, 'UPDATE') THEN
      RAISE EXCEPTION 'PROFILE_PRIVILEGED_COLUMN_WRITABLE: %', column_name;
    END IF;
  END LOOP;
  FOREACH trigger_name IN ARRAY ARRAY['rescue_requests_dispatch_recovery', 'rescue_requests_assignment_position', 'rescue_requests_service_area'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      WHERE t.tgrelid = 'public.rescue_requests'::regclass AND t.tgname = trigger_name
        AND NOT t.tgisinternal AND t.tgenabled IN ('O', 'A')
    ) THEN
      RAISE EXCEPTION 'REQUIRED_TRIGGER_MISSING_OR_DISABLED: %', trigger_name;
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF to_regprocedure('public.api_is_in_service_area(double precision,double precision)') IS NULL THEN
    RAISE EXCEPTION 'V9_SERVICE_COVERAGE_FUNCTION_MISSING';
  END IF;
  IF NOT has_function_privilege('motorescue_api',
    'public.api_is_in_service_area(double precision,double precision)', 'EXECUTE') THEN
    RAISE EXCEPTION 'SERVICE_COVERAGE_RUNTIME_GRANT_MISSING';
  END IF;
  IF public.api_is_in_service_area(16.180001, 108.20)
    OR public.api_is_in_service_area(15.949999, 108.20)
    OR public.api_is_in_service_area(16.06, 108.049999)
    OR public.api_is_in_service_area(16.06, 108.340001) THEN
    RAISE EXCEPTION 'SERVICE_AREA_EXCEEDS_DEMO_EXTRACT';
  END IF;
END;
$$;

DO $shop_contract$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = 'provider_members' AND column_name = 'status' AND column_default LIKE '%pending%')
    OR position('team.base_latitude' IN pg_get_functiondef('public.capture_assignment_position()'::regprocedure)) = 0
    OR position('team.base_latitude' IN pg_get_functiondef('public.enforce_assignment_service_area()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'V10_SHOP_DISPATCH_AND_APPROVAL_MISSING';
  END IF;
END;
$shop_contract$;
SELECT 'V10 schema/security checks passed; JWT and end-to-end tests still required' AS result;
COMMIT;
