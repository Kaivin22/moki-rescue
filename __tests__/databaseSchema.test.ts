import fs from 'node:fs';
import path from 'node:path';

const schema = fs.readFileSync(
  path.join(
    process.cwd(),
    'backend',
    'src',
    'main',
    'resources',
    'db',
    'migration',
    'B1__initial_schema.sql',
  ),
  'utf8',
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateVerification } = require('../scripts/database-checks.cjs');
const verify: string = generateVerification();
const qualityService = fs.readFileSync(
  path.join(
    process.cwd(),
    'backend',
    'src',
    'main',
    'java',
    'com',
    'danang',
    'motorescue',
    'service',
    'QualityService.java',
  ),
  'utf8',
);

describe('Moki Rescue schema contract', () => {
  it('contains the rescue state machine and atomic acceptance function', () => {
    expect(schema).toContain('awaiting_arrival_confirmation');
    expect(schema).toContain('awaiting_completion');
    expect(schema).toContain('api_accept_dispatch_offer');
    expect(schema).toContain('FOR UPDATE');
    expect(schema).toContain('FOR UPDATE OF pm');
    expect(schema).toContain('rescue_requests_one_active_provider_idx');
    expect(schema).toContain("OLD.work_type = 'transport'");
  });

  it('does not expose business mutations to authenticated clients', () => {
    expect(schema).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated');
    expect(verify).toContain('DIRECT_BUSINESS_MUTATION_GRANTED');
    expect(schema).toContain('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public');
  });

  it('does not expose sensitive business reads through PostgREST', () => {
    expect(schema).toContain('GRANT SELECT ON public.profiles TO authenticated');
    expect(schema).not.toContain('GRANT SELECT ON public.profiles, public.provider_members');
    expect(verify).toContain('SENSITIVE_POSTGREST_READ_GRANTED');
  });

  it('does not contain legacy travel, VIP or voting RPCs', () => {
    expect(schema).not.toContain('vote_shared_itinerary');
    expect(schema).not.toContain('vip_subscriptions');
    expect(schema).not.toContain('itineraries');
    expect(schema).not.toContain('evidence_path');
  });

  it('stores only an operator-approved provider contact number', () => {
    expect(schema).toContain('contact_phone_e164');
    expect(schema).toContain("contact_phone_e164 ~ '^\\+[1-9][0-9]{7,14}$'");
    expect(schema).not.toContain('auth.users.phone');
  });

  it('requires GPS accuracy and exposes account lookup only to the backend', () => {
    expect(schema).toContain('accuracy_m NUMERIC(8,2) NOT NULL');
    expect(schema).toContain('api_lookup_account_by_phone');
    expect(schema).toContain(
      'GRANT EXECUTE ON FUNCTION public.api_lookup_account_by_phone(TEXT) TO motorescue_api',
    );
    expect(schema).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.api_lookup_account_by_phone(TEXT) TO authenticated',
    );
    expect(verify).toContain('MOTORESCUE_API_ACCOUNT_LOOKUP_GRANT_MISSING');
  });

  it('verifies that the migrated profile schema exposes only three roles', () => {
    expect(verify).toContain('UNEXPECTED_PROFILE_ROLE_CONSTRAINT');
    expect(verify).toContain("role NOT IN ('customer', 'provider', 'admin')");
  });

  it('records structured cancellation policy without retaining a cancellation location', () => {
    expect(schema).toContain('cancellation_code TEXT');
    expect(schema).toContain('cancellation_stage TEXT');
    expect(schema).toContain("'arrival_disputed', 'reassignment', 'operational'");
    expect(schema).toContain('is_late_cancellation BOOLEAN NOT NULL DEFAULT FALSE');
    expect(schema).toContain('provider_near_pickup_on_cancel BOOLEAN');
    expect(schema).not.toContain('cancellation_latitude');
    expect(verify).toContain("('rescue_requests', 'cancellation_code')");
  });

  it('uses a least-privilege backend login and stores no assistant content', () => {
    expect(schema).toContain('CREATE ROLE motorescue_api');
    expect(schema).toContain('NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS');
    expect(schema).toContain('REVOKE ALL ON SCHEMA public FROM motorescue_api');
    expect(schema).toContain('CREATE TABLE public.assistant_usage_events');
    expect(schema).not.toMatch(/assistant_usage_events[\s\S]{0,300}\b(message|prompt|reply|content)\s+TEXT/i);
    expect(verify).toContain('MOTORESCUE_API_HAS_DDL_PRIVILEGE');
  });

  it('binds push tokens to a stable app installation', () => {
    expect(schema).toContain('installation_id UUID NOT NULL UNIQUE');
    expect(verify).toContain("('push_devices', 'installation_id')");
  });

  it('tracks Expo push receipts without exposing message content to clients', () => {
    expect(schema).toContain('CREATE TABLE public.push_delivery_receipts');
    expect(schema).toContain('expo_ticket_id TEXT NOT NULL UNIQUE');
    expect(schema).toContain('push_delivery_receipts_no_client_access');
    expect(schema).not.toMatch(
      /push_delivery_receipts[\s\S]{0,500}\b(title|body|message|payload|expo_push_token)\s+TEXT/i,
    );
    expect(verify).toContain('MOTORESCUE_API_PUSH_RECEIPT_GRANT_MISSING');
    expect(verify).toContain('PUSH_RECEIPT_SENSITIVE_COLUMN_FOUND');
    expect(verify).toContain('purge_push_delivery_receipts');
  });

  it('allows only the backend role to maintain the service catalog', () => {
    expect(schema).toContain('GRANT SELECT, UPDATE ON public.service_types TO motorescue_api');
    expect(schema).toContain("'trail-sign-outline'");
    expect(verify).toContain('MOTORESCUE_API_CATALOG_GRANT_MISSING');
  });

  it('binds reputation to the team that handled the request and keeps suspension manual', () => {
    expect(schema).toContain('team_id UUID NOT NULL REFERENCES public.rescue_teams');
    expect(schema).toContain('CREATE TABLE public.team_quality_alerts');
    expect(schema).toContain('team_quality_alerts_one_open_idx');
    expect(schema).toContain("status TEXT NOT NULL DEFAULT 'open'");
    expect(schema).toContain('moderation_note TEXT');
    expect(qualityService).toContain('policy.alertSeverity');
    expect(qualityService).toContain('quality.warning.issued');
    expect(qualityService).not.toContain("SET status = 'suspended'");
    expect(verify).toContain('MOTORESCUE_API_QUALITY_ALERT_GRANT_MISSING');
  });

  it('keeps provider onboarding closed and auditable without storing identity documents', () => {
    expect(schema).toContain('CREATE TABLE public.team_verification_requirements');
    expect(schema).toContain('CREATE TABLE public.team_verification_checks');
    expect(schema).toContain('partner_reference TEXT NOT NULL UNIQUE');
    expect(schema).toContain("'partnership_verified'");
    expect(schema).not.toContain('contract_reference');
    expect(schema).not.toContain("'partner_agreement'");
    expect(schema).toContain("'provider_roster'");
    expect(schema).toContain("'customer'");
    expect(schema).toContain('verified_by UUID REFERENCES public.profiles');
    expect(schema).not.toMatch(
      /\b(cccd|citizen_id|driver_license|contract_file|contract_path)\s+(TEXT|UUID|BYTEA)/i,
    );
    expect(verify).toContain('MOTORESCUE_API_PARTNER_VERIFICATION_GRANT_MISSING');
    expect(verify).toContain('UNEXPECTED_PARTNER_VERIFICATION_REQUIREMENTS');
  });
});

