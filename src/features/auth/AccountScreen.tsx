import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthColors as authColors, Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/spacing';
import { useI18n } from '@/src/i18n';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import {
  accountError,
  authReturnUrl,
  googleSignIn,
  validEmail,
  saveRegistrationConsent,
} from './accountAuth';
import { LEGAL_VERSION } from '@/src/features/legal/constants';
import { DispatchSupportEntry } from '@/src/features/support/DispatchSupport';

export { authColors };
export function AuthShell({
  title,
  subtitle,
  children,
  back = true,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  back?: boolean;
}) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {back && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại / Back"
              style={styles.back}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
            >
              <Ionicons name="chevron-back" size={22} color={authColors.ink} />
            </Pressable>
          )}
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function AuthField({
  icon,
  password,
  ...props
}: TextInputProps & { icon: keyof typeof Ionicons.glyphMap; password?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={20} color={authColors.muted} />
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? props.placeholder}
        secureTextEntry={password && !visible}
        placeholderTextColor={authColors.muted}
        style={styles.input}
      />
      {password && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ẩn mật khẩu / Hide password' : 'Hiện mật khẩu / Show password'}
          onPress={() => setVisible(!visible)}
          style={styles.eye}
        >
          <Ionicons name={visible ? 'eye-outline' : 'eye-off-outline'} size={21} color={authColors.muted} />
        </Pressable>
      )}
    </View>
  );
}
export function AuthSubmit({
  title,
  onPress,
  busy,
  disabled,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: busy || disabled, busy }}
      disabled={busy || disabled}
      style={({ pressed }) => [styles.submit, (pressed || busy || disabled) && { opacity: 0.65 }]}
      onPress={onPress}
    >
      {busy ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>{title}</Text>}
    </Pressable>
  );
}
export function AuthMessage({ text, error = false }: { text: string; error?: boolean }) {
  return text ? (
    <Text
      accessibilityRole={error ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.message, error && { color: Colors.error }]}
    >
      {text}
    </Text>
  ) : null;
}
export function AuthGoogle({ disabled }: { disabled?: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const en = useI18n((s) => s.language) === 'en';
  async function run() {
    setBusy(true);
    setError('');
    try {
      await googleSignIn();
    } catch (e) {
      setError(accountError(e, en));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.subtitle}>{en ? 'Or continue with' : 'Hoặc tiếp tục với'}</Text>
        <View style={styles.line} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={en ? 'Continue with Google' : 'Tiếp tục với Google'}
        disabled={disabled || busy}
        onPress={() => void run()}
        style={styles.google}
      >
        {busy ? (
          <ActivityIndicator color={authColors.green} />
        ) : (
          <Ionicons name="logo-google" size={24} color={authColors.ink} />
        )}
        <Text style={styles.googleText}>Google</Text>
      </Pressable>
      <AuthMessage text={error} error />
    </>
  );
}
export function AccountScreen({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const router = useRouter(),
    en = useI18n((s) => s.language) === 'en';
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [accepted, setAccepted] = useState(false);
  const title =
    mode === 'login'
      ? en
        ? 'Log in'
        : 'Đăng nhập'
      : mode === 'register'
        ? en
          ? 'Create account'
          : 'Tạo tài khoản'
        : en
          ? 'Forgot password'
          : 'Quên mật khẩu';
  const subtitle =
    mode === 'login'
      ? en
        ? 'Enter your email and password to access your account.'
        : 'Nhập email và mật khẩu để tiếp tục sử dụng dịch vụ.'
      : mode === 'register'
        ? en
          ? 'Create an account to get started.'
          : 'Tạo tài khoản để bắt đầu sử dụng dịch vụ cứu hộ.'
        : en
          ? 'Enter your email to receive a password reset link.'
          : 'Nhập email để nhận liên kết đặt lại mật khẩu.';
  async function submit() {
    if (busy) return;
    setError('');
    setMessage('');
    if (!validEmail(email)) {
      setError(en ? 'Enter a valid email.' : 'Hãy nhập email hợp lệ.');
      return;
    }
    if (mode !== 'forgot' && !password) {
      setError(en ? 'Enter your password.' : 'Hãy nhập mật khẩu.');
      return;
    }
    if (
      mode === 'register' &&
      (name.trim().length < 2 ||
        name.trim().length > 80 ||
        password.length < 8 ||
        password !== confirm ||
        !accepted)
    ) {
      setError(
        en
          ? 'Enter your name, a password of at least 8 characters, matching confirmation, and accept the terms.'
          : 'Nhập tên từ 2–80 ký tự, mật khẩu ít nhất 8 ký tự, xác nhận trùng khớp và đồng ý điều khoản.',
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authReturnUrl('reset-password'),
        });
        if (e) throw e;
        setMessage(
          en
            ? 'If the account exists, a reset link will be sent. Check your inbox and spam folder.'
            : 'Nếu email có tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu. Hãy kiểm tra cả thư rác.',
        );
        return;
      }
      const result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: authReturnUrl(),
                data: {
                  display_name: name.trim(),
                  locale: en ? 'en' : 'vi',
                  registration_terms_version: LEGAL_VERSION,
                  registration_terms_at: new Date().toISOString(),
                },
              },
            });
      if (result.error) throw result.error;
      if (!result.data.session) {
        setMessage(
          en
            ? 'Check your email to confirm your account, then sign in.'
            : 'Hãy kiểm tra email xác nhận tài khoản, sau đó đăng nhập.',
        );
        setPassword('');
        setConfirm('');
        return;
      }
      if (result.data.user) await saveRegistrationConsent(result.data.user);
      await useAuthStore.getState().syncUser(result.data.user);
      setPassword('');
      router.replace('/(auth)/complete-profile');
    } catch (e) {
      setError(accountError(e, en));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell title={title} subtitle={subtitle} back={mode !== 'login'}>
      {mode === 'register' && (
        <AuthField
          icon="person"
          placeholder={en ? 'Name' : 'Họ và tên'}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          maxLength={80}
          editable={!busy}
        />
      )}
      <AuthField
        icon="mail"
        placeholder={en ? 'Email address' : 'Địa chỉ email'}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        editable={!busy}
      />
      {mode !== 'forgot' && (
        <AuthField
          icon="lock-closed"
          placeholder={en ? 'Password' : 'Mật khẩu'}
          password
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          editable={!busy}
        />
      )}
      {mode === 'register' && (
        <AuthField
          icon="lock-closed"
          placeholder={en ? 'Confirm password' : 'Xác nhận mật khẩu'}
          password
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          editable={!busy}
        />
      )}
      {mode === 'login' && (
        <Link href="/(auth)/forgot-password" style={styles.forgot}>
          {en ? 'Forgot password?' : 'Quên mật khẩu?'}
        </Link>
      )}
      {mode === 'register' && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={
            en ? 'Accept terms and privacy policy' : 'Đồng ý điều khoản và chính sách quyền riêng tư'
          }
          accessibilityState={{ checked: accepted }}
          disabled={busy}
          onPress={() => setAccepted(!accepted)}
          style={styles.consent}
        >
          <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={22} color={authColors.green} />
          <Text style={styles.consentText}>
            {en
              ? 'I accept the Terms and Privacy Policy.'
              : 'Tôi đồng ý Điều khoản và Chính sách quyền riêng tư.'}
          </Text>
        </Pressable>
      )}
      <AuthMessage text={error} error />
      <AuthMessage text={message} />
      <AuthSubmit
        title={mode === 'forgot' ? (en ? 'Continue' : 'Tiếp tục') : title}
        onPress={() => void submit()}
        busy={busy}
      />
      {mode !== 'forgot' && (
        <Text style={styles.switchText}>
          {mode === 'login'
            ? en
              ? 'No account? '
              : 'Chưa có tài khoản? '
            : en
              ? 'Already have an account? '
              : 'Đã có tài khoản? '}
          <Link
            href={mode === 'login' ? '/(auth)/register' : '/(auth)/login'}
            replace={mode === 'register'}
            style={styles.link}
          >
            {mode === 'login' ? (en ? 'Sign up' : 'Đăng ký') : en ? 'Log in' : 'Đăng nhập'}
          </Link>
        </Text>
      )}
      {mode !== 'forgot' && <AuthGoogle disabled={busy} />}
      {mode === 'login' && <DispatchSupportEntry variant="ghost" />}
      {mode === 'register' && (
        <View style={styles.legal}>
          <Link href="/legal/terms" style={styles.link}>
            {en ? 'Terms' : 'Điều khoản'}
          </Link>
          <Link href="/legal/privacy" style={styles.link}>
            {en ? 'Privacy' : 'Quyền riêng tư'}
          </Link>
        </View>
      )}
    </AuthShell>
  );
}
export const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: authColors.background },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 16,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { marginTop: 32, marginBottom: 24, gap: 12 },
  title: { ...Typography.h1, textAlign: 'center', color: authColors.ink },
  subtitle: { ...Typography.caption, textAlign: 'center', color: authColors.muted },
  field: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    paddingLeft: 20,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    ...Typography.body,
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    color: authColors.ink,
    paddingVertical: 14,
  },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  submit: {
    minHeight: 52,
    borderRadius: 28,
    backgroundColor: authColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  submitText: { ...Typography.bodyBold, color: 'white', textAlign: 'center' },
  forgot: { ...Typography.caption, color: authColors.ink, textAlign: 'right', minHeight: 44, paddingTop: 12 },
  message: { ...Typography.caption, color: authColors.green },
  switchText: { ...Typography.caption, textAlign: 'center', color: authColors.muted, marginVertical: 8 },
  link: { ...Typography.caption, color: authColors.green, textDecorationLine: 'underline' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  line: { flex: 1, height: 1, backgroundColor: authColors.divider },
  google: {
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: 'white',
    minHeight: 52,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleText: { ...Typography.bodyBold, color: authColors.ink },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 },
  consentText: { ...Typography.caption, color: authColors.muted, flex: 1 },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingVertical: 12 },
});
