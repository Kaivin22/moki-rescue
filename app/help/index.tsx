import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useCopy } from '@/src/i18n';

const SUPPORT_HOTLINE = String(Constants.expoConfig?.extra?.supportHotline ?? '').replace(/[^+\d]/g, '');
const COPY = {
  vi: {
    header: 'Trợ giúp',
    heroTitle: 'Bạn cần hỗ trợ gì?',
    heroBody: 'Ưu tiên an toàn, sau đó mới xử lý sự cố kỹ thuật và vấn đề của ca.',
    quick: 'Hỗ trợ nhanh',
    safety: 'An toàn bên đường',
    safetySub: 'Xử lý khi đang ở vị trí nguy hiểm',
    services: 'Các dịch vụ có thể yêu cầu',
    servicesSub: 'Phạm vi và quy trình từng loại sự cố',
    security: 'Bảo mật tài khoản',
    securitySub: 'OTP, phiên đăng nhập và dữ liệu tối thiểu',
    issue: 'Khi ca gặp vấn đề',
    noProvider: 'Không thấy cứu hộ viên',
    noProviderBody:
      'Không xác nhận “đã đến”. Dùng nút “Chưa thấy cứu hộ viên” trong chi tiết ca để hệ thống ghi nhận đúng trạng thái.',
    noRoute: 'Tuyến đường không hiển thị',
    noRouteBody:
      'Ứng dụng không vẽ đường chim bay. Thông báo “chưa có tuyến” nghĩa là dịch vụ định tuyến chưa trả được đường giao thông hợp lệ.',
    quote: 'Báo giá không phù hợp',
    quoteBody:
      'Từ chối báo giá ngay trong ca. Không xác nhận hoàn tất khi công việc chưa được thực hiện đúng.',
    contact: 'Liên hệ',
    call: 'Gọi điều phối MotoRescue',
    hotline: 'Hotline điều phối',
    unconfigured: 'Chưa được cấu hình cho môi trường này',
    terms: 'Điều khoản sử dụng',
    termsSub: 'Trách nhiệm của khách và đội cứu hộ',
    privacy: 'Chính sách quyền riêng tư',
    privacySub: 'Dữ liệu nào được thu thập và lưu giữ',
  },
  en: {
    header: 'Help',
    heroTitle: 'How can we help?',
    heroBody: 'Prioritize safety, then handle the technical issue and any request problem.',
    quick: 'Quick help',
    safety: 'Roadside safety',
    safetySub: 'What to do in a dangerous location',
    services: 'Available rescue services',
    servicesSub: 'Coverage and process for each issue type',
    security: 'Account security',
    securitySub: 'OTP, sessions, and minimal data',
    issue: 'When a request has a problem',
    noProvider: 'Cannot see the rescue provider',
    noProviderBody:
      'Do not confirm arrival. Use “Provider not here” in request details so the system records the correct state.',
    noRoute: 'Route is not displayed',
    noRouteBody:
      'The app never draws a straight-line route. “Route unavailable” means the routing service did not return a valid road route.',
    quote: 'The quote is not acceptable',
    quoteBody:
      'Reject the quote in the request. Do not confirm completion until the agreed work is actually complete.',
    contact: 'Contact',
    call: 'Call MotoRescue dispatch',
    hotline: 'Dispatch hotline',
    unconfigured: 'Not configured for this environment',
    terms: 'Terms of use',
    termsSub: 'Customer and rescue team responsibilities',
    privacy: 'Privacy policy',
    privacySub: 'What data is collected and retained',
  },
} as const;

function HelpRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.icon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function HelpCenterScreen() {
  const c = useCopy(COPY);
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.header} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy-outline" size={32} color={Colors.primaryDark} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroTitle}>{c.heroTitle}</Text>
            <Text style={styles.heroBody}>{c.heroBody}</Text>
          </View>
        </View>

        <Text style={styles.section}>{c.quick}</Text>
        <View style={styles.card}>
          <HelpRow
            icon="warning-outline"
            title={c.safety}
            subtitle={c.safetySub}
            onPress={() => router.push('/help/safety')}
          />
          <HelpRow
            icon="list-outline"
            title={c.services}
            subtitle={c.servicesSub}
            onPress={() => router.push('/service')}
          />
          <HelpRow
            icon="shield-checkmark-outline"
            title={c.security}
            subtitle={c.securitySub}
            onPress={() => router.push('/profile/security')}
          />
        </View>

        <Text style={styles.section}>{c.issue}</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{c.noProvider}</Text>
          <Text style={styles.infoBody}>{c.noProviderBody}</Text>
          <Text style={styles.infoTitle}>{c.noRoute}</Text>
          <Text style={styles.infoBody}>{c.noRouteBody}</Text>
          <Text style={styles.infoTitle}>{c.quote}</Text>
          <Text style={styles.infoBody}>{c.quoteBody}</Text>
        </View>

        <Text style={styles.section}>{c.contact}</Text>
        <View style={styles.card}>
          {SUPPORT_HOTLINE ? (
            <HelpRow
              icon="call-outline"
              title={c.call}
              subtitle={SUPPORT_HOTLINE}
              onPress={() => void Linking.openURL(`tel:${SUPPORT_HOTLINE}`)}
            />
          ) : (
            <View style={styles.row}>
              <View style={styles.icon}>
                <Ionicons name="call-outline" size={22} color={Colors.textMuted} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{c.hotline}</Text>
                <Text style={styles.rowSubtitle}>{c.unconfigured}</Text>
              </View>
            </View>
          )}
          <HelpRow
            icon="document-text-outline"
            title={c.terms}
            subtitle={c.termsSub}
            onPress={() => router.push('/legal/terms')}
          />
          <HelpRow
            icon="lock-closed-outline"
            title={c.privacy}
            subtitle={c.privacySub}
            onPress={() => router.push('/legal/privacy')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryDark,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  heroTitle: { ...Typography.h2, color: Colors.white },
  heroBody: { ...Typography.caption, color: Colors.skyBlue, marginTop: 2 },
  section: { ...Typography.label, color: Colors.textSecondary, marginTop: Spacing.sm },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.surface },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sky,
  },
  rowTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  rowSubtitle: { ...Typography.caption, color: Colors.textMuted },
  infoCard: {
    gap: Spacing.xs,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.sm },
  infoBody: { ...Typography.body, color: Colors.textSecondary },
  flex: { flex: 1 },
});