const root = process.cwd();
const migrationDirectory = path.join(root, 'backend', 'src', 'main', 'resources', 'db', 'migration');
const migrationNames = fs
  .readdirSync(migrationDirectory)
  .filter((name) => name.endsWith('.sql'))
  .sort((left, right) => {
    const leftVersion = Number(left.match(/^[BV](\d+)__/)?.[1]);
    const rightVersion = Number(right.match(/^[BV](\d+)__/)?.[1]);
    return leftVersion - rightVersion;
  });
const initialMigration = schema;
const roleMergeMigration = fs.readFileSync(
  path.join(migrationDirectory, 'V5__merge_dispatcher_into_admin.sql'),
  'utf8',
);
const fairDispatchMigration = fs.readFileSync(
  path.join(migrationDirectory, 'V7__configurable_fair_dispatch.sql'),
  'utf8',
);
const applicationConfig = fs.readFileSync(
  path.join(root, 'backend', 'src', 'main', 'resources', 'application.yml'),
  'utf8',
);

describe('versioned database migrations', () => {
  it('keeps the squashed schema as the immutable clean-database baseline', () => {
    expect(migrationNames[0]).toBe('B1__initial_schema.sql');
    expect(initialMigration).toContain('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions');
    expect(initialMigration).toContain('CREATE TABLE public.rescue_requests');
    expect(initialMigration).toContain('ALTER TABLE public.rescue_requests ENABLE ROW LEVEL SECURITY');
    expect(initialMigration).not.toMatch(/^\s*BEGIN;/m);
    expect(initialMigration).not.toMatch(/^\s*COMMIT;/m);
  });

  it('uses unique, increasing versions for every SQL migration', () => {
    expect(migrationNames.every((name) => /^[BV]\d+__[a-z0-9_]+\.sql$/.test(name))).toBe(true);

    const versions = migrationNames.map((name) => Number(name.match(/^[BV](\d+)__/)?.[1]));
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort((left, right) => left - right));
  });

  it('migrates legacy dispatchers and restricts profiles to three roles', () => {
    expect(roleMergeMigration).toContain("SET role = 'admin'");
    expect(roleMergeMigration).toContain("WHERE role = 'dispatcher'");
    expect(roleMergeMigration).toContain("CHECK (role IN ('customer', 'provider', 'admin'))");
  });

  it('stores per-service dispatch policy and protects provider fairness state', () => {
    expect(fairDispatchMigration).toContain('matching_eta_window_seconds');
    expect(fairDispatchMigration).toContain('matching_starvation_skip_threshold');
    expect(fairDispatchMigration).toContain('CREATE TABLE public.provider_dispatch_stats');
    expect(fairDispatchMigration).toContain('provider_dispatch_stats_no_client_access');
    expect(fairDispatchMigration).toContain(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_dispatch_stats TO motorescue_api',
    );
  });

  it('does not silently baseline or permit Flyway clean', () => {
    expect(applicationConfig).toContain('baseline-on-migrate: false');
    expect(applicationConfig).toContain('clean-disabled: true');
    expect(applicationConfig).toContain('validate-migration-naming: true');
  });
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generate } = require('../scripts/build-init-sql.cjs');
const read = (name: string) => fs.readFileSync(path.join(process.cwd(), name), 'utf8').replace(/\r\n/g, '\n');
const migration = read('backend/src/main/resources/db/migration/V9__align_demo_service_coverage.sql');
const shopMigration = read(
  'backend/src/main/resources/db/migration/V10__shop_dispatch_and_provider_approval.sql',
);

