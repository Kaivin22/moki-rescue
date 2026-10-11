import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationEntry } from '@/src/features/communications/InboxScreens';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Fonts, Radius, Spacing, Typography } from '@/src/constants/spacing';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { RequestSummaryCard } from '@/src/features/rescue/components/RequestSummaryCard';
import { RatingBadge } from '@/src/features/rescue/components/RatingBadge';
import { rescueKeys, useRequests } from '@/src/features/rescue/hooks/useRescueQueries';
import { useAuthStore } from '@/src/stores/authStore';
import { RescueTiming } from '@/src/features/rescue/config/operational';
import { stopAvailabilityBackgroundTracking } from '@/src/features/rescue/services/availabilityBackgroundLocation';
import type { ProviderStatus } from '@/src/types/rescue';
import { isStaffRole } from '@/src/features/auth/roles';
import { useCopy, useI18n } from '@/src/i18n';
import { AppButton } from '@/src/components/atoms/AppButton';
import { canChangeAvailability } from '@/src/features/rescue/availabilityPolicy';

const COPY = {
  vi: {
    attentionQueue: 'Ca cần chú ý',
    auditLog: 'Nhật ký quản trị',
    teamReputation: 'Uy tín đội',
    qualityNotice: 'Cảnh báo chất lượng từ đơn vị điều phối',
    suspensionReview: 'Đội đã nhận nhiều cảnh báo; admin đang xem xét trạng thái hợp tác.',
    warningCount: 'cảnh báo',
    availabilityError: 'Không thể cập nhật trạng thái sẵn sàng.',
    offerError: 'Đề nghị không còn khả dụng. Hãy tải lại danh sách.',
    declineError: 'Không thể từ chối đề nghị. Hãy tải lại danh sách.',
    retryError: 'Không thể tìm lại đội cứu hộ.',
    title: 'Vận hành',
    requestError: 'Không tải được danh sách ca. Kéo xuống để thử lại.',
    available: 'Sẵn sàng nhận ca',
    loadingTeam: 'Đang tải đội cứu hộ…',
    providerError: 'Không tải được trạng thái cứu hộ viên.',
    notice:
      'Bật sẵn sàng nghĩa là bạn có thể xuất phát từ cửa hàng. OSRM tính tuyến đường và ETA từ cửa hàng, không theo dõi GPS của bạn. Nếu đang ở nơi khác, hãy tắt nhận ca. Sau khi nhận ca, mở Google Maps để dẫn đường từ vị trí thực tế.',
    offers: 'Đề nghị mới',
    offersError: 'Không tải được đề nghị mới.',
    minutes: 'phút',
    byRoad: 'km theo đường bộ',
    accepting: 'Đang nhận…',
    accept: 'Nhận ca',
    declining: 'Đang từ chối…',
    decline: 'Từ chối',
    noOffers: 'Chưa có đề nghị phù hợp.',
    active: 'Ca đang xử lý',
    staffSubtitle: 'Hàng đợi điều phối và mạng lưới đối tác đã xác minh.',
    manage: 'Mở menu quản lý',
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
    attentionQueue: 'Requests needing attention',
    auditLog: 'Administration audit log',
    teamReputation: 'Team reputation',
    qualityNotice: 'Quality warning from dispatch',
    suspensionReview: 'The team has multiple warnings; an admin is reviewing partner status.',
    warningCount: 'warnings',
    availabilityError: 'Could not update availability.',
    offerError: 'This offer is no longer available. Refresh the list.',
    declineError: 'Could not decline this offer. Refresh the list.',
    retryError: 'Could not find another rescue team.',
    title: 'Operations',
    requestError: 'Could not load requests. Pull down to try again.',
    available: 'Available for requests',
    loadingTeam: 'Loading rescue team…',
    providerError: 'Could not load provider status.',
    notice:
      'Availability means you can depart from your shop. OSRM calculates routes and ETA from the shop; your GPS is not tracked. Turn availability off when elsewhere. After accepting a case, open Google Maps for navigation from your actual location.',
    offers: 'New offers',
    offersError: 'Could not load new offers.',
    minutes: 'min',
    byRoad: 'km by road',
    accepting: 'Accepting…',
    accept: 'Accept request',
    declining: 'Declining…',
    decline: 'Decline',
    noOffers: 'No suitable offers.',
    active: 'Active request',
    staffSubtitle: 'Dispatch queue and verified partner network.',
    manage: 'Open management menu',
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

export function OperationsWorkspace() {
  const insets = useSafeAreaInsets();
  const role = useAuthStore((state) => state.profile?.role);
  const providerId = useAuthStore((state) => state.profile?.id);
  const isProvider = role === 'provider';
  const isStaff = role ? isStaffRole(role) : false;
  const requests = useRequests(false);
  const client = useQueryClient();
  const provider = useQuery({
    queryKey: rescueKeys.providerStatus,
    queryFn: rescueApi.providerStatus,
    enabled: isProvider,
  });
  const personalStatistics = useQuery({
    queryKey: ['rescue', 'provider-statistics', providerId],
    queryFn: rescueApi.providerStatistics,
    enabled: isProvider,
  });
  const offers = useQuery({
    queryKey: rescueKeys.offers,
    queryFn: rescueApi.offers,
    enabled: isProvider && provider.isSuccess && provider.data.available,
    refetchInterval: provider.data?.available ? RescueTiming.providerOffersRefetchMs : false,
  });
  const teams = useQuery({ queryKey: rescueKeys.teams, queryFn: rescueApi.teams, enabled: isStaff });
  const availability = useMutation({
    mutationFn: rescueApi.setAvailability,
    onSuccess: (data) => client.setQueryData(rescueKeys.providerStatus, data),
  });
  const accept = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => rescueApi.acceptOffer(id, version),
    onSuccess: ({ requestId }) => {
      // Stop availability immediately, including when the status refresh is offline.
      client.setQueryData<ProviderStatus>(rescueKeys.providerStatus, (previous) =>
        previous ? { ...previous, available: false } : previous,
      );
      void stopAvailabilityBackgroundTracking().catch(() => undefined);
      void client.invalidateQueries({ queryKey: rescueKeys.all });
      router.push(`/rescue/${requestId}`);
    },
  });
  const decline = useMutation({
    mutationFn: rescueApi.declineOffer,
    onSuccess: () => void offers.refetch(),
  });
  const retry = useMutation({
    mutationFn: rescueApi.retryDispatch,
    onSuccess: () => void client.invalidateQueries({ queryKey: rescueKeys.requests(false) }),
  });
  const reassign = useMutation({
    mutationFn: rescueApi.reassignDispatch,
    onSuccess: () => void client.invalidateQueries({ queryKey: rescueKeys.requests(false) }),
  });
  useEffect(() => {
    void stopAvailabilityBackgroundTracking().catch(() => undefined);
  }, []);
  const [message, setMessage] = useState<string | null>(null);
  const c = useCopy(COPY);
  const english = useI18n((state) => state.language === 'en');
  const changing = useRef(false);
  const canToggle = canChangeAvailability({
    loaded: provider.isSuccess,
    failed: provider.isError,
    busy: availability.isPending,
    provider: provider.data,
    hasActiveRequest: Boolean(requests.data?.length),
  });
  const loadError =
    provider.error ?? requests.error ?? teams.error ?? (provider.data?.available ? offers.error : null);

  const report = (error: unknown, fallback: string) => {
    setMessage(error instanceof ApiClientError ? error.message : fallback);
  };

  const setProviderAvailability = async (value: boolean) => {
    if (!canToggle || changing.current) return;
    changing.current = true;
    setMessage(null);
    try {
      await availability.mutateAsync({ available: value });
    } catch (error) {
      report(error, c.availabilityError);
    } finally {
      changing.current = false;
    }
  };

  const declineOffer = async (id: string) => {
    setMessage(null);
    try {
      await decline.mutateAsync(id);
    } catch (error) {
      report(error, c.declineError);
      void offers.refetch();
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
      void personalStatistics.refetch();
      if (provider.data?.available) void offers.refetch();
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
        <NotificationEntry />
        <Text style={styles.title}>
          {isProvider
            ? english
              ? 'My rescue shift'
              : 'Trạm nhận ca của tôi'
            : english
              ? 'Dispatch queue'
              : 'Hàng đợi điều phối'}
        </Text>
        {isProvider ? (
          <Text style={styles.subtitle}>
            {english
              ? 'Go available, review offers and handle your assigned cases.'
              : 'Bật sẵn sàng, nhận đề nghị và xử lý các ca được giao cho bạn.'}
          </Text>
        ) : null}
        {message ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {message}
          </Text>
        ) : null}
        {loadError ? (
          <View>
            <Text accessibilityRole="alert" style={styles.error}>
              {loadError instanceof ApiClientError ? loadError.message : c.requestError}
            </Text>
            <AppButton
              title={english ? 'Retry connection' : 'Thử kết nối lại'}
              variant="outline"
              onPress={refresh}
            />
          </View>
        ) : null}
        {isProvider ? (
          <>
            <View style={styles.offer}>
              <Text style={styles.cardTitle}>{english ? 'My statistics' : 'Thống kê của tôi'}</Text>
              <Text style={styles.muted}>
                {english
                  ? 'All-time cases assigned to your account, not the shop total or colleagues’ cases.'
                  : 'Các ca được giao cho tài khoản của bạn từ trước đến nay, không phải tổng của cửa hàng hoặc của đồng nghiệp.'}
              </Text>
              {personalStatistics.isPending ? (
                <Text style={styles.muted}>{english ? 'Loading statistics…' : 'Đang tải thống kê…'}</Text>
              ) : null}
              {personalStatistics.isError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {english
                    ? 'Could not load personal statistics. Pull down to retry.'
                    : 'Không tải được thống kê cá nhân. Kéo xuống để thử lại.'}
                </Text>
              ) : null}
              {personalStatistics.data ? (
                <>
                  <Text style={styles.muted}>
                    {english ? 'Completed' : 'Đã hoàn thành'}: {personalStatistics.data.completedCases}
                  </Text>
                  <Text style={styles.muted}>
                    {english ? 'In progress' : 'Đang xử lý'}: {personalStatistics.data.activeCases}
                  </Text>
                  <Text style={styles.muted}>
                    {english ? 'Cancelled while assigned' : 'Đã hủy khi được giao'}:{' '}
                    {personalStatistics.data.cancelledCases}
                  </Text>
                  <RatingBadge
                    rating={personalStatistics.data.rating}
                    label={english ? 'My ratings' : 'Đánh giá của tôi'}
                    compact
                  />
                </>
              ) : null}
            </View>
            <View style={styles.availabilityCard}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{c.available}</Text>
                <Text style={styles.muted}>
                  {provider.data?.teamName ??
                    (provider.isError
                      ? english
                        ? 'Provider status unavailable'
                        : 'Chưa kết nối được trạng thái cứu hộ viên'
                      : c.loadingTeam)}
                </Text>
                {provider.data ? (
                  <RatingBadge rating={provider.data.teamRating} label={c.teamReputation} compact />
                ) : null}
              </View>
              <Switch
                accessibilityLabel={c.available}
                value={provider.data?.available ?? false}
                disabled={!canToggle}
                onValueChange={(value) => void setProviderAvailability(value)}
                trackColor={{ false: Colors.borderStrong, true: Colors.success }}
                thumbColor={Colors.white}
              />
            </View>
            {provider.data &&
            (!provider.data.shopInServiceArea || provider.data.teamStatus !== 'verified') ? (
              <Text style={styles.notice}>
                {english
                  ? 'Your shop must be verified and have coordinates inside the service area. Contact an administrator.'
                  : 'Cửa hàng cần được xác minh và có tọa độ trong vùng phục vụ. Liên hệ admin để cập nhật.'}
              </Text>
            ) : null}
            {provider.data ? (
              <Text style={styles.notice}>
                {english ? 'Shop address' : 'Địa chỉ cửa hàng'}:{' '}
                {provider.data.shopAddress ||
                  (english
                    ? 'Not entered yet. Ask an administrator to update it.'
                    : 'Chưa nhập địa chỉ. Liên hệ admin để cập nhật.')}
              </Text>
            ) : null}
            {!provider.data?.available && requests.data?.length ? (
              <Text style={styles.notice}>
                {english
                  ? 'Finish your current case before receiving another.'
                  : 'Hoàn thành ca đang xử lý trước khi bật nhận ca mới.'}
              </Text>
            ) : null}
            {provider.data && provider.data.status !== 'active' ? (
              <Text style={styles.notice}>
                {english
                  ? 'Your provider membership is inactive. Contact an administrator.'
                  : 'Tư cách cứu hộ viên chưa hoạt động. Liên hệ quản trị viên để kiểm tra.'}
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
            <Text style={styles.notice}>{c.notice}</Text>
            {provider.data?.available ? (
              <Text style={styles.notice}>
                {english ? 'Ready to depart from the shop.' : 'Đang sẵn sàng xuất phát từ cửa hàng.'}
              </Text>
            ) : (
              <Text style={styles.notice}>
                {!provider.isSuccess
                  ? english
                    ? 'Connect to the server to confirm your availability.'
                    : 'Cần kết nối máy chủ để xác định trạng thái nhận ca.'
                  : english
                    ? 'You are unavailable. Enable the switch when ready to depart from the shop.'
                    : 'Bạn chưa sẵn sàng nhận ca. Bật công tắc khi có thể xuất phát từ cửa hàng.'}
              </Text>
            )}
            <Text style={styles.section}>{c.offers}</Text>
            {(provider.data?.available ? (offers.data ?? []) : []).map((offer) => (
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
                <View style={styles.offerActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={accept.isPending ? c.accepting : c.accept}
                    accessibilityState={{ disabled: accept.isPending || decline.isPending }}
                    disabled={accept.isPending || decline.isPending}
                    style={[styles.acceptButton, (accept.isPending || decline.isPending) && styles.disabled]}
                    onPress={() => void acceptOffer(offer.id, offer.requestVersion)}
                  >
                    <Text style={styles.acceptText}>{accept.isPending ? c.accepting : c.accept}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={decline.isPending ? c.declining : c.decline}
                    accessibilityState={{ disabled: accept.isPending || decline.isPending }}
                    disabled={accept.isPending || decline.isPending}
                    style={[styles.declineButton, (accept.isPending || decline.isPending) && styles.disabled]}
                    onPress={() => void declineOffer(offer.id)}
                  >
                    <Text style={styles.declineText}>{decline.isPending ? c.declining : c.decline}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {provider.data?.available && offers.isSuccess && offers.data.length === 0 ? (
              <Text style={styles.muted}>{c.noOffers}</Text>
            ) : null}
            <Text style={styles.section}>{c.active}</Text>
            {requests.isSuccess && requests.data.length === 0 ? (
              <Text style={styles.muted}>
                {english ? 'No case is currently assigned to you.' : 'Hiện chưa có ca nào được giao cho bạn.'}
              </Text>
            ) : null}
          </>
        ) : null}

        {isStaff ? (
          <>
            <Text style={styles.subtitle}>{c.staffSubtitle}</Text>
            <Pressable
              style={styles.manageButton}
              onPress={() => router.push('/operator/attention')}
              accessibilityRole="button"
              accessibilityLabel={c.attentionQueue}
            >
              <Ionicons name="warning-outline" size={19} color={Colors.primary} />
              <Text style={styles.manageText}>{c.attentionQueue}</Text>
            </Pressable>
            {role === 'admin' ? (
              <>
                <Pressable
                  style={styles.manageButton}
                  onPress={() => router.push('/operator')}
                  accessibilityRole="button"
                  accessibilityLabel={c.manage}
                >
                  <Ionicons name="settings-outline" size={19} color={Colors.primary} />
                  <Text style={styles.manageText}>{c.manage}</Text>
                </Pressable>
                <Pressable
                  style={styles.manageButton}
                  onPress={() => router.push('/operator/audit')}
                  accessibilityRole="button"
                  accessibilityLabel={c.auditLog}
                >
                  <Ionicons name="document-text-outline" size={19} color={Colors.primary} />
                  <Text style={styles.manageText}>{c.auditLog}</Text>
                </Pressable>
              </>
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
                accessibilityLabel={retry.isPending ? c.retrying : c.retry}
                accessibilityState={{ disabled: retry.isPending }}
                disabled={retry.isPending}
                style={[styles.retryButton, retry.isPending && styles.disabled]}
                onPress={() => void retryDispatch(request.id)}
              >
                <Ionicons name="refresh" size={17} color={Colors.primary} />
                <Text style={styles.retryText}>{retry.isPending ? c.retrying : c.retry}</Text>
              </Pressable>
            ) : null}
            {isStaff && request.status === 'needs_dispatch' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={reassign.isPending ? c.retrying : c.retry}
                accessibilityState={{ disabled: reassign.isPending }}
                disabled={reassign.isPending}
                style={[styles.retryButton, reassign.isPending && styles.disabled]}
                onPress={() =>
                  void reassign.mutateAsync(request.id).catch((error) => report(error, c.retryError))
                }
              >
                <Ionicons name="git-compare-outline" size={17} color={Colors.primary} />
                <Text style={styles.retryText}>{reassign.isPending ? c.retrying : c.retry}</Text>
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
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
  },
  acceptText: { ...Typography.bodyBold, color: Colors.textOnAccent },
  offerActions: { flexDirection: 'row', gap: Spacing.sm },
  declineButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  declineText: { ...Typography.bodyBold, color: Colors.textSecondary },
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
  },
  retryText: { ...Typography.caption, color: Colors.primary, fontFamily: Fonts.bodySemi },
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
