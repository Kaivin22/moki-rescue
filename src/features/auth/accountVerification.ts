import type { User } from '@supabase/supabase-js';

/** Display the verified sign-in identity, without pretending that email login verified a phone. */
export function accountVerification(
  user: Pick<User, 'phone' | 'phone_confirmed_at' | 'email' | 'email_confirmed_at'> | null,
) {
  if (user?.phone && user.phone_confirmed_at) {
    return { channel: 'phone' as const, identity: user.phone, verified: true };
  }
  if (user?.email) {
    return { channel: 'email' as const, identity: user.email, verified: Boolean(user.email_confirmed_at) };
  }
  return { channel: 'phone' as const, identity: user?.phone ?? '', verified: false };
}
