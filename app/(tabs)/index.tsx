import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { RequestSummaryCard } from '@/src/features/rescue/components/RequestSummaryCard';
import { useRequests, useServiceTypes } from '@/src/features/rescue/hooks/useRescueQueries';
import { emergencyCallUri, MEDICAL_EMERGENCY_NUMBER } from '@/src/features/safety/emergencyContacts';
import { useAuthStore } from '@/src/stores/authStore';
import { roleLabel } from '@/src/features/auth/roles';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    you: 'bạn',
    customerBody: 'Gửi yêu cầu đúng sự cố, theo dõi đội cứu hộ và chỉ xác nhận khi họ thực sự có mặt.',
    providerBody: 'Chỉ bật sẵn sàng khi có thể nhận ca và giữ vị trí chính xác trong lúc đang phục vụ.',
    staffBody: 'Theo dõi ca chưa có đội, độ trễ nhận ca và tình trạng mạng lưới đối tác.',
    greeting: 'Chào',
    request: 'Yêu cầu cứu hộ xe máy',
    operations: 'Mở màn hình vận hành',
    emergencyTitle: 'Có người bị thương hoặc nguy hiểm?',
    emergencyBody: 'MotoRescue không thay thế cấp cứu. Nhấn để gọi',
    active: 'Ca đang hoạt động',
    all: 'Xem tất cả',
    loading: 'Đang tải trạng thái…',
    loadActiveError: 'Không tải được ca đang hoạt động.',
    noActive: 'Hiện không có ca nào đang mở.',
    services: 'Dịch vụ đang vận hành',
    loadServicesError: 'Không tải được danh mục dịch vụ.',
    serviceHint: 'Phạm vi và quy trình',
  },
  en: {
    you: 'there',
    customerBody:
      'Send the right issue type, track the rescue team, and confirm only when they are actually present.',
    providerBody:
      'Only go available when you can accept a request, and keep your location accurate while working.',
    staffBody: 'Monitor unmatched requests, acceptance delays, and partner network health.',
    greeting: 'Hello',
    request: 'Request motorcycle rescue',
    operations: 'Open operations',
    emergencyTitle: 'Is anyone injured or in danger?',
    emergencyBody: 'MotoRescue is not an emergency service. Tap to call',
    active: 'Active requests',
    all: 'View all',
    loading: 'Loading status…',
    loadActiveError: 'Could not load active requests.',
    noActive: 'There are no active requests.',
    services: 'Available services',
    loadServicesError: 'Could not load the service catalog.',
    serviceHint: 'Coverage and process',
  },
} as const;

export default function HomeScreen() {
  const profile = useAuthStore((state) => state.profile);
  const role = profile?.role ?? 'customer';
  const requests = useRequests(false);
  const services = useServiceTypes();
  const active = requests.data ?? [];
  const language = useI18n((state) => state.language);
  const c = useCopy(COPY);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.hero} edges={['top']}>
        <View style={styles.heroContent}>
          <View>
            <Text style={styles.eyebrow}>{roleLabel(role, language)}</Text>
            <Text style={styles.greeting}>
              {c.greeting} {profile?.display_name ?? c.you}
            </Text>
          </View>
          <View style={styles.shield}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.accent} />
          </View>
        </View>
        <Text style={styles.heroBody}>
          {role === 'customer' ? c.customerBody : role === 'provider' ? c.providerBody : c.staffBody}
        </Text>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {role === 'customer' ? (
          <AppButton title={c.request} onPress={() => router.push('/(tabs)/request')} />
        ) : (
          <AppButton title={c.operations} onPress={() => router.push('/(tabs)/operations')} />
        )}

        <Pressable
          style={styles.emergency}
          onPress={() => void Linking.openURL(emergencyCallUri(MEDICAL_EMERGENCY_NUMBER))}
        >
          <Ionicons name="medical" size={22} color={Colors.error} />
          <View style={styles.flex}>
            <Text style={styles.emergencyTitle}>{c.emergencyTitle}</Text>
            <Text style={styles.emergencyBody}>
              {c.emergencyBody} {MEDICAL_EMERGENCY_NUMBER}.
            </Text>
          </View>
          <Ionicons name="call" size={21} color={Colors.error} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{c.active}</Text>
          {active.length > 0 ? (
            <Pressable onPress={() => router.push('/(tabs)/activity')}>
              <Text style={styles.link}>{c.all}</Text>
            </Pressable>
          ) : null}
        </View>
        {requests.isLoading ? <Text style={styles.muted}>{c.loading}</Text> : null}
        {requests.isError ? <Text style={styles.error}>{c.loadActiveError}</Text> : null}
        {active.length === 0 && !requests.isLoading ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={30} color={Colors.success} />
            <Text style={styles.emptyText}>{c.noActive}</Text>
          </View>
        ) : (
          active
            .slice(0, 3)
            .map((request) => (
              <RequestSummaryCard
                key={request.id}
                request={request}
                onPress={() => router.push(`/rescue/${request.id}`)}
              />
            ))
        )}

        {role === 'customer' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{c.services}</Text>
              <Pressable onPress={() => router.push('/service')}>
                <Text style={styles.link}>{c.all}</Text>
              </Pressable>
            </View>
            {services.isError ? <Text style={styles.error}>{c.loadServicesError}</Text> : null}
            <View style={styles.services}>
              {(services.data ?? []).map((service) => (
                <Pressable
                  key={service.code}
                  style={styles.service}
                  onPress={() => router.push({ pathname: '/service/[code]', params: { code: service.code } })}
                >
                  <Ionicons
                    name={service.iconName as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={Colors.primary}
                  />
                  <Text style={styles.serviceLabel} numberOfLines={2}>
                    {service.label}
                  </Text>
                  <Text style={styles.serviceHint}>{c.serviceHint}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  hero: { backgroundColor: Colors.primaryDark, paddingBottom: Spacing.xl },
  heroContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { ...Typography.label, color: Colors.accent },
  greeting: { ...Typography.h1, color: Colors.white, marginTop: 3 },
  shield: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    ...Typography.body,
    color: Colors.skyBlue,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  content: { padding: Spacing.lg, paddingBottom: 110, gap: Spacing.md },
  emergency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.errorSoft,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  emergencyTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  emergencyBody: { ...Typography.caption, color: Colors.textSecondary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  sectionTitle: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.sm },
  link: { ...Typography.bodyBold, color: Colors.primary },
  muted: { ...Typography.body, color: Colors.textMuted },
  error: { ...Typography.body, color: Colors.error },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
  },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  service: {
    width: '48%',
    minHeight: 90,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  serviceLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  serviceHint: { ...Typography.caption, color: Colors.textMuted },
  flex: { flex: 1 },
});