describe('service coverage wiring (static contracts, not PostgreSQL execution)', () => {
  it('defines the demo coverage envelope without depending on local routing files', () => {
    expect(migration).toContain('NOT the administrative boundary of Da Nang');
    expect(migration).toContain('extensions.ST_MakeEnvelope(108.05, 15.95, 108.34, 16.18, 4326)');
    expect(migration).toContain('latitude BETWEEN 15.95 AND 16.18 AND longitude BETWEEN 108.05 AND 108.34');
    expect(migration).toContain('zone.boundary::extensions.geometry');
    expect(migration).toContain('WHERE zone.is_active');
  });

  it('shares coverage across customer validation, matching and final assignment', () => {
    expect(read('backend/src/main/java/com/danang/motorescue/service/ServiceAreaService.java')).toContain(
      'public.api_is_in_service_area(?, ?)',
    );
    expect(read('backend/src/main/java/com/danang/motorescue/service/DispatchService.java')).toContain(
      'public.api_is_in_service_area(team.base_latitude, team.base_longitude)',
    );
    expect(migration).toContain('OFFER_OUTSIDE_SERVICE_AREA');
    expect(migration).toContain("NEW.status = 'assigned'");
    expect(migration).toContain('NEW.destination_latitude, NEW.destination_longitude');
  });

  it('includes coverage in the complete atomic installer without a separate patch', () => {
    const init = generate();
    expect(init).toContain(migration);
    expect(init).toContain('DATABASE_ALREADY_MANAGED_BY_FLYWAY');
    expect(init).toMatch(/^BEGIN;/m);
    expect(init).toMatch(/^COMMIT;/m);
    expect(migration).not.toMatch(/DROP SCHEMA|UPDATE auth\.|SET status = 'cancelled'/);
  });

  it('keeps the region policy private and stops stale provider readiness', () => {
    expect(migration).toContain('FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('TO motorescue_api');
    expect(migration).toContain('WHERE is_available AND NOT public.api_is_in_service_area');
    expect(shopMigration).toContain('public.api_is_in_service_area(team.base_latitude, team.base_longitude)');
    expect(shopMigration).not.toContain('pm.last_latitude');
    const cleanup = read('src/features/rescue/services/availabilityBackgroundLocation.ts');
    expect(cleanup).toContain('stopLocationUpdatesAsync');
    expect(cleanup).not.toContain('startLocationUpdatesAsync');
    expect(cleanup).not.toContain('requestBackgroundPermissionsAsync');
  });
  it('upgrades shop dispatch atomically and never silently approves existing members', () => {
    expect(generate()).toContain(shopMigration);
    expect(shopMigration).not.toContain("SET status = 'active'");
    expect(shopMigration).not.toMatch(/DROP SCHEMA|UPDATE auth\./);
    expect(shopMigration).toContain("SET status = 'no_provider'");
  });
  it('rechecks the shop origin before publishing an OSRM offer', () => {
    const dispatch = read('backend/src/main/java/com/danang/motorescue/service/DispatchService.java');
    expect(dispatch).toContain('team.base_latitude = ? AND team.base_longitude = ?');
    expect(dispatch).toContain('FOR UPDATE OF pm');
    expect(dispatch).toContain('for (Ranked selected : ordered)');
    expect(dispatch).toContain('if (Boolean.TRUE.equals(offered)) return;');
    expect(dispatch).toContain('markNoProvider(requestId, false)');
    expect(read('backend/src/main/java/com/danang/motorescue/service/OperatorService.java')).toContain(
      'ORDER BY user_id FOR UPDATE',
    );
  });
});
