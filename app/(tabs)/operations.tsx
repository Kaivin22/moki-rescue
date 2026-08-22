import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { RequestSummaryCard } from '@/src/features/rescue/components/RequestSummaryCard';
import { RatingBadge } from '@/src/features/rescue/components/RatingBadge';
import { rescueKeys, useRequests } from '@/src/features/rescue/hooks/useRescueQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { useAvailableProviderLocation } from '@/src/features/rescue/hooks/useAvailableProviderLocation';
import { RescueTiming } from '@/src/features/rescue/config/operational';
import { isStaffRole } from '@/src/features/auth/roles';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    teamReputation: 'Uy tín đội',
    qualityNotice: 'Cảnh báo chất lượng từ đơn vị điều phối',
    suspensionReview: 'Đội đã nhận nhiều cảnh báo; admin đang xem xét trạng thái hợp tác.',
    warningCount: 'cảnh báo',
    availabilityError: 'Không thể cập nhật trạng thái sẵn sàng.',
    offerError: 'Đề nghị không còn khả dụng. Hãy tải lại danh sách.',
    retryError: 'Không thể tìm lại đội cứu hộ.',
    title: 'Vận hành',
    requestError: 'Không tải được danh sách ca. Kéo xuống để thử lại.',
    available: 'Sẵn sàng nhận ca',
    loadingTeam: 'Đang tải đội cứu hộ…',
    providerError: 'Không tải được trạng thái cứu hộ viên.',
    notice:
      'Khi bật sẵn sàng, chỉ vị trí còn mới mới được dùng để ghép ca. Trước khi nhận ca, khách không thấy tọa độ của bạn. GPS hiện tại:',
    gpsTracking: 'đang cập nhật',
    gpsDenied: 'chưa được cấp quyền',
    gpsError: 'mất kết nối',
    gpsStarting: 'đang khởi tạo',
    offers: 'Đề nghị mới',
    offersError: 'Không tải được đề nghị mới.',
    minutes: 'phút',
    byRoad: 'km theo đường bộ',
    accepting: 'Đang nhận…',
    accept: 'Nhận ca',
    noOffers: 'Chưa có đề nghị phù hợp.',
    active: 'Ca đang xử lý',
    staffSubtitle: 'Hàng đợi điều phối và mạng lưới đối tác đã xác minh.',
    manage: 'Quản lý đội và phân quyền',
    teams: 'Tình trạng đội',
    teamsError: 'Không tải được tình trạng đội đối tác.',
    providers: 'cứu hộ viên',
    open: 'Ca đang mở',
    retrying: 'Đang tìm…',
    retry: 'Tìm lại đội',
    verified: 'Đã xác minh',
    pending: 'Chờ xác minh',
    suspended: 'Đình chỉ',
  },
  en: {
    teamReputation: 'Team reputation',
    qualityNotice: 'Quality warning from dispatch',
    suspensionReview: 'The team has multiple warnings; an admin is reviewing partner status.',
    warningCount: 'warnings',
    availabilityError: 'Could not update availability.',
    offerError: 'This offer is no longer available. Refresh the list.',
    retryError: 'Could not find another rescue team.',
    title: 'Operations',
    requestError: 'Could not load requests. Pull down to try again.',
    available: 'Available for requests',
    loadingTeam: 'Loading rescue team…',
    providerError: 'Could not load provider status.',
    notice:
      'When availability is on, only a recent location is used for matching. Customers cannot see your coordinates before you accept a request. Current GPS:',
    gpsTracking: 'updating',
    gpsDenied: 'permission not granted',
    gpsError: 'connection lost',
    gpsStarting: 'starting',
    offers: 'New offers',
    offersError: 'Could not load new offers.',
    minutes: 'min',
    byRoad: 'km by road',
    accepting: 'Accepting…',
    accept: 'Accept request',
    noOffers: 'No suitable offers.',
    active: 'Active request',
    staffSubtitle: 'Dispatch queue and verified partner network.',
    manage: 'Manage teams and access',
    teams: 'Team status',
    teamsError: 'Could not load partner team status.',
    providers: 'providers',
    open: 'Open requests',
    retrying: 'Searching…',
    retry: 'Find another team',
    verified: 'Verified',
    pending: 'Pending verification',
    suspended: 'Suspended',
  },
} as const;

