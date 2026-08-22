import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from '@/src/components/MapWrapper';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { RatingBadge } from '@/src/features/rescue/components/RatingBadge';
import { useProviderTracking } from '@/src/features/rescue/hooks/useProviderTracking';
import {
  rescueKeys,
  useRequest,
  useRequestMutation,
  useRoadRoute,
} from '@/src/features/rescue/hooks/useRescueQueries';
import { subscribeToProviderLocation } from '@/src/features/rescue/services/liveLocation';
import { canCustomerCancel, isLiveStatus, statusLabel, statusColor } from '@/src/features/rescue/status';
import { useAuthStore } from '@/src/stores/authStore';
import type { LocationPoint, RequestDetails } from '@/src/types/rescue';
import { useCopy, useI18n } from '@/src/i18n';

const SUPPORT_HOTLINE = String(Constants.expoConfig?.extra?.supportHotline ?? '').replace(/[^+\d]/g, '');
const COPY = {
  vi: {
    retryError: 'Không thể tìm lại đội cứu hộ.',
    loadError: 'Không thể tải yêu cầu này.',
    back: 'Quay lại',
    pickupMarker: 'Vị trí cứu hộ',
    provider: 'Cứu hộ viên',
    contact: 'Liên hệ',
    roadRoute: 'Tuyến đường xe máy',
    noRoute: 'Chưa có tuyến đường',
    landmark: 'Điểm nhận biết',
    team: 'Đội đã xác minh',
    vehicle: 'Phương tiện nhận diện',
    initialEta: 'ETA ban đầu',
    aboutMinutes: 'Khoảng {value} phút',
    road: 'Đường bộ',
    fullscreen: 'Mở bản đồ toàn màn hình',
    routingWarning:
      'Dịch vụ định tuyến không trả đường hợp lệ. Ứng dụng không thay bằng đường chim bay; điều phối viên cần tìm lại khi tuyến đường hoạt động.',
    noProviderTitle: 'Hiện chưa có đội nhận ca',
    noProviderBody:
      'Hệ thống đã dừng tìm, không hiển thị chờ vô thời hạn. Liên hệ điều phối nếu bạn cần phương án khác.',
    callDispatch: 'Gọi điều phối',
    dispatcher: 'Điều phối viên',
    retry: 'Tìm lại đội phù hợp',
    progress: 'Tiến trình',
    callProvider: 'Gọi cứu hộ viên theo số',
    contactLabel: 'Số liên hệ trong ca',
    contactPrivacy: 'Số công việc đã được đơn vị vận hành xác minh',
    call: 'Gọi',
    tracking: {
      idle: 'Theo dõi vị trí chưa hoạt động.',
      requesting: 'Đang xin quyền vị trí…',
      tracking: 'Đang chia sẻ vị trí cho khách của ca này.',
      denied: 'Không có quyền vị trí; bạn không thể xử lý ca an toàn.',
      error: 'Mất kết nối vị trí. Hệ thống sẽ thử lại khi GPS cập nhật.',
    },
    expoTracking: 'Expo Go chỉ theo dõi khi màn hình này đang mở.',
    quote: 'Báo giá',
    transport: 'Vận chuyển xe',
    repair: 'Sửa chữa',
    quotePending: 'Chờ duyệt',
    quoteApproved: 'Đã duyệt',
    quoteRejected: 'Đã từ chối',
    quoteSuperseded: 'Đã thay thế',
    actionError: 'Không thể thực hiện thao tác.',
    cancelTitle: 'Hủy yêu cầu?',
    cancelBody: 'Chỉ hủy nếu cứu hộ viên chưa có mặt. Thao tác được ghi vào lịch sử.',
    no: 'Không',
    cancel: 'Hủy yêu cầu',
    customerCancelReason: 'Khách chủ động hủy trước khi cứu hộ đến',
    confirmArrival: 'Xác nhận cứu hộ viên đã đến',
    rejectArrival: 'Chưa thấy cứu hộ viên',
    approveQuote: 'Đồng ý báo giá',
    rejectQuote: 'Từ chối báo giá',
    confirmCompletion: 'Xác nhận đã hoàn tất',
    incomplete: 'Công việc chưa hoàn tất',
    stateError: 'Không thể cập nhật trạng thái.',
    quoteInvalid: 'Nhập nội dung và số tiền báo giá hợp lệ.',
    quoteError: 'Không thể gửi báo giá.',
    startTrip: 'Bắt đầu di chuyển',
    requestArrival: 'Yêu cầu khách xác nhận đã đến',
    startDiagnosis: 'Bắt đầu kiểm tra xe',
    createQuote: 'Tạo báo giá',
    workDescription: 'Nội dung công việc',
    amount: 'Số tiền (VND)',
    repairBike: 'Sửa xe',
    transportBike: 'Chở xe',
    sendQuote: 'Gửi báo giá cho khách',
    startRepair: 'Bắt đầu sửa tại chỗ',
    switchTransport: 'Chuyển sang chở xe',
    requestCompletion: 'Yêu cầu khách xác nhận hoàn tất',
    reasonRequired: 'Hãy nhập lý do cụ thể để lưu vào audit.',
    cancelError: 'Không thể hủy ca.',
    cannotContinue: 'báo không thể tiếp tục',
    auditCancel: 'Dừng ca có audit',
    auditBody:
      'Chỉ dùng khi có sự cố an toàn hoặc không thể tiếp tục. Hệ thống sẽ thông báo cho bên còn lại.',
    reason: 'Lý do',
    confirmCancel: 'Xác nhận dừng ca',
    keep: 'Giữ ca',
    saveReviewError: 'Không thể lưu đánh giá',
    retryGeneric: 'Vui lòng thử lại.',
    deleteReviewTitle: 'Xóa đánh giá?',
    deleteReviewBody: 'Bạn có thể tạo đánh giá mới sau đó.',
    delete: 'Xóa',
    deleteReviewError: 'Không thể xóa đánh giá',
    editReview: 'Chỉnh sửa đánh giá',
    review: 'Đánh giá ca cứu hộ',
    reviewPlaceholder: 'Nhận xét về thái độ và chất lượng xử lý',
    saveReview: 'Lưu đánh giá',
    deleteReview: 'Xóa đánh giá',
  },
  en: {
    retryError: 'Could not find another rescue team.',
    loadError: 'Could not load this request.',
    back: 'Go back',
    pickupMarker: 'Rescue location',
    provider: 'Rescue provider',
    contact: 'Contact',
    roadRoute: 'Motorcycle road route',
    noRoute: 'Route unavailable',
    landmark: 'Landmark',
    team: 'Verified team',
    vehicle: 'Identification vehicle',
    initialEta: 'Initial ETA',
    aboutMinutes: 'About {value} min',
    road: 'Road distance',
    fullscreen: 'Open full-screen map',
    routingWarning:
      'The routing service did not return a valid route. The app never substitutes a straight line; dispatch staff should retry when routing is available.',
    noProviderTitle: 'No team has accepted yet',
    noProviderBody:
      'The search has stopped instead of waiting forever. Contact dispatch if you need another option.',
    callDispatch: 'Call dispatch',
    dispatcher: 'Dispatcher',
    retry: 'Find another suitable team',
    progress: 'Progress',
    callProvider: 'Call rescue provider at',
    contactLabel: 'Contact number for this request',
    contactPrivacy: 'Work number verified by the operator',
    call: 'Call',
    tracking: {
      idle: 'Location tracking is not active.',
      requesting: 'Requesting location permission…',
      tracking: "Sharing location with this request's customer.",
      denied: 'Location permission is missing; you cannot handle the request safely.',
      error: 'Location connection lost. The system will retry after the next GPS update.',
    },
    expoTracking: 'Expo Go only tracks while this screen is open.',
    quote: 'Quote',
    transport: 'Motorcycle transport',
    repair: 'Repair',
    quotePending: 'Pending',
    quoteApproved: 'Approved',
    quoteRejected: 'Rejected',
    quoteSuperseded: 'Superseded',
    actionError: 'Could not complete the action.',
    cancelTitle: 'Cancel request?',
    cancelBody: 'Cancel only if the provider is not present. This action is recorded in history.',
    no: 'No',
    cancel: 'Cancel request',
    customerCancelReason: 'Customer cancelled before provider arrival',
    confirmArrival: 'Confirm provider arrival',
    rejectArrival: 'Provider not here',
    approveQuote: 'Approve quote',
    rejectQuote: 'Reject quote',
    confirmCompletion: 'Confirm completion',
    incomplete: 'Work is not complete',
    stateError: 'Could not update request status.',
    quoteInvalid: 'Enter a valid work description and quote amount.',
    quoteError: 'Could not send the quote.',
    startTrip: 'Start trip',
    requestArrival: 'Ask customer to confirm arrival',
    startDiagnosis: 'Start motorcycle inspection',
    createQuote: 'Create quote',
    workDescription: 'Work description',
    amount: 'Amount (VND)',
    repairBike: 'Repair',
    transportBike: 'Transport',
    sendQuote: 'Send quote to customer',
    startRepair: 'Start on-site repair',
    switchTransport: 'Switch to transport',
    requestCompletion: 'Ask customer to confirm completion',
    reasonRequired: 'Enter a specific reason for the audit record.',
    cancelError: 'Could not cancel the request.',
    cannotContinue: 'cannot continue',
    auditCancel: 'Audited request stop',
    auditBody:
      'Use only for a safety issue or when work cannot continue. The other participant will be notified.',
    reason: 'Reason',
    confirmCancel: 'Confirm request stop',
    keep: 'Keep request',
    saveReviewError: 'Could not save review',
    retryGeneric: 'Please try again.',
    deleteReviewTitle: 'Delete review?',
    deleteReviewBody: 'You can create another review later.',
    delete: 'Delete',
    deleteReviewError: 'Could not delete review',
    editReview: 'Edit review',
    review: 'Review rescue request',
    reviewPlaceholder: 'Comment on attitude and service quality',
    saveReview: 'Save review',
    deleteReview: 'Delete review',
  },
} as const;

