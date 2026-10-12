import { normalizeVietnamesePhone } from '../src/features/auth/phone';
import { createUuid } from '../src/utils/uuid';
import { ONBOARDING_STORAGE_KEY } from '../src/features/onboarding/onboardingStorage';
import { accountVerification } from '@/src/features/auth/accountVerification';

describe('normalizeVietnamesePhone', () => {
  it('normalizes local Vietnamese phone numbers', () => {
    expect(normalizeVietnamesePhone('0901 234 567')).toBe('+84901234567');
  });

  it('keeps valid E.164 numbers and rejects malformed input', () => {
    expect(normalizeVietnamesePhone('+84901234567')).toBe('+84901234567');
    expect(normalizeVietnamesePhone('12345')).toBeNull();
    expect(normalizeVietnamesePhone('+841234')).toBeNull();
  });
});

jest.mock('expo-crypto', () => {
  let sequence = 0;
  return {
    randomUUID: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
  };
});

describe('createUuid', () => {
  it('returns RFC 4122 shaped unique idempotency keys', () => {
    const first = createUuid();
    const second = createUuid();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(second).not.toBe(first);
  });
});

describe('onboarding storage', () => {
  it('uses a domain-specific versioned key', () => {
    expect(ONBOARDING_STORAGE_KEY).toBe('motorescue:onboarding:completed:v1');
  });
});

describe('account security identity display', () => {
  it('shows a confirmed test email as verified without claiming phone verification', () => {
    expect(
      accountVerification({ email: 'provider.rescue@example.com', email_confirmed_at: '2026-09-21' }),
    ).toEqual({ channel: 'email', identity: 'provider.rescue@example.com', verified: true });
  });

  it('does not invent verification for an unconfirmed email', () => {
    expect(accountVerification({ email: 'test@example.com' }).verified).toBe(false);
  });

  it('keeps confirmed phone authentication working', () => {
    expect(accountVerification({ phone: '+12025550190', phone_confirmed_at: '2026-09-21' })).toEqual({
      channel: 'phone',
      identity: '+12025550190',
      verified: true,
    });
  });

  it('uses confirmed email when an attached phone is unconfirmed', () => {
    expect(
      accountVerification({
        phone: '+12025550190',
        email: 'test@example.com',
        email_confirmed_at: '2026-09-21',
      }).channel,
    ).toBe('email');
  });

  it('does not treat missing identity as verified', () => {
    expect(accountVerification(null).verified).toBe(false);
    expect(accountVerification({ phone: '+12025550190' }).verified).toBe(false);
  });
});
