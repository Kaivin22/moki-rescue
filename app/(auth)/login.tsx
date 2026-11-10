import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DevPasswordLoginPanel } from '@/src/features/auth/DevPasswordLoginPanel';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { canUseDevPasswordLogin } from '@/src/features/auth/devPasswordLogin';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Chào mừng bạn',
    subtitle: 'Đăng nhập để tiếp tục.',
    sms: 'Đăng nhập bằng số điện thoại',
  },
  en: {
    title: 'Welcome',
    subtitle: 'Sign in to continue.',
    sms: 'Sign in with a phone number',
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
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../../assets/branding/moki-rescue-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="Moki Rescue"
          />
          {testEnabled ? (
            <DevPasswordLoginPanel enabled={testEnabled} />
          ) : (
            <>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.subtitle}>{c.subtitle}</Text>
            </>
          )}
          <AppButton title={c.sms} variant="outline" onPress={() => router.push('/(auth)/sms-login')} />
          <AppButton
            title={language === 'vi' ? 'English' : 'Tiếng Việt'}
            variant="ghost"
            onPress={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
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
