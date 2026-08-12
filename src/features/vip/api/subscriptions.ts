import { supabase } from '@/src/services/supabase';
import type { Profile } from '@/src/types/profile';

export type VipBillingPeriod = 'month' | 'year';
export type VipProvider = 'app_store' | 'play_store' | 'admin_grant';
export type VipSubscriptionStatus =
  | 'pending'
  | 'active'
  | 'grace_period'
  | 'canceled'
  | 'expired'
  | 'refunded'
  | 'revoked';

export interface VipPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billing_period: VipBillingPeriod;
  billing_interval: number;
  apple_product_id: string | null;
  google_product_id: string | null;
  entitlements: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
}

export interface CreateVipPlanInput {
  code: string;
  name: string;
  description?: string;
  billingPeriod: VipBillingPeriod;
  billingInterval: number;
  appleProductId?: string;
  googleProductId?: string;
}

export interface VipSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  provider: VipProvider;
  status: VipSubscriptionStatus;
  auto_renew: boolean;
  started_at: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  ended_at: string | null;
  last_verified_at: string | null;
  plan: Pick<VipPlan, 'id' | 'code' | 'name' | 'billing_period' | 'billing_interval'> | null;
}

export async function getActiveVipPlans(): Promise<VipPlan[]> {
  const { data, error } = await supabase
    .from('vip_plans')
    .select('id, code, name, description, billing_period, billing_interval, apple_product_id, google_product_id, entitlements, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at');

  if (error) throw error;
  return (data ?? []) as VipPlan[];
}

export async function getAdminVipPlans(): Promise<VipPlan[]> {
  const { data, error } = await supabase
    .from('vip_plans')
    .select('id, code, name, description, billing_period, billing_interval, apple_product_id, google_product_id, entitlements, sort_order, is_active')
    .order('sort_order')
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as VipPlan[];
}

export async function createVipPlan(input: CreateVipPlanInput, adminId: string): Promise<void> {
  const code = input.code.trim().toLowerCase();
  const name = input.name.trim();
  const appleProductId = input.appleProductId?.trim() || null;
  const googleProductId = input.googleProductId?.trim() || null;
  if (!/^[a-z0-9][a-z0-9_-]{2,49}$/.test(code)) {
    throw new Error('Mã gói phải có 3–50 ký tự gồm chữ thường, số, dấu gạch ngang hoặc gạch dưới.');
  }
  if (!name || name.length > 100) throw new Error('Tên gói phải có từ 1 đến 100 ký tự.');
  if (!Number.isInteger(input.billingInterval) || input.billingInterval < 1 || input.billingInterval > 12) {
    throw new Error('Chu kỳ phải là số nguyên từ 1 đến 12.');
  }

  const { error } = await supabase.from('vip_plans').insert({
    code,
    name,
    description: input.description?.trim() || null,
    billing_period: input.billingPeriod,
    billing_interval: input.billingInterval,
    apple_product_id: appleProductId,
    google_product_id: googleProductId,
    is_active: false,
    created_by: adminId,
  });
  if (error) throw error;
}

export async function setVipPlanActive(plan: VipPlan, active: boolean): Promise<void> {
  if (active && !plan.apple_product_id && !plan.google_product_id) {
    throw new Error('Cần ít nhất một Apple hoặc Google Product ID trước khi bật bán.');
  }
  const { error } = await supabase.from('vip_plans').update({ is_active: active }).eq('id', plan.id);
  if (error) throw error;
}

export async function getUserVipSubscriptions(userId: string): Promise<VipSubscription[]> {
  const { data, error } = await supabase
    .from('vip_subscriptions')
    .select(`
      id, user_id, plan_id, provider, status, auto_renew,
      started_at, current_period_start, current_period_end,
      canceled_at, ended_at, last_verified_at,
      plan:vip_plans(id, code, name, billing_period, billing_interval)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as VipSubscription[];
}

export async function adminGrantVip(userId: string, planId: string, note?: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_grant_vip', {
    p_user_id: userId,
    p_plan_id: planId,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return data as string;
}

export async function adminExtendVip(subscriptionId: string, note?: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_extend_vip', {
    p_subscription_id: subscriptionId,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return data as string;
}

export async function adminRevokeVip(subscriptionId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('admin_revoke_vip', {
    p_subscription_id: subscriptionId,
    p_note: reason.trim(),
  });
  if (error) throw error;
}

export async function getCurrentVipSubscription(userId: string): Promise<VipSubscription | null> {
  const { data, error } = await supabase
    .from('vip_subscriptions')
    .select(`
      id, user_id, plan_id, provider, status, auto_renew,
      started_at, current_period_start, current_period_end,
      canceled_at, ended_at, last_verified_at,
      plan:vip_plans(id, code, name, billing_period, billing_interval)
    `)
    .eq('user_id', userId)
    .in('status', ['active', 'grace_period', 'canceled'])
    .order('current_period_end', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as VipSubscription | null;
}

export function isSubscriptionEntitled(subscription: VipSubscription | null, now = new Date()): boolean {
  if (!subscription || !['active', 'grace_period', 'canceled'].includes(subscription.status)) return false;
  const periodEnd = new Date(subscription.current_period_end);
  return !Number.isNaN(periodEnd.getTime()) && periodEnd.getTime() > now.getTime();
}

export function getExpirationWarningDays(subscription: VipSubscription | null, now = new Date()): 1 | 3 | 7 | null {
  if (!subscription || !isSubscriptionEntitled(subscription, now) || subscription.auto_renew) return null;
  const milliseconds = new Date(subscription.current_period_end).getTime() - now.getTime();
  const days = Math.ceil(milliseconds / 86_400_000);
  if (days <= 1) return 1;
  if (days <= 3) return 3;
  if (days <= 7) return 7;
  return null;
}

export function isProfileVipActive(profile: Profile | null, now = new Date()): boolean {
  if (profile?.vip_status !== 'vip') return false;
  if (!profile.vip_expires_at) return true;
  const expiresAt = new Date(profile.vip_expires_at);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}
