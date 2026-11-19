import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthMessage, AuthShell, AuthSubmit } from '@/src/features/auth/AccountScreen';
import { consumeAuthCode, saveRegistrationConsent } from '@/src/features/auth/accountAuth';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';

export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>(),
    router = useRouter(),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (params.error || !params.code) throw Error();
        await consumeAuthCode(params.code);
        const { data, error: e } = await supabase.auth.getUser();
        if (e || !data.user) throw Error();
        await saveRegistrationConsent(data.user);
        await useAuthStore.getState().syncUser(data.user);
        if (active) router.replace('/(auth)/complete-profile');
      } catch {
        if (active) setError('Liên kết không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại.');
      }
    })();
    return () => {
      active = false;
    };
  }, [params.code, params.error, router]);
  return (
    <AuthShell title="Đăng nhập" subtitle="Đang hoàn tất xác thực…" back={false}>
      <AuthMessage text={error} error />
      {error && <AuthSubmit title="Về đăng nhập" onPress={() => router.replace('/(auth)/login')} />}
    </AuthShell>
  );
}
