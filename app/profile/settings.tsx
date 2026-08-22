import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { LANGUAGES, type Language, useCopy, useI18n } from '@/src/i18n';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { registerPushNotifications } from '@/src/features/notifications/pushNotifications';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';

type PushState = 'unchecked' | 'registered' | 'expo-go' | 'unavailable' | 'denied';
const COPY = {
  vi: {
    locationReadError: 'Không thể đọc quyền vị trí của thiết bị.',
    languageSyncError: 'Không thể đồng bộ ngôn ngữ. Cài đặt chưa được thay đổi.',
    locationSettingsError: 'Không thể mở cài đặt quyền vị trí trên thiết bị này.',
    language: 'Ngôn ngữ',
    permissions: 'Quyền và dữ liệu',
    location: 'Quyền vị trí',
    granted: 'Chỉ khi dùng ứng dụng',
    denied: 'Chưa được cho phép',
    notifications: 'Thông báo ca cứu hộ',
    privacy: 'Dữ liệu được xử lý thế nào',
    delete: 'Yêu cầu xóa tài khoản',
    note: 'MotoRescue không yêu cầu quyền danh bạ, micro hoặc truy cập vị trí nền trong bản Expo Go.',
    push: {
      unchecked: 'Chạm để kiểm tra',
      registered: 'Đã bật trên thiết bị này',
      'expo-go': 'Expo Go không nhận push từ xa; dùng development build',
      unavailable: 'Thiết bị hoặc EAS project chưa sẵn sàng',
      denied: 'Đã từ chối trong cài đặt hệ thống',
    },
  },
  en: {
    locationReadError: "Could not read this device's location permission.",
    languageSyncError: 'Could not sync the language. The setting was not changed.',
    locationSettingsError: 'Could not open location settings on this device.',
    language: 'Language',
    permissions: 'Permissions and data',
    location: 'Location permission',
    granted: 'While using the app',
    denied: 'Not allowed',
    notifications: 'Rescue notifications',
    privacy: 'How your data is processed',
    delete: 'Request account deletion',
    note: 'MotoRescue does not request contacts, microphone, or background location access in Expo Go.',
    push: {
      unchecked: 'Tap to check',
      registered: 'Enabled on this device',
      'expo-go': 'Expo Go cannot receive remote push; use a development build',
      unavailable: 'The device or EAS project is not ready',
      denied: 'Denied in system settings',
    },
  },
} as const;

export default function SettingsScreen() {
  const { language, setLanguage } = useI18n();
  const profile = useAuthStore((state) => state.profile);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const queryClient = useQueryClient();
  const c = useCopy(COPY);
  const [permission, setPermission] = useState<Location.PermissionStatus | null>(null);
  const [pushStatus, setPushStatus] = useState<PushState>('unchecked');
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Location.getForegroundPermissionsAsync()
      .then((value) => {
        if (active) setPermission(value.status);
      })
      .catch(() => {
        if (active) setMessage(c.locationReadError);
      });
    return () => {
      active = false;
    };
  }, [c.locationReadError]);

  const changeLanguage = async (next: Language) => {
    if (next === language || savingLanguage) return;
    setSavingLanguage(true);
    setMessage(null);
    try {
      if (profile) {
        const { error } = await supabase.from('profiles').update({ locale: next }).eq('id', profile.id);
        if (error) throw error;
      }
      setLanguage(next);
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: rescueKeys.all });
    } catch {
      setMessage(c.languageSyncError);
    } finally {
      setSavingLanguage(false);
    }
  };

  const manageLocation = async () => {
    setMessage(null);
    try {
      if (permission === Location.PermissionStatus.UNDETERMINED) {
        const result = await Location.requestForegroundPermissionsAsync();
        setPermission(result.status);
      } else if (Platform.OS !== 'web') await Linking.openSettings();
    } catch {
      setMessage(c.locationSettingsError);
    }
  };

  const manageNotifications = async () => {
    const result = await registerPushNotifications().catch(() => 'unavailable' as const);
    setPushStatus(result);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {message ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        ) : null}
        <Text style={styles.section}>{c.language}</Text>
        <View style={styles.card}>
          {LANGUAGES.map((item) => (
            <Pressable
              key={item.code}
              accessibilityRole="radio"
              accessibilityState={{ checked: language === item.code, disabled: savingLanguage }}
              disabled={savingLanguage}
              style={[styles.row, savingLanguage && styles.disabled]}
              onPress={() => void changeLanguage(item.code)}
            >
              <Text style={styles.rowTitle}>{item.nativeName}</Text>
              <Ionicons
                name={language === item.code ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={language === item.code ? Colors.primary : Colors.textMuted}
              />
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{c.permissions}</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={() => void manageLocation()}>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{c.location}</Text>
              <Text style={styles.rowSub}>
                {permission === Location.PermissionStatus.GRANTED ? c.granted : c.denied}
              </Text>
            </View>
            <Ionicons name="open-outline" size={20} color={Colors.primary} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => void manageNotifications()}>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{c.notifications}</Text>
              <Text style={styles.rowSub}>{c.push[pushStatus]}</Text>
            </View>
            <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/legal/privacy')}>
            <Text style={styles.rowTitle}>{c.privacy}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>
          <Pressable style={styles.row} onPress={() => router.push('/profile/delete-account')}>
            <Text style={styles.delete}>{c.delete}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.error} />
          </Pressable>
        </View>
        <Text style={styles.note}>{c.note}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  section: { ...Typography.label, color: Colors.textSecondary, marginTop: Spacing.sm },
  card: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  rowSub: { ...Typography.caption, color: Colors.textMuted },
  delete: { ...Typography.bodyBold, color: Colors.error },
  note: { ...Typography.caption, color: Colors.textMuted },
  flex: { flex: 1 },
  error: {
    ...Typography.body,
    color: Colors.error,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorSoft,
  },
  disabled: { opacity: 0.55 },
});
