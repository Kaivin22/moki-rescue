import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { getAppVersionLabel } from '@/src/utils/appInfo';
import { unregisterPushNotifications } from '@/src/features/notifications/pushNotifications';
import { stopProviderBackgroundTracking } from '@/src/features/rescue/services/backgroundLocation';
import { roleLabel } from '@/src/features/auth/roles';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    hidden: 'Không hiển thị',
    title: 'Tài khoản',
    user: 'Người dùng',
    loadingRole: 'Đang tải vai trò…',
    accountId: 'Mã tài khoản',
    account: 'Tài khoản',
    edit: 'Chỉnh sửa hồ sơ',
    editSub: 'Chỉ lưu tên hiển thị tối thiểu',
    security: 'Bảo mật tài khoản',
    securitySub: 'OTP và trạng thái phiên đăng nhập',
    settings: 'Cài đặt',
    settingsSub: 'Ngôn ngữ, vị trí và dữ liệu',
    support: 'Trợ giúp và minh bạch',
    help: 'Trung tâm trợ giúp',
    helpSub: 'An toàn và xử lý vấn đề trong ca',
    privacy: 'Chính sách quyền riêng tư',
    terms: 'Điều khoản sử dụng',
    logout: 'Đăng xuất',
  },
  en: {
    hidden: 'Not displayed',
    title: 'Account',
    user: 'User',
    loadingRole: 'Loading role…',
    accountId: 'Account ID',
    account: 'Account',
    edit: 'Edit profile',
    editSub: 'Only a minimal display name is stored',
    security: 'Account security',
    securitySub: 'OTP and current session status',
    settings: 'Settings',
    settingsSub: 'Language, location, and data',
    support: 'Help and transparency',
    help: 'Help center',
    helpSub: 'Safety and resolving issues during a request',
    privacy: 'Privacy policy',
    terms: 'Terms of use',
    logout: 'Sign out',
  },
} as const;

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={21} color={danger ? Colors.error : Colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={19} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuthStore();
  const c = useCopy(COPY);
  const language = useI18n((state) => state.language);
  const maskedPhone = user?.phone ? `${user.phone.slice(0, 4)}••••${user.phone.slice(-3)}` : c.hidden;
  const logout = async () => {
    await Promise.allSettled([unregisterPushNotifications(), stopProviderBackgroundTracking()]);
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]}>
        <Text style={styles.title}>{c.title}</Text>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={34} color={Colors.white} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{profile?.display_name ?? c.user}</Text>
            <Text style={styles.role}>{profile ? roleLabel(profile.role, language) : c.loadingRole}</Text>
            <Text style={styles.phone}>{maskedPhone}</Text>
            <Text style={styles.accountId} numberOfLines={1}>
              {c.accountId}: {profile?.id ?? '…'}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>{c.account}</Text>
        <View style={styles.card}>
          <MenuRow
            icon="person-outline"
            title={c.edit}
            subtitle={c.editSub}
            onPress={() => router.push('/profile/edit')}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            title={c.security}
            subtitle={c.securitySub}
            onPress={() => router.push('/profile/security')}
          />
          <MenuRow
            icon="settings-outline"
            title={c.settings}
            subtitle={c.settingsSub}
            onPress={() => router.push('/profile/settings')}
          />
        </View>

        <Text style={styles.section}>{c.support}</Text>
        <View style={styles.card}>
          <MenuRow
            icon="help-buoy-outline"
            title={c.help}
            subtitle={c.helpSub}
            onPress={() => router.push('/help')}
          />
          <MenuRow
            icon="shield-checkmark-outline"
            title={c.privacy}
            onPress={() => router.push('/legal/privacy')}
          />
          <MenuRow icon="document-text-outline" title={c.terms} onPress={() => router.push('/legal/terms')} />
        </View>

        <View style={styles.card}>
          <MenuRow icon="log-out-outline" title={c.logout} onPress={() => void logout()} danger />
        </View>
        <Text style={styles.version}>{getAppVersionLabel()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  title: { ...Typography.h1, color: Colors.textPrimary },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.primaryDark,
    borderRadius: Radius.xl,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...Typography.h2, color: Colors.white },
  role: { ...Typography.caption, color: Colors.accent, marginTop: 2 },
  phone: { ...Typography.caption, color: Colors.skyBlue, marginTop: 2 },
  accountId: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  section: { ...Typography.label, color: Colors.textSecondary, marginTop: Spacing.sm },
  card: {
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    minHeight: 68,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.surface },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  rowSubtitle: { ...Typography.caption, color: Colors.textMuted },
  dangerIcon: { backgroundColor: Colors.errorSoft },
  dangerText: { color: Colors.error },
  version: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
  flex: { flex: 1 },
});
