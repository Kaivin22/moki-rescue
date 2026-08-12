import React, { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { useItineraryStore } from '@/src/stores/itineraryStore';
import { supabase } from '@/src/services/supabase';
import { authErrorMessage } from '@/src/features/auth/authErrors';
import { clearSearchHistory } from '@/src/features/search/searchHistory';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';
import { LANGUAGES, useI18n } from '@/src/i18n';
import { getAppInfo } from '@/src/utils/appInfo';

interface SettingsRowProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  trailing?: ReactNode;
}

function SettingsRow({ icon, title, subtitle, onPress, destructive, trailing }: SettingsRowProps) {
  const content = (
    <>
      <View style={[styles.rowIcon, destructive && styles.rowIconDanger]}>
        <Ionicons name={icon} size={20} color={destructive ? Colors.error : Colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, destructive && styles.rowTitleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /> : null)}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button">
      {content}
    </TouchableOpacity>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function locationStatusLabel(permission: Location.LocationPermissionResponse | null, loading: boolean): string {
  if (loading) return 'Đang kiểm tra…';
  if (!permission) return 'Không kiểm tra được';
  if (permission.status === Location.PermissionStatus.GRANTED) return 'Đã cho phép khi dùng ứng dụng';
  if (permission.status === Location.PermissionStatus.DENIED) {
    return permission.canAskAgain ? 'Đã từ chối · Có thể yêu cầu lại' : 'Đã từ chối · Mở cài đặt hệ thống để đổi';
  }
  return 'Chưa yêu cầu';
}

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const resetItinerary = useItineraryStore((state) => state.reset);
  const queryClient = useQueryClient();
  const reduceMotion = useReduceMotion();
  const { language, setLanguage } = useI18n();
  const appInfo = getAppInfo();
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [sendingPasswordEmail, setSendingPasswordEmail] = useState(false);

  const refreshLocationPermission = useCallback(async () => {
    setPermissionLoading(true);
    try {
      setPermission(await Location.getForegroundPermissionsAsync());
    } catch {
      setPermission(null);
    } finally {
      setPermissionLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void refreshLocationPermission();
  }, [refreshLocationPermission]));

  const manageLocationPermission = async () => {
    if (permissionLoading) return;
    try {
      if (permission?.status === Location.PermissionStatus.GRANTED || permission?.canAskAgain === false) {
        if (Platform.OS === 'web') {
          Alert.alert('Quyền vị trí', 'Hãy thay đổi quyền vị trí trong cài đặt của trình duyệt.');
        } else {
          await Linking.openSettings();
        }
        return;
      }
      setPermissionLoading(true);
      setPermission(await Location.requestForegroundPermissionsAsync());
    } catch {
      Alert.alert('Không thể cập nhật quyền', 'Hãy thử lại hoặc mở cài đặt hệ thống.');
    } finally {
      setPermissionLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!user?.email || sendingPasswordEmail) return;
    setSendingPasswordEmail(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: Linking.createURL('/(auth)/reset-password'),
    });
    setSendingPasswordEmail(false);
    if (error) {
      Alert.alert('Không thể gửi email', authErrorMessage(error, 'Vui lòng thử lại sau.'));
      return;
    }
    Alert.alert('Đã gửi email', `Liên kết đổi mật khẩu đã được gửi tới ${user.email}.`);
  };

  const confirmClearHistory = () => {
    Alert.alert('Xóa lịch sử tìm kiếm', 'Thao tác này chỉ xóa lịch sử tìm kiếm trên thiết bị hiện tại.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearSearchHistory(user?.id);
            Alert.alert('Đã xóa', 'Lịch sử tìm kiếm trên thiết bị đã được xóa.');
          } catch {
            Alert.alert('Không thể xóa', 'Vui lòng thử lại.');
          }
        },
      },
    ]);
  };

  const confirmSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi thiết bị này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          queryClient.removeQueries();
          resetItinerary();
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsSection title="Tài khoản & bảo mật">
          <SettingsRow
            icon="mail-outline"
            title={user?.email || 'Không có email'}
            subtitle={user?.email_confirmed_at ? 'Email đã xác minh' : 'Email chưa xác minh'}
            trailing={<Ionicons name={user?.email_confirmed_at ? 'checkmark-circle' : 'alert-circle'} size={20} color={user?.email_confirmed_at ? Colors.success : Colors.warning} />}
          />
          <SettingsRow
            icon="key-outline"
            title="Đổi mật khẩu"
            subtitle="Gửi liên kết bảo mật tới email đăng nhập"
            onPress={user?.email ? sendPasswordReset : undefined}
            trailing={sendingPasswordEmail ? <ActivityIndicator size="small" color={Colors.primary} /> : undefined}
          />
          <SettingsRow icon="log-out-outline" title="Đăng xuất" onPress={confirmSignOut} destructive />
        </SettingsSection>

        <SettingsSection title="Quyền & khả năng truy cập">
          <SettingsRow
            icon="location-outline"
            title="Quyền vị trí"
            subtitle={locationStatusLabel(permission, permissionLoading)}
            onPress={manageLocationPermission}
            trailing={permissionLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : undefined}
          />
          <SettingsRow
            icon="accessibility-outline"
            title="Giảm chuyển động"
            subtitle={`Theo cài đặt hệ thống · ${reduceMotion ? 'Đang bật' : 'Đang tắt'}`}
          />
          {LANGUAGES.length > 1 ? (
            <View style={styles.languageBlock}>
              <Text style={styles.rowTitle}>Ngôn ngữ</Text>
              <View style={styles.languageOptions}>
                {LANGUAGES.map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.languageChip, language === item.code && styles.languageChipActive]}
                    onPress={() => setLanguage(item.code)}
                  >
                    <Text>{item.flag} {item.nativeName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Quyền riêng tư & dữ liệu">
          <SettingsRow icon="trash-bin-outline" title="Xóa lịch sử tìm kiếm" subtitle="Chỉ dữ liệu trên thiết bị này" onPress={confirmClearHistory} />
          <SettingsRow icon="document-text-outline" title="Điều khoản sử dụng" onPress={() => router.push('/legal/terms')} />
          <SettingsRow icon="shield-outline" title="Chính sách quyền riêng tư" onPress={() => router.push('/legal/privacy')} />
          <SettingsRow icon="person-remove-outline" title="Xóa tài khoản và dữ liệu" onPress={() => router.push('/profile/delete-account')} destructive />
        </SettingsSection>

        <SettingsSection title="Hỗ trợ & giới thiệu">
          <SettingsRow icon="headset-outline" title="Trung tâm hỗ trợ" onPress={() => router.push('/support')} />
          <SettingsRow
            icon="information-circle-outline"
            title={appInfo.name}
            subtitle={`Phiên bản ${appInfo.version}${appInfo.build ? ` · Build ${appInfo.build}` : ''}`}
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.divider, overflow: 'hidden' },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  rowIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: '#FFF0F0' },
  rowContent: { flex: 1 },
  rowTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  rowTitleDanger: { color: Colors.error },
  rowSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3 },
  languageBlock: { padding: Spacing.md },
  languageOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  languageChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider },
  languageChipActive: { borderColor: Colors.primary, backgroundColor: Colors.surface },
});
