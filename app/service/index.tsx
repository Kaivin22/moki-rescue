import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useServiceTypes } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    header: 'Dịch vụ cứu hộ',
    title: 'Chọn đúng loại sự cố',
    subtitle:
      'Danh mục được lấy từ hệ thống vận hành. Đội cứu hộ chỉ nhận ca đúng năng lực đã được xác minh.',
    loading: 'Đang tải danh mục dịch vụ…',
    errorTitle: 'Chưa tải được danh mục',
    errorBody: 'Kiểm tra kết nối rồi thử lại. Ứng dụng không thay bằng dữ liệu mẫu.',
    retry: 'Thử lại',
    emptyTitle: 'Chưa có dịch vụ đang mở',
    emptyBody: 'Đơn vị vận hành chưa công bố loại sự cố có thể tiếp nhận.',
    view: 'Xem dịch vụ',
    quote: 'Báo giá sau khi kiểm tra xe',
    noQuote: 'Không yêu cầu báo giá trước',
  },
  en: {
    header: 'Rescue services',
    title: 'Choose the correct issue',
    subtitle:
      'The catalog comes from the operations system. Rescue teams only receive requests matching verified capabilities.',
    loading: 'Loading service catalog…',
    errorTitle: 'Could not load the catalog',
    errorBody: 'Check your connection and try again. The app does not substitute mock data.',
    retry: 'Try again',
    emptyTitle: 'No services are open',
    emptyBody: 'The operator has not published an issue type it can currently accept.',
    view: 'View service',
    quote: 'Quote after motorcycle inspection',
    noQuote: 'No advance quote required',
  },
} as const;

export default function ServiceCatalogScreen() {
  const services = useServiceTypes();
  const c = useCopy(COPY);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.header} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.subtitle}>{c.subtitle}</Text>

        {services.isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={styles.stateText}>{c.loading}</Text>
          </View>
        ) : null}
        {services.isError ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={30} color={Colors.error} />
            <Text style={styles.stateTitle}>{c.errorTitle}</Text>
            <Text style={styles.stateText}>{c.errorBody}</Text>
            <AppButton title={c.retry} variant="outline" onPress={() => void services.refetch()} />
          </View>
        ) : null}
        {!services.isLoading && !services.isError && services.data?.length === 0 ? (
          <View style={styles.stateCard}>
            <Ionicons name="construct-outline" size={30} color={Colors.warning} />
            <Text style={styles.stateTitle}>{c.emptyTitle}</Text>
            <Text style={styles.stateText}>{c.emptyBody}</Text>
          </View>
        ) : null}

        {(services.data ?? []).map((service) => (
          <Pressable
            key={service.code}
            style={({ pressed }) => [styles.service, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/service/[code]', params: { code: service.code } })}
            accessibilityRole="button"
            accessibilityLabel={`${c.view} ${service.label}`}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={service.iconName as keyof typeof Ionicons.glyphMap}
                size={27}
                color={Colors.primary}
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.serviceTitle}>{service.label}</Text>
              <Text style={styles.serviceDescription} numberOfLines={3}>
                {service.description}
              </Text>
              <Text style={styles.quoteLabel}>{service.requiresQuote ? c.quote : c.noQuote}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { backgroundColor: Colors.surface },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sky,
  },
  serviceTitle: { ...Typography.h3, color: Colors.textPrimary },
  serviceDescription: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  quoteLabel: {
    ...Typography.caption,
    color: Colors.primary,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginTop: Spacing.xs,
  },
  stateCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stateTitle: { ...Typography.h3, color: Colors.textPrimary, textAlign: 'center' },
  stateText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  flex: { flex: 1 },
});
