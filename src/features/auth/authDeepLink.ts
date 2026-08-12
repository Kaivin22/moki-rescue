import { supabase } from '@/src/services/supabase';

export interface AuthDeepLinkResult {
  handled: boolean;
  recovery: boolean;
}

function linkParams(url: string): URLSearchParams {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const fragment = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  new URLSearchParams(fragment).forEach((value, key) => params.set(key, value));
  return params;
}

export async function handleAuthDeepLink(url: string): Promise<AuthDeepLinkResult> {
  const params = linkParams(url);
  const type = params.get('type');
  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { handled: true, recovery: type === 'recovery' };
  }
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    return { handled: true, recovery: type === 'recovery' };
  }
  return { handled: false, recovery: false };
}
