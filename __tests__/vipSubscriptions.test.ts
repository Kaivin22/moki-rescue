jest.mock('@/src/services/supabase', () => ({ supabase: {} }));

import {
  getExpirationWarningDays,
  isProfileVipActive,
  isSubscriptionEntitled,
  VipSubscription,
} from '@/src/features/vip/api/subscriptions';

function subscription(overrides: Partial<VipSubscription> = {}): VipSubscription {
  return {
    id: 'subscription-id',
    user_id: 'user-id',
    plan_id: 'plan-id',
    provider: 'play_store',
    status: 'active',
    auto_renew: false,
    started_at: '2026-08-01T00:00:00.000Z',
    current_period_start: '2026-08-01T00:00:00.000Z',
    current_period_end: '2026-08-20T00:00:00.000Z',
    canceled_at: null,
    ended_at: null,
    last_verified_at: '2026-08-01T00:00:00.000Z',
    plan: null,
    ...overrides,
  };
}

describe('VIP subscription entitlement', () => {
  const now = new Date('2026-08-10T00:00:00.000Z');

  it('keeps access after cancellation until the paid period ends', () => {
    expect(isSubscriptionEntitled(subscription({ status: 'canceled' }), now)).toBe(true);
  });

  it('rejects expired and revoked subscriptions', () => {
    expect(isSubscriptionEntitled(subscription({ status: 'expired' }), now)).toBe(false);
    expect(isSubscriptionEntitled(subscription({ status: 'revoked' }), now)).toBe(false);
    expect(isSubscriptionEntitled(subscription({ current_period_end: '2026-08-09T00:00:00.000Z' }), now)).toBe(false);
  });

  it('warns at seven, three and one day only when renewal is off', () => {
    expect(getExpirationWarningDays(subscription({ current_period_end: '2026-08-17T00:00:00.000Z' }), now)).toBe(7);
    expect(getExpirationWarningDays(subscription({ current_period_end: '2026-08-13T00:00:00.000Z' }), now)).toBe(3);
    expect(getExpirationWarningDays(subscription({ current_period_end: '2026-08-11T00:00:00.000Z' }), now)).toBe(1);
    expect(getExpirationWarningDays(subscription({ auto_renew: true }), now)).toBeNull();
  });

  it('does not show an expired profile as VIP', () => {
    expect(isProfileVipActive({ vip_status: 'vip', vip_expires_at: '2026-08-09T00:00:00.000Z' } as never, now)).toBe(false);
    expect(isProfileVipActive({ vip_status: 'vip', vip_expires_at: '2026-08-11T00:00:00.000Z' } as never, now)).toBe(true);
  });
});
