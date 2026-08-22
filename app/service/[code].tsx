import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useServiceTypes } from '@/src/features/rescue/hooks/useRescueQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    loading: 'Đang tải dịch vụ…',
    header: 'Chi tiết dịch vụ',
    unavailable: 'Dịch vụ không khả dụng',
    updated: 'Danh mục có thể đã được đơn vị vận hành cập nhật.',
    catalog: 'Về danh mục',
    quote: 'Cần duyệt báo giá',
    noQuote: 'Không cần báo giá trước',
    quoteBody:
      'Giá chỉ được lập sau khi cứu hộ viên đến, kiểm tra xe và mô tả công việc. Bạn có quyền từ chối.',
    noQuoteBody: 'Ca vẫn phải qua các bước xác nhận có mặt và hoàn tất để hạn chế gian lận.',
    process: 'Quy trình xử lý',
    safety:
      'Có người bị thương, cháy, rò nhiên liệu hoặc nguy cơ tai nạn tiếp diễn thì gọi lực lượng khẩn cấp trước, không tạo ca kỹ thuật.',
    request: 'Yêu cầu',
    staff: 'Tài khoản nội bộ chỉ xem quy trình; chỉ khách hàng được tạo yêu cầu.',
    quoteSteps: [
      'Xác nhận an toàn và vị trí nhận cứu hộ',
      'Hệ thống tìm đội có đúng năng lực theo tuyến đường bộ',
      'Bạn xác nhận cứu hộ viên đã có mặt',
      'Cứu hộ viên kiểm tra xe và gửi báo giá',
      'Bạn duyệt báo giá trước khi sửa hoặc chở xe',
      'Hai bên xác nhận hoàn tất',
    ],
    directSteps: [
      'Xác nhận an toàn và vị trí nhận cứu hộ',
      'Hệ thống tìm đội có đúng năng lực theo tuyến đường bộ',
      'Bạn xác nhận cứu hộ viên đã có mặt',
      'Cứu hộ viên xử lý đúng loại sự cố',
      'Hai bên xác nhận hoàn tất',
    ],
  },
  en: {
    loading: 'Loading service…',
    header: 'Service details',
    unavailable: 'Service unavailable',
    updated: 'The catalog may have been updated by the operator.',
    catalog: 'Back to catalog',
    quote: 'Quote approval required',
    noQuote: 'No advance quote required',
    quoteBody:
      'A quote is created only after the rescue provider arrives, inspects the motorcycle, and describes the work. You may reject it.',
    noQuoteBody: 'Arrival and completion must still be confirmed by both sides to reduce fraud.',
    process: 'Service process',
    safety:
      'If anyone is injured, there is fire, leaking fuel, or continuing crash risk, contact emergency services first and do not create a technical rescue request.',
    request: 'Request',
    staff: 'Internal accounts can only view the process; only customers can create a request.',
    quoteSteps: [
      'Confirm safety and the rescue location',
      'Find a team with the right verified capability using road travel',
      'Confirm the rescue provider is physically present',
      'The provider inspects the motorcycle and submits a quote',
      'Approve the quote before repair or transport begins',
      'Both sides confirm completion',
    ],
    directSteps: [
      'Confirm safety and the rescue location',
      'Find a team with the right verified capability using road travel',
      'Confirm the rescue provider is physically present',
      'The provider handles the selected issue',
      'Both sides confirm completion',
    ],
  },
} as const;

export default function ServiceDetailsScreen() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const profile = useAuthStore((state) => state.profile);
  const services = useServiceTypes();
  const service = services.data?.find((item) => item.code === code);
  const c = useCopy(COPY);
  const language = useI18n((state) => state.language);

  if (services.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.muted}>{c.loading}</Text>
      </View>
    );
  }

  if (services.isError || !service) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title={c.header} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
          <Text style={styles.errorTitle}>{c.unavailable}</Text>
          <Text style={styles.muted}>{c.updated}</Text>
          <AppButton
            title={c.catalog}
            variant="outline"
            onPress={() => router.replace('/service')}
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  const steps = service.requiresQuote ? c.quoteSteps : c.directSteps;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.header} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={service.iconName as keyof typeof Ionicons.glyphMap}
              size={36}
              color={Colors.primaryDark}
            />
          </View>
          <Text style={styles.title}>{service.label}</Text>
          <Text style={styles.description}>{service.description}</Text>
        </View>

        <View style={styles.notice}>
          <Ionicons
            name={service.requiresQuote ? 'receipt-outline' : 'checkmark-circle-outline'}
            size={23}
            color={service.requiresQuote ? Colors.warning : Colors.success}
          />
          <View style={styles.flex}>
            <Text style={styles.noticeTitle}>{service.requiresQuote ? c.quote : c.noQuote}</Text>
            <Text style={styles.noticeBody}>{service.requiresQuote ? c.quoteBody : c.noQuoteBody}</Text>
          </View>
        </View>

        <Text style={styles.section}>{c.process}</Text>
        <View style={styles.steps}>
          {steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepRail}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                {index < steps.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color={Colors.primary} />
          <Text style={styles.safetyText}>{c.safety}</Text>
        </View>

        {profile?.role === 'customer' ? (
          <AppButton
            title={`${c.request} ${service.label.toLocaleLowerCase(language === 'en' ? 'en-US' : 'vi-VN')}`}
            onPress={() => router.push({ pathname: '/(tabs)/request', params: { service: service.code } })}
          />
        ) : (
          <Text style={styles.staffNote}>{c.staff}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  hero: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryDark,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  title: { ...Typography.h1, color: Colors.white, textAlign: 'center' },
  description: { ...Typography.body, color: Colors.skyBlue, textAlign: 'center' },
  notice: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noticeTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  noticeBody: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  section: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.sm },
  steps: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.cardBg },
  step: { flexDirection: 'row', minHeight: 58 },
  stepRail: { width: 38, alignItems: 'center' },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  stepNumberText: { ...Typography.caption, color: Colors.white, fontFamily: 'BeVietnamPro_600SemiBold' },
  stepLine: { width: 2, flex: 1, backgroundColor: Colors.divider },
  stepText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    paddingTop: 3,
    paddingBottom: Spacing.md,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.sky,
  },
  safetyText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  staffNote: { ...Typography.body, color: Colors.textMuted, textAlign: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  muted: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  errorTitle: { ...Typography.h2, color: Colors.textPrimary },
  button: { minWidth: 180 },
  flex: { flex: 1 },
});
