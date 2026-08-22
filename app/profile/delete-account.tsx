import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { stopProviderBackgroundTracking } from '@/src/features/rescue/services/backgroundLocation';
import { useAuthStore } from '@/src/stores/authStore';
import { clearStoredPushToken } from '@/src/features/notifications/pushNotifications';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    errorTitle: 'Chưa thể xóa tài khoản',
    retry: 'Vui lòng thử lại.',
    warningTitle: 'Yêu cầu không thể hoàn tác trong ứng dụng',
    warningBody:
      'Bạn phải hoàn tất hoặc hủy mọi ca đang hoạt động. Tài khoản sẽ bị vô hiệu hóa ngay, sau đó đơn vị vận hành xóa dữ liệu nhận dạng theo thời hạn chính sách; sự kiện audit tối thiểu có thể được giữ để chống gian lận và giải quyết tranh chấp.',
    label: 'Nhập XOA để xác nhận',
    submit: 'Gửi yêu cầu xóa',
    back: 'Quay lại',
  },
  en: {
    errorTitle: 'Account cannot be deleted',
    retry: 'Please try again.',
    warningTitle: 'This request cannot be undone in the app',
    warningBody:
      'You must complete or cancel every active rescue request. The account is disabled immediately, then the operator removes identifying data within the policy period. Minimal audit events may be retained to prevent fraud and resolve disputes.',
    label: 'Enter XOA to confirm',
    submit: 'Request deletion',
    back: 'Go back',
  },
} as const;

export default function DeleteAccountScreen() {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const signOut = useAuthStore((state) => state.signOut);
  const c = useCopy(COPY);

  const requestDeletion = async () => {
    if (confirmation !== 'XOA') return;
    setBusy(true);
    try {
      await rescueApi.requestAccountDeletion();
      await stopProviderBackgroundTracking().catch(() => undefined);
      await clearStoredPushToken();
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert(c.errorTitle, error instanceof ApiClientError ? error.message : c.retry);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>{c.warningTitle}</Text>
          <Text style={styles.warningBody}>{c.warningBody}</Text>
        </View>
        <AppInput
          label={c.label}
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="characters"
        />
        <AppButton
          title={c.submit}
          variant="destructive"
          disabled={confirmation !== 'XOA'}
          loading={busy}
          onPress={() => void requestDeletion()}
        />
        <AppButton
          title={c.back}
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  warning: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  warningTitle: { ...Typography.h3, color: Colors.error },
  warningBody: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm },
});
