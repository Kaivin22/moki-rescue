import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { normalizeVietnamesePhone } from '@/src/features/auth/phone';
import { LEGAL_VERSION } from '@/src/features/legal/constants';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    phoneInvalid: 'Số điện thoại Việt Nam chưa đúng định dạng.',
    termsRequired: 'Bạn cần đồng ý điều khoản và chính sách quyền riêng tư.',
    nameInvalid: 'Tên hiển thị cần ít nhất 2 ký tự.',
    sendError: 'Không thể gửi mã lúc này. Vui lòng chờ rồi thử lại.',
    otpInvalid: 'Mã xác minh phải gồm 6 chữ số.',
    verifyError: 'Mã không đúng hoặc đã hết hạn.',
    profileError: 'Đăng nhập thành công nhưng chưa lưu được hồ sơ. Hãy thử lại.',
    start: 'Bắt đầu an toàn',
    enterOtp: 'Nhập mã xác minh',
    intro:
      'Một tài khoản dùng chung cho khách, cứu hộ viên và điều phối viên. Quyền do đơn vị vận hành xác minh.',
    sent: 'Mã 6 số đã được gửi đến',
    name: 'Tên hiển thị',
    namePlaceholder: 'Ví dụ: Minh',
    phone: 'Số điện thoại',
    agree: 'Tôi đồng ý với',
    terms: 'Điều khoản',
    and: 'và',
    privacy: 'Quyền riêng tư',
    send: 'Gửi mã SMS',
    otp: 'Mã xác minh',
    verify: 'Xác minh và đăng nhập',
    resendAfter: 'Gửi lại sau',
    resend: 'Gửi lại mã',
    changePhone: 'Đổi số điện thoại',
    privacyNote: 'Không yêu cầu CCCD, giấy phép lái xe hoặc danh bạ.',
  },
  en: {
    phoneInvalid: 'Enter a valid Vietnamese phone number.',
    termsRequired: 'Accept the terms and privacy policy to continue.',
    nameInvalid: 'The display name must contain at least 2 characters.',
    sendError: 'The code cannot be sent right now. Please wait and try again.',
    otpInvalid: 'The verification code must contain 6 digits.',
    verifyError: 'The code is incorrect or expired.',
    profileError: 'Sign-in succeeded but the profile could not be saved. Please try again.',
    start: 'Start safely',
    enterOtp: 'Enter verification code',
    intro:
      'One account is used for customers, rescue providers, and dispatchers. The operator verifies internal roles.',
    sent: 'A 6-digit code was sent to',
    name: 'Display name',
    namePlaceholder: 'Example: Minh',
    phone: 'Phone number',
    agree: 'I agree to the',
    terms: 'Terms',
    and: 'and',
    privacy: 'Privacy policy',
    send: 'Send SMS code',
    otp: 'Verification code',
    verify: 'Verify and sign in',
    resendAfter: 'Resend in',
    resend: 'Resend code',
    changePhone: 'Change phone number',
    privacyNote: 'No national ID, driver license, or contacts are required.',
  },
} as const;

export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAfter, setResendAfter] = useState(0);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const normalizedPhone = useMemo(() => normalizeVietnamesePhone(phone), [phone]);
  const c = useCopy(COPY);
  const { language, setLanguage } = useI18n();

  useEffect(() => {
    if (resendAfter <= 0) return;
    const timer = setInterval(() => setResendAfter((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendAfter]);

  const sendOtp = async () => {
    if (!normalizedPhone) {
      setError(c.phoneInvalid);
      return;
    }
    if (!acceptedTerms) {
      setError(c.termsRequired);
      return;
    }
    if (displayName.trim().length < 2) {
      setError(c.nameInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true,
        data: { display_name: displayName.trim(), terms_version: LEGAL_VERSION, locale: language },
      },
    });
    setBusy(false);
    if (authError) {
      setError(c.sendError);
      return;
    }
    setStep('otp');
    setResendAfter(60);
  };

  const verifyOtp = async () => {
    if (!normalizedPhone || !/^\d{6}$/.test(otp)) {
      setError(c.otpInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: authError } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp,
      type: 'sms',
    });
    if (authError || !data.user) {
      setBusy(false);
      setError(c.verifyError);
      return;
    }
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        terms_version: LEGAL_VERSION,
        terms_accepted_at: new Date().toISOString(),
        locale: language,
      })
      .eq('id', data.user.id);
    if (profileError) {
      await supabase.auth.signOut({ scope: 'local' });
      setBusy(false);
      setError(c.profileError);
      return;
    }
    await refreshProfile();
    setBusy(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandIcon}>
            <Ionicons name="shield-checkmark" size={42} color={Colors.accent} />
          </View>
          <Text style={styles.brand}>MotoRescue</Text>
          <Pressable
            style={styles.languageButton}
            onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            accessibilityRole="button"
          >
            <Text style={styles.languageText}>{language === 'vi' ? 'English' : 'Tiếng Việt'}</Text>
          </Pressable>
          <Text style={styles.title}>{step === 'phone' ? c.start : c.enterOtp}</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' ? c.intro : `${c.sent} ${normalizedPhone ?? phone}.`}
          </Text>

          <View style={styles.form}>
            {step === 'phone' ? (
              <>
                <AppInput
                  label={c.name}
                  leftIcon="person-outline"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  maxLength={80}
                  placeholder={c.namePlaceholder}
                />
                <AppInput
                  label={c.phone}
                  leftIcon="call-outline"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  placeholder="0901234567"
                />
                <Pressable
                  style={styles.termsRow}
                  onPress={() => setAcceptedTerms((value) => !value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedTerms }}
                >
                  <Ionicons
                    name={acceptedTerms ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={acceptedTerms ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={styles.termsText}>
                    {c.agree}{' '}
                    <Link href="/legal/terms" style={styles.link}>
                      {c.terms}
                    </Link>{' '}
                    {c.and}{' '}
                    <Link href="/legal/privacy" style={styles.link}>
                      {c.privacy}
                    </Link>
                    .
                  </Text>
                </Pressable>
                <AppButton title={c.send} onPress={() => void sendOtp()} loading={busy} />
              </>
            ) : (
              <>
                <AppInput
                  label={c.otp}
                  leftIcon="keypad-outline"
                  value={otp}
                  onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                />
                <AppButton title={c.verify} onPress={() => void verifyOtp()} loading={busy} />
                <AppButton
                  title={resendAfter > 0 ? `${c.resendAfter} ${resendAfter}s` : c.resend}
                  variant="ghost"
                  disabled={resendAfter > 0}
                  onPress={() => void sendOtp()}
                />
                <AppButton
                  title={c.changePhone}
                  variant="ghost"
                  onPress={() => {
                    setStep('phone');
                    setOtp('');
                    setError(null);
                  }}
                />
              </>
            )}
            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </View>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
            <Text style={styles.privacyText}>{c.privacyNote}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primaryDark },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.xl, justifyContent: 'center' },
  brandIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  brand: { ...Typography.label, color: Colors.accent, textAlign: 'center', letterSpacing: 2 },
  languageButton: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  languageText: { ...Typography.caption, color: Colors.accent, textDecorationLine: 'underline' },
  title: { ...Typography.h1, color: Colors.white, textAlign: 'center', marginTop: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.skyBlue, textAlign: 'center', marginTop: Spacing.sm },
  form: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  termsText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  link: { color: Colors.primary, textDecorationLine: 'underline' },
  error: { ...Typography.caption, color: Colors.error, textAlign: 'center', marginTop: Spacing.sm },
  privacyNote: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  privacyText: { ...Typography.caption, color: Colors.skyBlue, flexShrink: 1 },
});