function template(value: string, params: Record<string, string | number>) {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export default function RescueDetailsScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const requestQuery = useRequest(id);
  const [liveLocation, setLiveLocation] = useState<LocationPoint | null>(null);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const [retryingDispatch, setRetryingDispatch] = useState(false);
  const c = useCopy(COPY);
  const language = useI18n((state) => state.language);
  const request = requestQuery.data;
  const role = profile?.role ?? 'customer';
  const isAssignedProvider = role === 'provider' && request?.assignedProviderId === profile?.id;
  const tracking = useProviderTracking(
    id,
    Boolean(isAssignedProvider && request && isLiveStatus(request.status)),
  );
  const providerLocation = liveLocation ?? request?.providerLocation ?? null;
  const route = useRoadRoute(
    id,
    Boolean(request?.assignedProviderId && providerLocation && request && isLiveStatus(request.status)),
  );

  const retryDispatch = async () => {
    setScreenMessage(null);
    setRetryingDispatch(true);
    try {
      await rescueApi.retryDispatch(id);
      await requestQuery.refetch();
    } catch (error) {
      setScreenMessage(error instanceof ApiClientError ? error.message : c.retryError);
    } finally {
      setRetryingDispatch(false);
    }
  };

  useEffect(() => setLiveLocation(request?.providerLocation ?? null), [request?.providerLocation]);
  useEffect(() => {
    if (!request?.assignedProviderId) return;
    return subscribeToProviderLocation(id, setLiveLocation);
  }, [id, request?.assignedProviderId]);

  const region = useMemo(() => {
    if (!request) return undefined;
    const other = providerLocation;
    return {
      latitude: other ? (request.pickupLatitude + other.latitude) / 2 : request.pickupLatitude,
      longitude: other ? (request.pickupLongitude + other.longitude) / 2 : request.pickupLongitude,
      latitudeDelta: other ? Math.max(0.015, Math.abs(request.pickupLatitude - other.latitude) * 1.7) : 0.02,
      longitudeDelta: other
        ? Math.max(0.015, Math.abs(request.pickupLongitude - other.longitude) * 1.7)
        : 0.02,
    };
  }, [providerLocation, request]);

  if (requestQuery.isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  if (requestQuery.isError || !request) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{c.loadError}</Text>
        <AppButton
          title={c.back}
          variant="outline"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/activity'))}
          style={styles.smallButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          region={region}
          mapPadding={{ top: insets.top + 58, right: 16, bottom: 28, left: 16 }}
          toolbarEnabled={false}
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={{ latitude: request.pickupLatitude, longitude: request.pickupLongitude }}
            title={c.pickupMarker}
            pinColor={Colors.error}
          />
          {providerLocation ? (
            <Marker
              coordinate={providerLocation}
              title={request.providerName ?? c.provider}
              description={
                request.providerContactPhone
                  ? `${c.contact}: ${displayPhone(request.providerContactPhone)}`
                  : (request.providerTeamName ?? undefined)
              }
              pinColor={Colors.primary}
            />
          ) : null}
          {route.data?.coordinates?.length ? (
            <Polyline coordinates={route.data.coordinates} strokeColor={Colors.primary} strokeWidth={5} />
          ) : null}
        </MapView>
        <View pointerEvents="none" style={[styles.statusScrim, { height: insets.top }]} />
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/activity'))}
          style={[styles.back, { top: insets.top + 8 }]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={c.back}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={[styles.mapBadge, { top: insets.top + 10 }]}>
          <View style={[styles.liveDot, { backgroundColor: route.data ? Colors.success : Colors.warning }]} />
          <Text style={styles.mapBadgeText}>{route.data ? c.roadRoute : c.noRoute}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        {screenMessage ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {screenMessage}
          </Text>
        ) : null}
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { backgroundColor: `${statusColor(request.status)}18` }]}>
            <Ionicons
              name={request.serviceIcon as keyof typeof Ionicons.glyphMap}
              size={25}
              color={statusColor(request.status)}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.service}>{request.serviceLabel}</Text>
            <Text style={[styles.status, { color: statusColor(request.status) }]}>
              {statusLabel(request.status, language)}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Info icon="location-outline" label={c.landmark} value={request.pickupAreaLabel} />
          {request.providerName ? (
            <Info icon="person-outline" label={c.provider} value={request.providerName} />
          ) : null}
          {request.assignedProviderId ? (
            <RatingBadge rating={request.providerRating} label={c.provider} />
          ) : null}
          {request.providerContactPhone ? <ProviderContact phone={request.providerContactPhone} /> : null}
          {request.providerTeamName ? (
            <Info icon="people-outline" label={c.team} value={request.providerTeamName} />
          ) : null}
          {request.providerTeamName ? <RatingBadge rating={request.teamRating} label={c.team} /> : null}
          {request.rescueVehicleLabel ? (
            <Info icon="bicycle-outline" label={c.vehicle} value={request.rescueVehicleLabel} />
          ) : null}
          {request.etaMinutes != null ? (
            <Info
              icon="time-outline"
              label={c.initialEta}
              value={template(c.aboutMinutes, { value: request.etaMinutes })}
            />
          ) : null}
          {request.roadDistanceM != null ? (
            <Info
              icon="navigate-outline"
              label={c.road}
              value={`${(request.roadDistanceM / 1000).toFixed(1)} km`}
            />
          ) : null}
        </View>

        {request.assignedProviderId ? (
          <AppButton
            title={c.fullscreen}
            variant="outline"
            onPress={() => router.push(`/rescue/${request.id}/map`)}
          />
        ) : null}

        {request.routingStatus === 'unavailable' ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>{c.routingWarning}</Text>
          </View>
        ) : null}
        {role === 'customer' && request.status === 'no_provider' ? (
          <View style={styles.noProviderCard}>
            <Text style={styles.noProviderTitle}>{c.noProviderTitle}</Text>
            <Text style={styles.infoLabel}>{c.noProviderBody}</Text>
            {SUPPORT_HOTLINE ? (
              <AppButton
                title={`${c.callDispatch} ${SUPPORT_HOTLINE}`}
                variant="outline"
                onPress={() => void Linking.openURL(`tel:${SUPPORT_HOTLINE}`)}
              />
            ) : null}
          </View>
        ) : null}
        {isAssignedProvider ? <TrackingNotice state={tracking} /> : null}
        {request.currentQuote ? <QuoteCard request={request} /> : null}
        {role === 'customer' && request.status === 'completed' ? <ReviewEditor request={request} /> : null}
        {role === 'customer' ? <CustomerActions request={request} /> : null}
        {isAssignedProvider ? <ProviderActions request={request} /> : null}
        {isAssignedProvider ? <OperationalCancel request={request} actorLabel={c.provider} /> : null}
        {role === 'dispatcher' || role === 'admin' ? (
          <OperationalCancel request={request} actorLabel={c.dispatcher} />
        ) : null}
        {(role === 'dispatcher' || role === 'admin') && request.status === 'no_provider' ? (
          <AppButton title={c.retry} loading={retryingDispatch} onPress={() => void retryDispatch()} />
        ) : null}

        <Text style={styles.section}>{c.progress}</Text>
        <View style={styles.timeline}>
          {request.events.map((event, index) => (
            <View key={`${event.createdAt}-${index}`} style={styles.event}>
              <View style={styles.eventRail}>
                <View style={styles.eventDot} />
                {index < request.events.length - 1 ? <View style={styles.eventLine} /> : null}
              </View>
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle}>{statusLabel(event.toStatus, language)}</Text>
                <Text style={styles.eventTime}>
                  {new Date(event.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ProviderContact({ phone }: { phone: string }) {
  const visiblePhone = displayPhone(phone);
  const c = useCopy(COPY);
  return (
    <Pressable
      style={styles.infoRow}
      onPress={() => void Linking.openURL(`tel:${phone}`)}
      accessibilityRole="button"
      accessibilityLabel={`${c.callProvider} ${visiblePhone}`}
    >
      <Ionicons name="call-outline" size={20} color={Colors.primary} />
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{c.contactLabel}</Text>
        <Text style={styles.infoValue}>{visiblePhone}</Text>
        <Text style={styles.contactPrivacy}>{c.contactPrivacy}</Text>
      </View>
      <View style={styles.callChip}>
        <Text style={styles.callChipText}>{c.call}</Text>
      </View>
    </Pressable>
  );
}

function displayPhone(phone: string) {
  return phone.startsWith('+84') ? `0${phone.slice(3)}` : phone;
}

function TrackingNotice({ state }: { state: ReturnType<typeof useProviderTracking> }) {
  const c = useCopy(COPY);
  return (
    <View style={styles.tracking}>
      <Ionicons
        name="navigate-circle-outline"
        size={21}
        color={state === 'tracking' ? Colors.success : Colors.warning}
      />
      <Text style={styles.trackingText}>
        {c.tracking[state]} {c.expoTracking}
      </Text>
    </View>
  );
}

function QuoteCard({ request }: { request: RequestDetails }) {
  const quote = request.currentQuote!;
  const c = useCopy(COPY);
  const language = useI18n((state) => state.language);
  const status = {
    pending: c.quotePending,
    approved: c.quoteApproved,
    rejected: c.quoteRejected,
    superseded: c.quoteSuperseded,
  }[quote.status];
  return (
    <View style={styles.quoteCard}>
      <Text style={styles.section}>
        {c.quote} #{quote.version}
      </Text>
      <Text style={styles.quoteDescription}>{quote.description}</Text>
      <Text style={styles.quoteAmount}>
        {quote.amountVnd.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} VND
      </Text>
      <Text style={styles.infoLabel}>
        {quote.workType === 'transport' ? c.transport : c.repair} • {status}
      </Text>
    </View>
  );
}

function CustomerActions({ request }: { request: RequestDetails }) {
  const actions = useRequestMutation(request.id);
  const c = useCopy(COPY);
  const [message, setMessage] = useState<string | null>(null);
  const run = async (operation: Promise<unknown>) => {
    setMessage(null);
    try {
      await operation;
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.actionError);
    }
  };
  const cancel = () =>
    Alert.alert(c.cancelTitle, c.cancelBody, [
      { text: c.no, style: 'cancel' },
      {
        text: c.cancel,
        style: 'destructive',
        onPress: () =>
          void run(actions.cancel.mutateAsync({ reason: c.customerCancelReason, version: request.version })),
      },
    ]);
  return (
    <View style={styles.actions}>
      {request.status === 'awaiting_arrival_confirmation' ? (
        <>
          <AppButton
            title={c.confirmArrival}
            onPress={() =>
              void run(actions.action.mutateAsync({ action: 'confirm_arrival', version: request.version }))
            }
          />
          <AppButton
            title={c.rejectArrival}
            variant="outline"
            onPress={() =>
              void run(actions.action.mutateAsync({ action: 'reject_arrival', version: request.version }))
            }
          />
        </>
      ) : null}
      {request.status === 'awaiting_quote' && request.currentQuote?.status === 'pending' ? (
        <>
          <AppButton
            title={c.approveQuote}
            onPress={() =>
              void run(
                actions.decideQuote.mutateAsync({
                  quoteId: request.currentQuote!.id,
                  decision: 'approve',
                  version: request.version,
                }),
              )
            }
          />
          <AppButton
            title={c.rejectQuote}
            variant="outline"
            onPress={() =>
              void run(
                actions.decideQuote.mutateAsync({
                  quoteId: request.currentQuote!.id,
                  decision: 'reject',
                  version: request.version,
                }),
              )
            }
          />
        </>
      ) : null}
      {request.status === 'awaiting_completion' ? (
        <>
          <AppButton
            title={c.confirmCompletion}
            onPress={() =>
              void run(actions.action.mutateAsync({ action: 'confirm_completion', version: request.version }))
            }
          />
          <AppButton
            title={c.incomplete}
            variant="outline"
            onPress={() =>
              void run(
                actions.action.mutateAsync({
                  action: request.activeWorkType === 'transport' ? 'reject_transport' : 'reject_repair',
                  version: request.version,
                }),
              )
            }
          />
        </>
      ) : null}
      {canCustomerCancel(request.status) ? (
        <AppButton title={c.cancel} variant="ghost" onPress={cancel} />
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

function ProviderActions({ request }: { request: RequestDetails }) {
  const actions = useRequestMutation(request.id);
  const c = useCopy(COPY);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [workType, setWorkType] = useState<'repair' | 'transport'>('repair');
  const [message, setMessage] = useState<string | null>(null);
  const runAction = async (action: string, nextWork?: 'repair' | 'transport') => {
    setMessage(null);
    try {
      await actions.action.mutateAsync({ action, version: request.version, workType: nextWork });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.stateError);
    }
  };
  const quote = async () => {
    const value = Number(amount.replace(/\D/g, ''));
    if (description.trim().length < 2 || !Number.isFinite(value)) return setMessage(c.quoteInvalid);
    try {
      await actions.quote.mutateAsync({
        description: description.trim(),
        amountVnd: value,
        workType,
        expectedRequestVersion: request.version,
      });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.quoteError);
    }
  };
  return (
    <View style={styles.actions}>
      {request.status === 'assigned' ? (
        <AppButton title={c.startTrip} onPress={() => void runAction('start_trip')} />
      ) : null}
      {request.status === 'en_route' ? (
        <AppButton title={c.requestArrival} onPress={() => void runAction('request_arrival')} />
      ) : null}
      {request.status === 'arrived' ? (
        <AppButton title={c.startDiagnosis} onPress={() => void runAction('start_diagnosis')} />
      ) : null}
      {request.status === 'diagnosing' && request.serviceRequiresQuote ? (
        <View style={styles.quoteForm}>
          <Text style={styles.section}>{c.createQuote}</Text>
          <AppInput
            label={c.workDescription}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
          />
          <AppInput
            label={c.amount}
            value={amount}
            onChangeText={(value) => setAmount(value.replace(/\D/g, ''))}
            keyboardType="number-pad"
          />
          <View style={styles.workRow}>
            {(['repair', 'transport'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setWorkType(value)}
                style={[styles.workChip, workType === value && styles.workChipActive]}
              >
                <Text style={styles.workText}>{value === 'repair' ? c.repairBike : c.transportBike}</Text>
              </Pressable>
            ))}
          </View>
          <AppButton title={c.sendQuote} onPress={() => void quote()} loading={actions.quote.isPending} />
        </View>
      ) : null}
      {request.status === 'diagnosing' && !request.serviceRequiresQuote ? (
        <>
          <AppButton title={c.startRepair} onPress={() => void runAction('start_work', 'repair')} />
          <AppButton
            title={c.switchTransport}
            variant="outline"
            onPress={() => void runAction('start_work', 'transport')}
          />
        </>
      ) : null}
      {request.status === 'repairing' || request.status === 'transporting' ? (
        <AppButton title={c.requestCompletion} onPress={() => void runAction('request_completion')} />
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

function OperationalCancel({ request, actorLabel }: { request: RequestDetails; actorLabel: string }) {
  const actions = useRequestMutation(request.id);
  const c = useCopy(COPY);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  if (request.status === 'completed' || request.status === 'cancelled') return null;
  const submit = async () => {
    if (reason.trim().length < 5) return setMessage(c.reasonRequired);
    setMessage(null);
    try {
      await actions.cancel.mutateAsync({ reason: reason.trim(), version: request.version });
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.cancelError);
    }
  };
  if (!open)
    return (
      <AppButton title={`${actorLabel}: ${c.cannotContinue}`} variant="ghost" onPress={() => setOpen(true)} />
    );
  return (
    <View style={styles.cancelPanel}>
      <Text style={styles.section}>{c.auditCancel}</Text>
      <Text style={styles.infoLabel}>{c.auditBody}</Text>
      <AppInput label={c.reason} value={reason} onChangeText={setReason} maxLength={300} multiline />
      {message ? <Text style={styles.error}>{message}</Text> : null}
      <AppButton
        title={c.confirmCancel}
        variant="destructive"
        onPress={() => void submit()}
        loading={actions.cancel.isPending}
      />
      <AppButton
        title={c.keep}
        variant="ghost"
        onPress={() => {
          setOpen(false);
          setMessage(null);
        }}
      />
    </View>
  );
}

function ReviewEditor({ request }: { request: RequestDetails }) {
  const client = useQueryClient();
  const c = useCopy(COPY);
  const [rating, setRating] = useState(request.review?.rating ?? 5);
  const [comment, setComment] = useState(request.review?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await rescueApi.saveReview(request.id, rating, comment.trim() || undefined);
      await client.invalidateQueries({ queryKey: rescueKeys.request(request.id) });
    } catch (error) {
      Alert.alert(c.saveReviewError, error instanceof ApiClientError ? error.message : c.retryGeneric);
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    Alert.alert(c.deleteReviewTitle, c.deleteReviewBody, [
      { text: c.no, style: 'cancel' },
      {
        text: c.delete,
        style: 'destructive',
        onPress: () =>
          void rescueApi
            .deleteReview(request.id)
            .then(() => client.invalidateQueries({ queryKey: rescueKeys.request(request.id) }))
            .catch((error) =>
              Alert.alert(
                c.deleteReviewError,
                error instanceof ApiClientError ? error.message : c.retryGeneric,
              ),
            ),
      },
    ]);
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.section}>{request.review ? c.editReview : c.review}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => setRating(value)} hitSlop={5}>
            <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={32} color={Colors.accentDark} />
          </Pressable>
        ))}
      </View>
      <AppInput
        value={comment}
        onChangeText={setComment}
        maxLength={1000}
        multiline
        placeholder={c.reviewPlaceholder}
      />
      <AppButton title={c.saveReview} onPress={() => void save()} loading={busy} />
      {request.review ? <AppButton title={c.deleteReview} variant="ghost" onPress={remove} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  mapWrap: { height: '40%', minHeight: 280, backgroundColor: Colors.surface },
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Colors.mapScrim },
  back: {
    position: 'absolute',
    left: Spacing.md,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBadge: {
    position: 'absolute',
    right: Spacing.md,
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.glass,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  mapBadgeText: { ...Typography.caption, color: Colors.textPrimary },
  sheet: {
    flex: 1,
    marginTop: -18,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.background,
  },
  content: { padding: Spacing.lg, gap: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  statusIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  service: { ...Typography.h2, color: Colors.textPrimary },
  status: { ...Typography.bodyBold },
  infoCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  infoLabel: { ...Typography.caption, color: Colors.textMuted },
  infoValue: { ...Typography.bodyBold, color: Colors.textPrimary },
  contactPrivacy: { ...Typography.caption, color: Colors.textSecondary },
  callChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
  },
  callChipText: { ...Typography.caption, color: Colors.primaryDark, fontFamily: 'BeVietnamPro_600SemiBold' },
  warning: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.warningSoft },
  warningText: { ...Typography.caption, color: Colors.warning },
  tracking: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.sky,
  },
  trackingText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  noProviderCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  noProviderTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  quoteCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  quoteDescription: { ...Typography.body, color: Colors.textPrimary, marginTop: Spacing.sm },
  quoteAmount: { ...Typography.h2, color: Colors.primaryDark, marginVertical: Spacing.sm },
  actions: { gap: Spacing.sm },
  section: { ...Typography.h3, color: Colors.textPrimary },
  timeline: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.cardBg },
  event: { flexDirection: 'row', minHeight: 58 },
  eventRail: { width: 24, alignItems: 'center' },
  eventDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, marginTop: 5 },
  eventLine: { width: 2, flex: 1, backgroundColor: Colors.divider },
  eventBody: { flex: 1, paddingBottom: Spacing.md },
  eventTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  eventTime: { ...Typography.caption, color: Colors.textMuted },
  quoteForm: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    gap: Spacing.sm,
  },
  workRow: { flexDirection: 'row', gap: Spacing.sm },
  workChip: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  workChipActive: { backgroundColor: Colors.accent },
  workText: { ...Typography.bodyBold, color: Colors.textPrimary },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  stars: { flexDirection: 'row', gap: Spacing.sm },
  error: { ...Typography.body, color: Colors.error },
  smallButton: { maxWidth: 220 },
  flex: { flex: 1 },
  cancelPanel: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.errorSubtle,
    gap: Spacing.sm,
  },
});
