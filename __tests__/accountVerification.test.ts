import { accountVerification } from '@/src/features/auth/accountVerification';

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
