import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    invalidTitle: 'Tên chưa hợp lệ',
    invalidBody: 'Tên hiển thị cần từ 2 đến 80 ký tự.',
    saveError: 'Không thể lưu',
    saveErrorBody: 'Dữ liệu chưa thay đổi. Vui lòng thử lại.',
    note: 'Để giảm dữ liệu cá nhân, hồ sơ công khai chỉ dùng tên hiển thị. Số điện thoại nằm trong hệ thống xác thực và không hiển thị cho người dùng khác.',
    label: 'Tên hiển thị',
    save: 'Lưu thay đổi',
  },
  en: {
    invalidTitle: 'Invalid name',
    invalidBody: 'The display name must be between 2 and 80 characters.',
    saveError: 'Could not save',
    saveErrorBody: 'Your data was not changed. Please try again.',
    note: 'To minimize personal data, the public profile only uses a display name. Your phone number stays in the authentication system and is not shown to other users.',
    label: 'Display name',
    save: 'Save changes',
  },
} as const;

export default function EditProfileScreen() {
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [busy, setBusy] = useState(false);
  const c = useCopy(COPY);

  const save = async () => {
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!profile || normalized.length < 2) return Alert.alert(c.invalidTitle, c.invalidBody);
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: normalized })
      .eq('id', profile.id);
    if (error) Alert.alert(c.saveError, c.saveErrorBody);
    else {
      await refreshProfile();
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/profile');
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.note}>{c.note}</Text>
          <AppInput
            label={c.label}
            value={name}
            onChangeText={setName}
            maxLength={80}
            autoCapitalize="words"
          />
          <AppButton title={c.save} onPress={() => void save()} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  note: { ...Typography.body, color: Colors.textSecondary },
});
