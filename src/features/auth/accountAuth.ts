import type { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/src/services/supabase';
import { normalizeVietnamesePhone } from './phone';
import { LEGAL_VERSION } from '@/src/features/legal/constants';

export async function saveRegistrationConsent(user: User) {
  if (user.user_metadata?.registration_terms_version !== LEGAL_VERSION) return;
  const at = user.user_metadata.registration_terms_at;
  if (typeof at !== 'string' || !Number.isFinite(Date.parse(at))) return;
  const { error } = await supabase
    .from('profiles')
    .update({ terms_version: LEGAL_VERSION, terms_accepted_at: at })
    .eq('id', user.id)
    .eq('is_active', true)
    .is('terms_accepted_at', null);
  if (error) throw error;
}

export function contactPhone(user: User | null): string | null {
  const value =
    user?.user_metadata?.contact_phone ?? (user?.phone ? `+${user.phone.replace(/^\+/, '')}` : '');
  return typeof value === 'string' ? normalizeVietnamesePhone(value) : null;
}
export const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const authReturnUrl = (path = 'auth-callback') => Linking.createURL(path);
export async function googleSignIn() {
  const extra = Constants.expoConfig?.extra;
  const response = await fetch(`${extra?.supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: extra?.supabaseAnonKey ?? '' },
  });
  if (!response.ok) throw new Error('Auth settings unavailable');
  const settings = await response.json();
  if (!settings.external?.google)
    throw Object.assign(new Error('Google provider disabled'), { code: 'provider_disabled' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authReturnUrl(), skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in unavailable');
  if (Platform.OS === 'web') window.location.assign(data.url);
  else await Linking.openURL(data.url);
}
// React Strict Mode must not exchange the same one-use code twice.
const handled = new Map<string, Promise<void>>();
export function consumeAuthCode(code: string) {
  let pending = handled.get(code);
  if (!pending) {
    pending = supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) throw error;
    });
    handled.set(code, pending);
  }
  return pending;
}
export function accountError(error: unknown, en = false) {
  const code = (error as { code?: string })?.code;
  if (code === 'provider_disabled')
    return en
      ? 'Google sign-in has not been configured yet. Use email for now.'
      : 'Đăng nhập Google chưa được cấu hình. Bạn có thể dùng email trước.';
  if (code === 'invalid_credentials')
    return en ? 'Incorrect email or password.' : 'Email hoặc mật khẩu chưa đúng.';
  if (code === 'email_not_confirmed')
    return en ? 'Confirm your email before signing in.' : 'Hãy xác nhận email trước khi đăng nhập.';
  if (code === 'user_already_exists' || code === 'email_exists')
    return en ? 'This email is already registered.' : 'Email này đã được đăng ký.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit')
    return en ? 'Too many requests. Try again later.' : 'Bạn gửi yêu cầu quá nhanh. Hãy thử lại sau.';
  return en
    ? 'Could not complete the request. Check your connection and try again.'
    : 'Chưa thể thực hiện. Kiểm tra kết nối và thử lại.';
}
