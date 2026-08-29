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
const verify = fs.readFileSync(path.join(process.cwd(), 'scripts', '02_verify_rls.sql'), 'utf8');
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
