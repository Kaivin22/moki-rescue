import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { canUseDevPasswordLogin } from '@/src/features/auth/devPasswordLogin';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Chào mừng bạn',
    subtitle: 'Chọn cách đăng nhập để tiếp tục.',
    sms: 'Đăng nhập bằng số điện thoại',
    smsHint: 'Nhận mã xác minh qua SMS.',
    test: 'Đăng nhập kiểm thử',
    testHint: 'Email và mật khẩu cho khách hàng, cứu hộ viên hoặc admin. Không cần SMS.',
  },
  en: {
    title: 'Welcome',
    subtitle: 'Choose a sign-in method to continue.',
    sms: 'Sign in with a phone number',
    smsHint: 'Receive a verification code by SMS.',
    test: 'Test sign-in',
    testHint: 'Email and password for customer, provider or admin accounts. No SMS required.',
  },
} as const;

export default function LoginScreen() {
  const c = useCopy(COPY);
  const { language, setLanguage } = useI18n();
  const testEnabled = canUseDevPasswordLogin(
    __DEV__,
    Constants.expoConfig?.extra?.appEnvironment,
    Constants.expoConfig?.extra?.devPasswordLoginEnabled,
  );
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('../../assets/branding/moki-rescue-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessible
          accessibilityLabel="Moki Rescue"
        />
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.subtitle}>{c.subtitle}</Text>
        {testEnabled ? (
          <NavigationCard
            title={c.test}
            description={c.testHint}
            icon="flask-outline"
            onPress={() => router.push('/(auth)/test-login')}
          />
        ) : null}
        <NavigationCard
          title={c.sms}
          description={c.smsHint}
          icon="phone-portrait-outline"
          onPress={() => router.push('/(auth)/sms-login')}
        />
        <AppButton
          title={language === 'vi' ? 'English' : 'Tiếng Việt'}
          variant="ghost"
          onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  logo: { width: 104, height: 104, alignSelf: 'center', marginBottom: Spacing.md },
  title: { ...Typography.h1, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});
