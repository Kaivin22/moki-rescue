import Constants from 'expo-constants';
import { Redirect, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { DevPasswordLoginPanel } from '@/src/features/auth/DevPasswordLoginPanel';
import { canUseDevPasswordLogin } from '@/src/features/auth/devPasswordLogin';
import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/spacing';
import { useI18n } from '@/src/i18n';

export default function TestLoginScreen() {
  const language = useI18n((state) => state.language);
  const enabled = canUseDevPasswordLogin(
    __DEV__,
    Constants.expoConfig?.extra?.appEnvironment,
    Constants.expoConfig?.extra?.devPasswordLoginEnabled,
  );
  if (!enabled) return <Redirect href="/(auth)/login" />;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader
        title={language === 'vi' ? 'Đăng nhập kiểm thử' : 'Test sign-in'}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <DevPasswordLoginPanel enabled={enabled} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
});
