import fs from 'fs';
import path from 'path';

const schema = fs.readFileSync(path.join(process.cwd(), 'scripts', '01_schema.sql'), 'utf8');

describe('fresh Supabase production schema contract', () => {
  it('keeps itineraries private unless an owner enables a share capability', () => {
    expect(schema).toMatch(/visibility\s+TEXT NOT NULL DEFAULT 'private' CHECK \(visibility IN \('private','shared'\)\)/);
    expect(schema).not.toContain("visibility IN ('public', 'shared')");
    expect(schema).not.toContain('is_public');
    expect(schema).toContain('public.enable_itinerary_share');
    expect(schema).toContain('public.revoke_itinerary_share');
  });

  it('writes itinerary trees through one validated atomic RPC', () => {
    expect(schema).toContain('CREATE OR REPLACE FUNCTION public.upsert_itinerary');
    expect(schema).toContain("p_payload->>'expected_updated_at'");
    expect(schema).toContain('ITINERARY_EDIT_CONFLICT');
    expect(schema).toContain('ITINERARY_SLOT_TIME_CONFLICT');
    expect(schema).toContain('INVALID_PLACE_SELECTION');
    expect(schema).toContain('START_DATE_IN_PAST');
    expect(schema).toContain('PLACE_CLOSED_ON_DAY');
    expect(schema).toContain('PLACE_CLOSED_AT_TIME');
    expect(schema).toContain('OR v_start_min < 480 OR v_end_min > 1260');
    expect(schema).toContain("WHERE id = v_place_id AND is_active AND content_status = 'published'");
    expect(schema).not.toContain('CREATE OR REPLACE FUNCTION public.save_itinerary');
  });

  it('does not expose a clone RPC that can bypass new-trip validation', () => {
    expect(schema).not.toContain('CREATE OR REPLACE FUNCTION public.clone_itinerary');
    expect(schema).not.toContain('GRANT EXECUTE ON FUNCTION public.clone_itinerary');
  });

  it('returns an allowlisted shared payload without owner or token metadata', () => {
    const start = schema.indexOf('CREATE OR REPLACE FUNCTION public.get_shared_itinerary');
    const end = schema.indexOf('REVOKE ALL ON FUNCTION public.get_shared_itinerary', start);
    const body = schema.slice(start, end);
    expect(body).toContain("i.visibility = 'shared'");
    expect(body).toContain('i.share_expires_at > NOW()');
    expect(body).toContain("'author_name'");
    expect(body).not.toContain('to_jsonb(i)');
    expect(body).not.toMatch(/'share_token'/);
    expect(body).not.toMatch(/'user_id'/);
  });

  it('binds collaboration reads and votes to the active share token', () => {
    expect(schema).toContain('CREATE OR REPLACE FUNCTION public.vote_shared_itinerary');
    expect(schema).toContain('CREATE OR REPLACE FUNCTION public.get_shared_votes');
    expect(schema).toContain("i.share_token::TEXT = trim(p_share_token)");
    expect(schema).toContain("voting_status = 'open'");
    expect(schema).not.toContain('voter_token');
  });

  it('searches only published places with server filters and bounded pagination', () => {
    expect(schema).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    expect(schema).toContain('extensions.similarity(p.normalized_name, i.q) >= 0.2');
    expect(schema).toContain('p.suitable_for && p_suitable_for');
    expect(schema).toContain("timezone('Asia/Ho_Chi_Minh', NOW())");
    expect(schema).toContain('LIMIT LEAST(GREATEST(p_limit, 1), 100)');
    expect(schema).toContain('OFFSET GREATEST(p_offset, 0)');
  });

  it('enforces the editor review workflow and admin-only public media writes', () => {
    expect(schema).toContain('public.submit_place_revision');
    expect(schema).toContain('public.review_place_revision');
    expect(schema).toContain('Create a draft revision instead of editing published content');
    expect(schema).toContain('Admins upload published place images');
    expect(schema).toContain('bucket_id = \'place-images\'');
    expect(schema).toContain('(storage.foldername(name))[1] = auth.uid()::TEXT');
  });

  it('protects review aggregates and exposes audited moderation/helpful flows', () => {
    expect(schema).toContain('public.update_place_rating');
    expect(schema).toContain('AND NOT is_flagged');
    expect(schema).toContain('public.update_review_helpful_count');
    expect(schema).toContain('public.admin_moderate_review');
    expect(schema).toContain('View own helpful votes');
    expect(schema).toContain('Insert helpful on others reviews');
  });

  it('uses atomic audited admin operations for access, tickets and reports', () => {
    expect(schema).toContain('public.admin_set_user_access');
    expect(schema).toContain('CANNOT_REMOVE_OWN_ADMIN_ACCESS');
    expect(schema).toContain('LAST_ADMIN_REQUIRED');
    expect(schema).toContain('public.admin_reply_and_resolve_ticket');
    expect(schema).toContain('public.admin_resolve_place_report');
    expect(schema).toContain("VALUES (auth.uid(), 'reply_and_update_ticket'");
    expect(schema).toContain("VALUES (auth.uid(), 'resolve_place_report'");
  });

  it('creates complete profiles and records the accepted legal version', () => {
    expect(schema).toContain('CREATE OR REPLACE FUNCTION public.handle_new_user');
    expect(schema).toContain("left(COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), 'Du khách'), 80)");
    expect(schema).toContain('terms_accepted_at');
    expect(schema).not.toContain('EXCEPTION WHEN OTHERS');
  });

  it('prevents clients from changing role, VIP, quota and legal audit fields', () => {
    expect(schema).toContain('public.profile_system_fields_unchanged');
    expect(schema).toContain('old.ai_msg_count IS NOT DISTINCT FROM p_ai_msg_count');
    expect(schema).toContain('old.terms_accepted_at IS NOT DISTINCT FROM p_terms_accepted_at');
    expect(schema).toContain('old.is_banned IS NOT DISTINCT FROM p_is_banned');
  });

  it('stores bounded titled AI history under owner-only policies', () => {
    expect(schema).toContain("title      TEXT NOT NULL DEFAULT 'Cuộc trò chuyện mới'");
    expect(schema).toContain('octet_length(messages::TEXT) <= 100000');
    expect(schema).toContain('View own AI sessions');
    expect(schema).toContain('Insert own AI sessions');
  });

  it('models verified subscriptions without permitting client payment events', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.vip_subscriptions');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.payment_events');
    expect(schema).toContain('UNIQUE (provider, provider_transaction_id)');
    expect(schema).toContain('REVOKE ALL ON public.payment_events FROM anon, authenticated');
    expect(schema).not.toContain('CREATE POLICY "Users create vip transactions"');
  });

  it('uses explicit grants and deny-by-default future privileges', () => {
    expect(schema).toContain('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated');
    expect(schema).toContain('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC');
    expect(schema).toContain('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE');
    expect(schema).not.toContain('GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon');
  });
});
