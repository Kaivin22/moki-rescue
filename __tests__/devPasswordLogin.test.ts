import type { SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { canUseDevPasswordLogin, signInWithTestPassword } from '@/src/features/auth/devPasswordLogin';
import { LEGAL_VERSION } from '@/src/features/legal/constants';

function mockClient() {
  const query = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { id: 'test-user' }, error: null }),
  };
  const auth = {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user' }, session: { access_token: 'unit-test-only' } },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  };
  const from = jest.fn().mockReturnValue(query);
  return { query, auth, from, client: { auth, from } as unknown as SupabaseClient };
}

const input = {
  enabled: true,
  email: ' CUSTOMER.RESCUE@example.com ',
  password: 'unit-test-password',
  acceptedTerms: true,
  language: 'vi' as const,
};

describe('real-session development password sign-in', () => {
  it.each(['development', 'local', 'staging'])('allows an enabled development build in %s', (environment) => {
    expect(canUseDevPasswordLogin(true, environment, true)).toBe(true);
  });

  it.each([
    [false, 'development', true],
    [true, 'production', true],
    [true, 'development', false],
    [true, 'development', 'true'],
    [true, undefined, true],
  ])('rejects release, production, absent or disabled config (%s/%s/%s)', (isDev, environment, enabled) => {
    expect(canUseDevPasswordLogin(Boolean(isDev), environment, enabled)).toBe(false);
  });

  it.each([
    [{ enabled: false }, 'disabled'],
    [{ acceptedTerms: false }, 'terms-required'],
    [{ password: '' }, 'credentials-required'],
  ])('rejects invalid input before contacting Supabase', async (change, code) => {
    const mock = mockClient();
    await expect(signInWithTestPassword(mock.client, { ...input, ...change })).rejects.toMatchObject({
      code,
    });
    expect(mock.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('uses password auth, persists only consent/locale through RLS and returns the real user', async () => {
    const mock = mockClient();
    const user = await signInWithTestPassword(mock.client, input);
    expect(user.id).toBe('test-user');
    expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'customer.rescue@example.com',
      password: input.password,
    });
    expect(mock.from).toHaveBeenCalledWith('profiles');
    expect(mock.query.update).toHaveBeenCalledWith({
      terms_version: LEGAL_VERSION,
      terms_accepted_at: expect.any(String),
      locale: 'vi',
    });
    expect(mock.query.eq).toHaveBeenCalledWith('id', 'test-user');
    expect(mock.query.eq).toHaveBeenCalledWith('is_active', true);
    expect(mock.auth.signOut).not.toHaveBeenCalled();
  });

  it('does not pretend an unconfirmed email is signed in', async () => {
    const mock = mockClient();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'email_not_confirmed' },
    });
    await expect(signInWithTestPassword(mock.client, input)).rejects.toMatchObject({
      code: 'email-unconfirmed',
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('rejects missing sessions and network failures', async () => {
    const mock = mockClient();
    mock.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'test-user' }, session: null },
      error: null,
    });
    await expect(signInWithTestPassword(mock.client, input)).rejects.toMatchObject({
      code: 'sign-in-failed',
    });
    mock.auth.signInWithPassword.mockRejectedValueOnce(new Error('network'));
    await expect(signInWithTestPassword(mock.client, input)).rejects.toMatchObject({
      code: 'sign-in-failed',
    });
    expect(mock.from).not.toHaveBeenCalled();
  });

  it('clears the local session when RLS rejects consent or no active profile exists', async () => {
    const mock = mockClient();
    mock.query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    await expect(signInWithTestPassword(mock.client, input)).rejects.toMatchObject({
      code: 'profile-failed',
    });
    expect(mock.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('forces the app-config flag off for production even when requested in the environment', () => {
    const source = fs
      .readFileSync(path.join(process.cwd(), 'app.config.js'), 'utf8')
      .replace('export default', 'module.exports =');
    const env = {
      APP_ENV: 'production',
      DEV_PASSWORD_LOGIN_ENABLED: 'true',
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'unit-test-only',
      EXPO_PUBLIC_API_URL: 'https://api.example.com',
      EXPO_PUBLIC_SUPPORT_HOTLINE: '19000000',
      EXPO_PUBLIC_SERVICE_CENTER_LATITUDE: '16.0544',
      EXPO_PUBLIC_SERVICE_CENTER_LONGITUDE: '108.2022',
      EXPO_PUBLIC_EAS_PROJECT_ID: '00000000-0000-4000-8000-000000000000',
    };
    const context = {
      process: { env },
      URL,
      module: { exports: {} as { expo: { extra: { devPasswordLoginEnabled: boolean } } } },
    };
    vm.runInNewContext(source, context);
    expect(context.module.exports.expo.extra.devPasswordLoginEnabled).toBe(false);
    context.process.env.APP_ENV = 'development';
    const devContext = { ...context, module: { exports: {} as typeof context.module.exports } };
    vm.runInNewContext(source, devContext);
    expect(devContext.module.exports.expo.extra.devPasswordLoginEnabled).toBe(true);
    const easContext = {
      ...context,
      process: { env: { ...env, EAS_BUILD_PROFILE: 'production' } },
      module: { exports: {} as typeof context.module.exports },
    };
    vm.runInNewContext(source, easContext);
    expect(easContext.module.exports.expo.extra.devPasswordLoginEnabled).toBe(false);
  });
});
