import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { type Language, useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    noData: 'Chưa có dữ liệu',
    hidden: 'Không hiển thị',
    title: 'Bảo vệ bằng OTP',
    subtitle: 'MotoRescue dùng phiên đăng nhập Supabase và không lưu mật khẩu riêng trong ứng dụng.',
    account: 'Trạng thái tài khoản',
    phone: 'Số điện thoại',
    otp: 'Xác minh OTP',
    verified: 'Đã xác minh',
    unverified: 'Chưa xác minh',
    lastSignIn: 'Đăng nhập gần nhất',
    created: 'Tạo tài khoản',
    principles: 'Nguyên tắc an toàn',
    guideOtp: 'Không cung cấp mã OTP cho điều phối viên, cứu hộ viên hoặc bất kỳ người nào gọi đến.',
    guideMoney: 'MotoRescue không yêu cầu chuyển tiền để “mở khóa” tài khoản hay ưu tiên nhận ca.',
    guidePhone:
      'Nếu mất quyền kiểm soát số điện thoại, hãy đăng xuất và liên hệ nhà mạng trước khi tiếp tục sử dụng.',
    privacy: 'Xem dữ liệu được xử lý',
    note: 'Ứng dụng chỉ hiển thị phiên hiện tại. Việc thay đổi số điện thoại cần quy trình xác minh riêng và không được giả lập trong bản production.',
  },
  en: {
    noData: 'No data',
    hidden: 'Not displayed',
    title: 'Protected by OTP',
    subtitle: 'MotoRescue uses Supabase sessions and does not store a separate password in the app.',
    account: 'Account status',
    phone: 'Phone number',
    otp: 'OTP verification',
    verified: 'Verified',
    unverified: 'Not verified',
    lastSignIn: 'Last sign-in',
    created: 'Account created',
    principles: 'Safety principles',
    guideOtp: 'Never share your OTP with a dispatcher, rescue provider, or anyone who calls you.',
    guideMoney: 'MotoRescue never asks for a transfer to “unlock” an account or prioritize a request.',
    guidePhone:
      'If you lose control of your phone number, sign out and contact your carrier before continuing.',
    privacy: 'View processed data',
    note: 'The app only shows the current session. Changing a phone number requires a separate verification process and is not simulated in the production app.',
  },
} as const;

function formatDate(value: string | null | undefined, language: Language, noData: string) {
  if (!value) return noData;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? noData : date.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN');
}

function maskPhone(value: string | null | undefined, hidden: string) {
  if (!value) return hidden;
  return value.length > 7 ? `${value.slice(0, 4)}••••${value.slice(-3)}` : '•••••••';
}

function SecurityRow({
  icon,
  label,
  value,
  tone = 'normal',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: 'normal' | 'success';
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, tone === 'success' && styles.successIcon]}>
        <Ionicons name={icon} size={21} color={tone === 'success' ? Colors.success : Colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

export default function AccountSecurityScreen() {
  const user = useAuthStore((state) => state.user);
  const language = useI18n((state) => state.language);
  const c = useCopy(COPY);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.shield}>
            <Ionicons name="shield-checkmark" size={34} color={Colors.primaryDark} />
          </View>
          <Text style={styles.title}>{c.title}</Text>
          <Text style={styles.subtitle}>{c.subtitle}</Text>
        </View>

        <Text style={styles.section}>{c.account}</Text>
        <View style={styles.card}>
          <SecurityRow
            icon="phone-portrait-outline"
            label={c.phone}
            value={maskPhone(user?.phone, c.hidden)}
          />
          <SecurityRow
            icon="checkmark-circle-outline"
            label={c.otp}
            value={user?.phone_confirmed_at ? c.verified : c.unverified}
            tone={user?.phone_confirmed_at ? 'success' : 'normal'}
          />
          <SecurityRow
            icon="log-in-outline"
            label={c.lastSignIn}
            value={formatDate(user?.last_sign_in_at, language, c.noData)}
          />
          <SecurityRow
            icon="calendar-outline"
            label={c.created}
            value={formatDate(user?.created_at, language, c.noData)}
          />
        </View>

        <Text style={styles.section}>{c.principles}</Text>
        <View style={styles.guidance}>
          <Guidance icon="key-outline">{c.guideOtp}</Guidance>
          <Guidance icon="chatbubble-ellipses-outline">{c.guideMoney}</Guidance>
          <Guidance icon="phone-portrait-outline">{c.guidePhone}</Guidance>
        </View>

        <AppButton title={c.privacy} variant="outline" onPress={() => router.push('/legal/privacy')} />
        <Text style={styles.note}>{c.note}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Guidance({ icon, children }: { icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  return (
    <View style={styles.guidanceRow}>
      <Ionicons name={icon} size={21} color={Colors.primary} />
      <Text style={styles.guidanceText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  hero: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryDark,
  },
  shield: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  title: { ...Typography.h2, color: Colors.white },
  subtitle: { ...Typography.body, color: Colors.skyBlue, textAlign: 'center' },
  section: { ...Typography.label, color: Colors.textSecondary, marginTop: Spacing.sm },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sky,
  },
  successIcon: { backgroundColor: Colors.successSoft },
  label: { ...Typography.caption, color: Colors.textMuted },
  value: { ...Typography.bodyBold, color: Colors.textPrimary },
  guidance: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  guidanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  guidanceText: { ...Typography.body, color: Colors.textSecondary, flex: 1 },
  note: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center' },
  flex: { flex: 1 },
});
