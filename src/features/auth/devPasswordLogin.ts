import type { SupabaseClient } from '@supabase/supabase-js';
import { LEGAL_VERSION } from '@/src/features/legal/constants';

export function canUseDevPasswordLogin(isDev: boolean, environment: unknown, enabled: unknown) {
  return isDev && enabled === true && ['development', 'local', 'staging'].includes(String(environment));
}

export type DevLoginErrorCode =
  | 'disabled'
  | 'credentials-required'
  | 'terms-required'
  | 'email-unconfirmed'
  | 'sign-in-failed'
  | 'profile-failed';

export class DevLoginError extends Error {
  constructor(public readonly code: DevLoginErrorCode) {
    super(code);
  }
}

export async function signInWithTestPassword(
  client: SupabaseClient,
  input: {
    enabled: boolean;
    email: string;
    password: string;
    acceptedTerms: boolean;
    language: 'vi' | 'en';
  },
) {
  if (!input.enabled) throw new DevLoginError('disabled');
  const email = input.email.trim().toLowerCase();
  if (!email || !input.password) throw new DevLoginError('credentials-required');
  if (!input.acceptedTerms) throw new DevLoginError('terms-required');

  let result;
  try {
    result = await client.auth.signInWithPassword({ email, password: input.password });
  } catch {
    throw new DevLoginError('sign-in-failed');
  }
  if (result.error || !result.data.user || !result.data.session) {
    throw new DevLoginError(
      result.error?.code === 'email_not_confirmed' ? 'email-unconfirmed' : 'sign-in-failed',
    );
  }

  try {
    // This uses the signed-in user's JWT and normal RLS. Never accept a role from the client.
    const { data, error } = await client
      .from('profiles')
      .update({
        terms_version: LEGAL_VERSION,
        terms_accepted_at: new Date().toISOString(),
        locale: input.language,
      })
      .eq('id', result.data.user.id)
      .eq('is_active', true)
      .select('id')
      .single();
    if (error || !data) throw new DevLoginError('profile-failed');
  } catch {
    await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    throw new DevLoginError('profile-failed');
  }
  return result.data.user;
}
