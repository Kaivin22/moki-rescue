import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useCopy, useI18n } from '@/src/i18n';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { DevLoginError, signInWithTestPassword } from './devPasswordLogin';

const COPY = {
  vi: {
    title: 'Đăng nhập kiểm thử — không cần SMS',
    hint: 'Dùng tài khoản Supabase thật đã được tạo và xác nhận sẵn. Chọn bên dưới chỉ điền email; quyền vẫn do database quyết định.',
    roles: ['Khách hàng', 'Cứu hộ viên', 'Admin'],
    email: 'Email kiểm thử',
    password: 'Mật khẩu kiểm thử',
    agree: 'Tôi đồng ý Điều khoản và Chính sách quyền riêng tư',
    terms: 'Điều khoản',
    privacy: 'Quyền riêng tư',
    submit: 'Đăng nhập để test',
    credentials: 'Hãy nhập email và mật khẩu của tài khoản kiểm thử.',
    termsRequired: 'Bạn cần đồng ý điều khoản và chính sách quyền riêng tư.',
    unconfirmed:
      'Tài khoản chưa được xác nhận. Tạo bằng script kiểm thử hoặc bật Auto Confirm User khi tạo trong Supabase Dashboard.',
    failed: 'Không đăng nhập được. Kiểm tra tài khoản đã được tạo, mật khẩu và kết nối mạng.',
    profile: 'Tài khoản chưa có hồ sơ hoạt động. Kiểm tra bước thiết lập tài khoản kiểm thử.',
    disabled: 'Đăng nhập kiểm thử không được bật trong bản app này.',
  },
  en: {
    title: 'Test sign-in — no SMS required',
    hint: 'Use real, pre-created and confirmed Supabase accounts. These buttons only fill the email; the database still controls roles.',
    roles: ['Customer', 'Provider', 'Admin'],
    email: 'Test email',
    password: 'Test password',
    agree: 'I accept the Terms and Privacy Policy',
    terms: 'Terms',
    privacy: 'Privacy',
    submit: 'Sign in for testing',
    credentials: 'Enter your test account email and password.',
    termsRequired: 'Accept the terms and privacy policy to continue.',
    unconfirmed:
      'This account is not confirmed. Use the test setup script or Auto Confirm User in the Supabase Dashboard.',
    failed: 'Sign-in failed. Check that the account exists, the password, and your connection.',
    profile: 'This account has no active profile. Check the test account setup.',
    disabled: 'Test sign-in is not enabled in this app build.',
  },
} as const;

const TEST_EMAILS = [
  'customer.rescue@example.com',
  'provider.rescue@example.com',
  'admin.rescue@example.com',
];

export function DevPasswordLoginPanel({ enabled }: { enabled: boolean }) {
  const c = useCopy(COPY);
  const language = useI18n((state) => state.language);
  const [email, setEmail] = useState(TEST_EMAILS[0]);
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithTestPassword(supabase, {
        enabled,
        email,
        password,
        acceptedTerms,
        language,
      });
      await useAuthStore.getState().syncUser(user);
      const auth = useAuthStore.getState();
      if (!auth.profile?.is_active || auth.error) {
        await auth.signOut();
        throw new DevLoginError('profile-failed');
      }
      setPassword('');
      router.replace('/(tabs)');
    } catch (failure) {
      const code = failure instanceof DevLoginError ? failure.code : 'sign-in-failed';
      setError(
        {
          disabled: c.disabled,
          'credentials-required': c.credentials,
          'terms-required': c.termsRequired,
          'email-unconfirmed': c.unconfirmed,
          'sign-in-failed': c.failed,
          'profile-failed': c.profile,
        }[code],
      );
    } finally {
      setBusy(false);
    }
  };

  if (!enabled) return null;
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.hint}>{c.hint}</Text>
      <View style={styles.roles}>
        {TEST_EMAILS.map((value, index) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={c.roles[index]}
            accessibilityState={{ selected: email === value, disabled: busy }}
            disabled={busy}
            onPress={() => {
              setEmail(value);
              setError(null);
            }}
            style={[styles.role, email === value && styles.selected]}
          >
            <Text style={styles.roleLabel}>{c.roles[index]}</Text>
          </Pressable>
        ))}
      </View>
      <AppInput
        label={c.email}
        value={email}
        onChangeText={setEmail}
        editable={!busy}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <AppInput
        label={c.password}
        value={password}
        onChangeText={setPassword}
        editable={!busy}
        isPassword
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms, disabled: busy }}
        accessibilityLabel={c.agree}
        disabled={busy}
        onPress={() => setAcceptedTerms((value) => !value)}
        style={styles.consent}
      >
        <Text style={styles.hint}>
          {acceptedTerms ? '☑' : '☐'} {c.agree}
        </Text>
      </Pressable>
      <View style={styles.roles}>
        <Link href="/legal/terms" style={styles.link}>
          {c.terms}
        </Link>
        <Link href="/legal/privacy" style={styles.link}>
          {c.privacy}
        </Link>
      </View>
      <AppButton title={c.submit} onPress={() => void signIn()} loading={busy} />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  title: { ...Typography.h3, color: Colors.textPrimary },
  hint: { ...Typography.caption, color: Colors.textSecondary },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  role: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  selected: { borderColor: Colors.primary },
  roleLabel: { ...Typography.caption, color: Colors.primary },
  consent: { minHeight: 44, justifyContent: 'center' },
  link: {
    ...Typography.caption,
    color: Colors.primary,
    paddingVertical: Spacing.md,
    textDecorationLine: 'underline',
  },
  error: { ...Typography.caption, color: Colors.error },
});
