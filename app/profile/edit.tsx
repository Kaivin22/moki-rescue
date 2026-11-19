import { useRouter } from 'expo-router';
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
import { contactPhone } from '@/src/features/auth/accountAuth';
import { normalizeVietnamesePhone } from '@/src/features/auth/phone';

const COPY = {
  vi: {
    invalidTitle: 'Tên chưa hợp lệ',
    invalidBody: 'Tên hiển thị cần từ 2 đến 80 ký tự.',
    saveError: 'Không thể lưu',
    saveErrorBody: 'Chưa lưu được đầy đủ thông tin. Hãy kiểm tra rồi thử lại.',
    note: 'Số liên hệ chỉ được chia sẻ với bên được giao xử lý ca và quản trị viên khi cần hỗ trợ.',
    phone: 'Số điện thoại liên hệ',
    phoneError: 'Hãy nhập số điện thoại Việt Nam hợp lệ.',
    label: 'Tên hiển thị',
    save: 'Lưu thay đổi',
  },
  en: {
    invalidTitle: 'Invalid name',
    invalidBody: 'The display name must be between 2 and 80 characters.',
    saveError: 'Could not save',
    saveErrorBody: 'Some details could not be saved. Please check and try again.',
    note: 'Your contact number is shared only with the assigned party and administrators when support is needed.',
    phone: 'Contact phone',
    phoneError: 'Enter a valid Vietnamese phone number.',
    label: 'Display name',
    save: 'Save changes',
  },
} as const;

export default function EditProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [phone, setPhone] = useState(contactPhone(useAuthStore.getState().user) ?? '');
  const [busy, setBusy] = useState(false);
  const c = useCopy(COPY);

  const save = async () => {
    if (busy) return;
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!profile || normalized.length < 2) return Alert.alert(c.invalidTitle, c.invalidBody);
    const normalizedPhone = normalizeVietnamesePhone(phone);
    if (!normalizedPhone) return Alert.alert(c.invalidTitle, c.phoneError);
    setBusy(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: normalized })
        .eq('id', profile.id);
      if (error) Alert.alert(c.saveError, c.saveErrorBody);
      else {
        const updated = await supabase.auth.updateUser({ data: { contact_phone: normalizedPhone } });
        if (updated.error) {
          Alert.alert(c.saveError, c.saveErrorBody);
          setBusy(false);
          return;
        }
        await useAuthStore.getState().syncUser(updated.data.user);
        await refreshProfile();
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/profile');
      }
    } catch {
      Alert.alert(c.saveError, c.saveErrorBody);
    } finally {
      setBusy(false);
    }
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
          <AppInput
            label={c.phone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!busy}
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