export default function OperationsScreen() {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((state) => state.profile?.role);
  const isProvider = role === 'provider';
  const isStaff = role ? isStaffRole(role) : false;
  const requests = useRequests(false);
  const client = useQueryClient();
  const provider = useQuery({
    queryKey: rescueKeys.providerStatus,
    queryFn: rescueApi.providerStatus,
    enabled: isProvider,
  });
  const offers = useQuery({
    queryKey: rescueKeys.offers,
    queryFn: rescueApi.offers,
    enabled: isProvider,
    refetchInterval: RescueTiming.providerOffersRefetchMs,
  });
  const teams = useQuery({ queryKey: rescueKeys.teams, queryFn: rescueApi.teams, enabled: isStaff });
  const availability = useMutation({
    mutationFn: rescueApi.setAvailability,
    onSuccess: (data) => client.setQueryData(rescueKeys.providerStatus, data),
  });
  const accept = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => rescueApi.acceptOffer(id, version),
    onSuccess: ({ requestId }) => {
      void client.invalidateQueries({ queryKey: rescueKeys.all });
      router.push(`/rescue/${requestId}`);
    },
  });
  const retry = useMutation({
    mutationFn: rescueApi.retryDispatch,
    onSuccess: () => void client.invalidateQueries({ queryKey: rescueKeys.requests(false) }),
  });
  const availabilityLocation = useAvailableProviderLocation(Boolean(isProvider && provider.data?.available));
  const [message, setMessage] = useState<string | null>(null);
  const c = useCopy(COPY);

  const report = (error: unknown, fallback: string) => {
    setMessage(error instanceof ApiClientError ? error.message : fallback);
  };

  const setProviderAvailability = async (value: boolean) => {
    setMessage(null);
    try {
      await availability.mutateAsync(value);
    } catch (error) {
      report(error, c.availabilityError);
    }
  };

  const acceptOffer = async (id: string, version: number) => {
    setMessage(null);
    try {
      await accept.mutateAsync({ id, version });
    } catch (error) {
      report(error, c.offerError);
      void offers.refetch();
    }
  };

  const retryDispatch = async (requestId: string) => {
    setMessage(null);
    try {
      await retry.mutateAsync(requestId);
    } catch (error) {
      report(error, c.retryError);
    }
  };

  const refresh = () => {
    void requests.refetch();
    if (isProvider) {
      void provider.refetch();
      void offers.refetch();
    }
    if (isStaff) void teams.refetch();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 90 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={
              requests.isRefetching || provider.isRefetching || offers.isRefetching || teams.isRefetching
            }
            onRefresh={refresh}
          />
        }
      >
        <Text style={styles.title}>{c.title}</Text>
        {message ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        ) : null}
        {requests.isError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {c.requestError}
          </Text>
        ) : null}
        {isProvider ? (
          <>
            <View style={styles.availabilityCard}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{c.available}</Text>
                <Text style={styles.muted}>{provider.data?.teamName ?? c.loadingTeam}</Text>
                {provider.data ? (
                  <RatingBadge rating={provider.data.teamRating} label={c.teamReputation} compact />
                ) : null}
              </View>
              <Switch
                value={provider.data?.available ?? false}
                disabled={provider.isLoading || availability.isPending}
                onValueChange={(value) => void setProviderAvailability(value)}
                trackColor={{ false: Colors.mist, true: Colors.success }}
              />
            </View>
            {provider.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {c.providerError}
              </Text>
            ) : null}
            {provider.data?.qualityNotice ? (
              <View style={styles.qualityNotice}>
                <Ionicons name="warning-outline" size={20} color={Colors.warning} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{c.qualityNotice}</Text>
                  <Text style={styles.muted}>{provider.data.qualityNotice}</Text>
                  <Text style={styles.warning}>
                    {provider.data.qualityWarningCount} {c.warningCount}
                  </Text>
                  {provider.data.suspensionReviewRecommended ? (
                    <Text style={styles.dangerText}>{c.suspensionReview}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            <Text style={styles.notice}>
              {c.notice}{' '}
              {availabilityLocation === 'tracking'
                ? c.gpsTracking
                : availabilityLocation === 'denied'
                  ? c.gpsDenied
                  : availabilityLocation === 'error'
                    ? c.gpsError
                    : c.gpsStarting}
              .
            </Text>
            <Text style={styles.section}>{c.offers}</Text>
            {offers.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {c.offersError}
              </Text>
            ) : null}
            {(offers.data ?? []).map((offer) => (
              <View key={offer.id} style={styles.offer}>
                <View style={styles.offerTop}>
                  <Text style={styles.cardTitle}>{offer.serviceLabel}</Text>
                  <Text style={styles.eta}>
                    {Math.max(1, Math.ceil(offer.etaSeconds / 60))} {c.minutes}
                  </Text>
                </View>
                <Text style={styles.muted}>{offer.pickupAreaLabel}</Text>
                <Text style={styles.distance}>
                  {(offer.roadDistanceM / 1000).toFixed(1)} {c.byRoad}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: accept.isPending }}
                  disabled={accept.isPending}
                  style={[styles.acceptButton, accept.isPending && styles.disabled]}
                  onPress={() => void acceptOffer(offer.id, offer.requestVersion)}
                >
                  <Text style={styles.acceptText}>{accept.isPending ? c.accepting : c.accept}</Text>
                </Pressable>
              </View>
            ))}
            {!offers.isLoading && offers.data?.length === 0 ? (
              <Text style={styles.muted}>{c.noOffers}</Text>
            ) : null}
            <Text style={styles.section}>{c.active}</Text>
          </>
        ) : null}

        {isStaff ? (
          <>
            <Text style={styles.subtitle}>{c.staffSubtitle}</Text>
            {role === 'admin' ? (
              <Pressable style={styles.manageButton} onPress={() => router.push('/operator/teams')}>
                <Ionicons name="settings-outline" size={19} color={Colors.primary} />
                <Text style={styles.manageText}>{c.manage}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.section}>{c.teams}</Text>
            {teams.isError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {c.teamsError}
              </Text>
            ) : null}
            <View style={styles.teamGrid}>
              {(teams.data ?? []).map((team) => (
                <View key={team.id} style={styles.teamCard}>
                  <Ionicons name="people" size={22} color={Colors.primary} />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {team.name}
                  </Text>
                  <Text style={styles.muted}>
                    {team.activeProviders} {c.providers}
                  </Text>
                  <RatingBadge rating={team.rating} label={c.teamReputation} compact />
                  {team.qualityWarningCount > 0 ? (
                    <Text style={team.suspensionReviewRecommended ? styles.dangerText : styles.warning}>
                      {team.qualityWarningCount} {c.warningCount}
                    </Text>
                  ) : null}
                  <Text
                    style={[styles.teamStatus, team.status === 'verified' ? styles.verified : styles.warning]}
                  >
                    {c[team.status]}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.section}>{c.open}</Text>
          </>
        ) : null}

        {(requests.data ?? []).map((request) => (
          <View key={request.id} style={styles.requestWrap}>
            <RequestSummaryCard request={request} onPress={() => router.push(`/rescue/${request.id}`)} />
            {isStaff && request.status === 'no_provider' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: retry.isPending }}
                disabled={retry.isPending}
                style={[styles.retryButton, retry.isPending && styles.disabled]}
                onPress={() => void retryDispatch(request.id)}
              >
                <Ionicons name="refresh" size={17} color={Colors.primary} />
                <Text style={styles.retryText}>{retry.isPending ? c.retrying : c.retry}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  section: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.sm },
  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  muted: { ...Typography.caption, color: Colors.textSecondary },
  error: {
    ...Typography.body,
    color: Colors.error,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorSoft,
  },
  notice: {
    ...Typography.caption,
    color: Colors.textSecondary,
    padding: Spacing.md,
    backgroundColor: Colors.sky,
    borderRadius: Radius.md,
  },
  offer: {
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accentDark,
  },
  offerTop: { flexDirection: 'row', justifyContent: 'space-between' },
  eta: { ...Typography.bodyBold, color: Colors.success },
  distance: { ...Typography.caption, color: Colors.primary },
  acceptButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
  },
  acceptText: { ...Typography.bodyBold, color: Colors.textOnAccent },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  teamCard: {
    width: '48%',
    padding: Spacing.md,
    gap: 4,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
  },
  teamStatus: { ...Typography.caption, textTransform: 'capitalize' },
  verified: { color: Colors.success },
  warning: { color: Colors.warning },
  dangerText: { ...Typography.caption, color: Colors.error },
  qualityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningSoft,
  },
  requestWrap: { gap: Spacing.xs },
  retryButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: Spacing.sm,
  },
  retryText: { ...Typography.caption, color: Colors.primary, fontFamily: 'BeVietnamPro_600SemiBold' },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  manageText: { ...Typography.bodyBold, color: Colors.primary },
  flex: { flex: 1 },
  disabled: { opacity: 0.5 },
});
