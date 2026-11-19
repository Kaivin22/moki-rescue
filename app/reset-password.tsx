import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AuthField, AuthMessage, AuthShell, AuthSubmit } from '@/src/features/auth/AccountScreen';
import { accountError, consumeAuthCode } from '@/src/features/auth/accountAuth';
import { useI18n } from '@/src/i18n';
import { supabase } from '@/src/services/supabase';

export default function ResetPassword() {
  const { code } = useLocalSearchParams<{ code?: string }>(),
    router = useRouter(),
    en = useI18n((s) => s.language) === 'en';
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!code) throw Error();
        await consumeAuthCode(code);
        if (active) setReady(true);
      } catch {
        if (active)
          setError(
            en
              ? 'This link expired or was already used. Request a new one.'
              : 'Liên kết đã hết hạn hoặc đã sử dụng. Hãy gửi lại yêu cầu.',
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [code, en]);
  async function save() {
    if (!ready || busy) return;
    if (password.length < 8 || password !== confirm) {
      setError(
        en
          ? 'Use at least 8 characters and matching confirmation.'
          : 'Mật khẩu cần ít nhất 8 ký tự và xác nhận trùng khớp.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;
      setPassword('');
      setConfirm('');
      setDone(true);
    } catch (e) {
      setError(accountError(e, en));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title={en ? 'Reset password' : 'Đặt lại mật khẩu'}
      subtitle={
        done
          ? en
            ? 'Your password was updated.'
            : 'Mật khẩu đã được cập nhật.'
          : en
            ? 'Choose a new password for your account.'
            : 'Chọn mật khẩu mới cho tài khoản của bạn.'
      }
      back={false}
    >
      {!done && (
        <>
          <AuthField
            icon="lock-closed"
            password
            placeholder={en ? 'New password' : 'Mật khẩu mới'}
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            editable={ready && !busy}
          />
          <AuthField
            icon="lock-closed"
            password
            placeholder={en ? 'Confirm password' : 'Xác nhận mật khẩu'}
            value={confirm}
            onChangeText={setConfirm}
            autoComplete="new-password"
            editable={ready && !busy}
          />
          <AuthSubmit
            title={en ? 'Save password' : 'Lưu mật khẩu'}
            busy={busy}
            disabled={!ready}
            onPress={() => void save()}
          />
        </>
      )}
      <AuthMessage text={error} error />
      <AuthSubmit
        title={done ? (en ? 'Continue' : 'Tiếp tục') : en ? 'Request another link' : 'Gửi lại liên kết'}
        onPress={() => router.replace(done ? '/(auth)/complete-profile' : '/(auth)/forgot-password')}
      />
    </AuthShell>
  );
}
