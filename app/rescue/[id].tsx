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
import { Fonts, Radius, Spacing, Typography } from '@/src/constants/spacing';
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
import type { CancellationReasonCode, LocationPoint, RequestDetails } from '@/src/types/rescue';
import { useCopy, useI18n } from '@/src/i18n';

const SUPPORT_HOTLINE = String(Constants.expoConfig?.extra?.supportHotline ?? '').replace(/[^+\d]/g, '');
const COPY = {
  vi: {
    retryError: 'Không thể tìm lại đội cứu hộ.',
    loadError: 'Không thể tải yêu cầu này.',
    back: 'Quay lại',
    pickupMarker: 'Vị trí cứu hộ',
    destinationMarker: 'Điểm giao xe',
    provider: 'Cứu hộ viên',
    contact: 'Liên hệ',
    roadRoute: 'Tuyến đường xe máy',
    noRoute: 'Chưa có tuyến đường',
    landmark: 'Điểm nhận biết',
    destination: 'Điểm giao xe',
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
    requestDispatchSupport: 'Yêu cầu điều phối hỗ trợ',
    supportRequested: 'Đã gửi yêu cầu. Điều phối viên sẽ kiểm tra ca này.',
    supportError: 'Không thể gửi yêu cầu hỗ trợ.',
    dispatcher: 'Điều phối viên',
    retry: 'Tìm lại đội phù hợp',
    gpsStaleTitle: 'Vị trí cứu hộ viên đã cũ',
    gpsStaleBody: 'Tuyến đường và ETA tạm dừng cho đến khi thiết bị của cứu hộ viên gửi GPS mới.',
    dispatchRequiredTitle: 'Điều phối viên đang xử lý lại ca',
    dispatchRequiredBody: 'Đội trước không thể tiếp tục. Yêu cầu của bạn vẫn được giữ và chưa bị hủy.',
    attentionRequired: 'Ca này có cảnh báo vận hành cần kiểm tra',
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
    cancelBody: 'Chọn lý do để điều phối hiểu đúng tình huống. Thao tác sẽ được ghi vào lịch sử.',
    no: 'Không',
    cancel: 'Hủy yêu cầu',
    chooseCancelReason: 'Lý do hủy',
    cancelReasonRequired: 'Hãy chọn một lý do hủy.',
    otherReasonRequired: 'Hãy mô tả lý do bằng ít nhất 5 ký tự.',
    cancelNote: 'Mô tả thêm (không bắt buộc)',
    cancelOtherNote: 'Mô tả lý do',
    lateCancelWarning:
      'Đội cứu hộ đã xuất phát. Lần hủy này được ghi nhận là hủy muộn; nhiều lần hủy muộn có thể tạm giới hạn tạo ca mới.',
    arrivalDisputeWarning:
      'Đội cứu hộ đã báo đến nơi. Nếu bạn chưa thấy họ, lần hủy này sẽ được chuyển thành trường hợp cần điều phối kiểm tra.',
    cancelAfterArrivalTitle: 'Cần dừng ca sau khi đã xác nhận đội đến?',
    cancelAfterArrivalBody:
      'Bạn không thể tự hủy ở giai đoạn đang xử lý. Hãy gọi điều phối để bảo vệ cả khách và đội cứu hộ, đồng thời lưu đúng diễn biến ca.',
    cancellationRecorded: 'Thông tin hủy',
    operationalCancellation: 'Ca đã được dừng bởi đội cứu hộ hoặc điều phối.',
    lateCancellationRecorded: 'Đã ghi nhận hủy muộn',
    gpsNearRecorded: 'GPS gần điểm cứu hộ khi hủy',
    reasonLabels: {
      issue_resolved: 'Xe đã tự hoạt động lại / không còn cần hỗ trợ',
      changed_mind: 'Đổi ý hoặc đã chọn phương án khác',
      wrong_location: 'Chọn sai vị trí',
      duplicate_request: 'Gửi trùng yêu cầu',
      provider_not_present: 'Chưa thấy đội cứu hộ tại điểm hẹn',
      provider_unavailable: 'Đội cứu hộ không thể tiếp tục',
      safety_issue: 'Có vấn đề an toàn',
      customer_unreachable: 'Không liên lạc được với khách',
      duplicate_or_fraud: 'Yêu cầu trùng hoặc có dấu hiệu bất thường',
      other: 'Lý do khác',
    },
    confirmArrival: 'Xác nhận cứu hộ viên đã đến',
    rejectArrival: 'Chưa thấy cứu hộ viên',
    approveQuote: 'Đồng ý báo giá',
    rejectQuote: 'Từ chối báo giá',
    chooseDestination: 'Chọn điểm giao xe',
    destinationBeforeQuote: 'Báo giá vận chuyển cần điểm giao xe trước khi bạn có thể duyệt.',
    confirmCompletion: 'Xác nhận đã hoàn tất',
    incomplete: 'Công việc chưa hoàn tất',
    feedbackTitle: 'Cho biết điều gì chưa đúng',
    feedbackReasonRequired: 'Hãy chọn lý do trước khi gửi.',
    feedbackNote: 'Mô tả thêm',
    sendFeedback: 'Gửi và yêu cầu xử lý lại',
    closeFeedback: 'Quay lại',
    feedbackReasons: {
      provider_not_visible: 'Chưa thấy cứu hộ viên tại điểm hẹn',
      wrong_meeting_point: 'Cứu hộ viên đang ở sai điểm',
      cannot_contact_provider: 'Không liên lạc được với cứu hộ viên',
      issue_persists: 'Xe vẫn còn lỗi',
      work_not_as_agreed: 'Công việc không đúng nội dung đã thống nhất',
      destination_not_reached: 'Xe chưa đến đúng điểm giao',
      other: 'Lý do khác',
    },
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
    startApprovedRepair: 'Bắt đầu công việc sửa xe đã duyệt',
    startApprovedTransport: 'Bắt đầu vận chuyển đã duyệt',
    requestCompletion: 'Yêu cầu khách xác nhận hoàn tất',
    reasonRequired: 'Hãy nhập lý do cụ thể để lưu vào audit.',
    cancelError: 'Không thể hủy ca.',
    cannotContinue: 'báo không thể tiếp tục',
    auditCancel: 'Dừng ca có audit',
    auditBody:
      'Chỉ dùng khi có sự cố an toàn hoặc không thể tiếp tục. Hệ thống sẽ thông báo cho bên còn lại.',
    withdrawBody:
      'Hệ thống sẽ giữ nguyên yêu cầu của khách và tìm đội khác. Nếu công việc đã bắt đầu, ca được chuyển cho điều phối viên xử lý.',
    reason: 'Lý do',
    confirmCancel: 'Xác nhận dừng ca',
    keep: 'Giữ ca',
    saveReviewError: 'Không thể lưu đánh giá',
    retryGeneric: 'Vui lòng thử lại.',
    deleteReviewTitle: 'Xóa đánh giá?',
    deleteReviewBody: 'Bạn có thể tạo đánh giá mới sau đó.',
    deleteReviewError: 'Không thể xóa đánh giá',
    editReview: 'Chỉnh sửa đánh giá',
    review: 'Đánh giá ca cứu hộ',
    reviewPlaceholder: 'Nhận xét về thái độ và chất lượng xử lý',
    saveReview: 'Lưu đánh giá',
    deleteReview: 'Xóa đánh giá',
    incidentTitle: 'Khiếu nại hoặc báo sự cố',
    incidentIntro: 'Nội dung này tách biệt với đánh giá sao và chỉ khách, điều phối viên, admin được xem.',
    reportIncident: 'Gửi khiếu nại / báo sự cố',
    incidentCategory: 'Nhóm vấn đề',
    incidentDescription: 'Mô tả sự việc',
    incidentPlaceholder: 'Nêu diễn biến cụ thể, tránh ghi thông tin cá nhân không cần thiết',
    incidentRequired: 'Hãy chọn nhóm và nhập mô tả ít nhất 10 ký tự.',
    incidentSent: 'Đã gửi để điều phối viên kiểm tra.',
    incidentError: 'Không thể gửi nội dung này.',
    incidentResolution: 'Kết quả xử lý',
    resolveIncident: 'Xác nhận đã xử lý',
    dismissIncident: 'Bác bỏ có lý do',
    incidentStatuses: { open: 'Đang xử lý', resolved: 'Đã xử lý', dismissed: 'Đã bác bỏ' },
    incidentCategories: {
      provider_conduct: 'Thái độ cứu hộ viên',
      service_quality: 'Chất lượng dịch vụ',
      safety: 'Vấn đề an toàn',
      property_damage: 'Hư hại tài sản',
      other: 'Vấn đề khác',
    },
  },
  en: {
    retryError: 'Could not find another rescue team.',
    loadError: 'Could not load this request.',
    back: 'Go back',
    pickupMarker: 'Rescue location',
    destinationMarker: 'Motorcycle drop-off',
    provider: 'Rescue provider',
    contact: 'Contact',
    roadRoute: 'Motorcycle road route',
    noRoute: 'Route unavailable',
    landmark: 'Landmark',
    destination: 'Drop-off point',
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
    requestDispatchSupport: 'Request dispatch support',
    supportRequested: 'Request sent. A dispatcher will review this case.',
    supportError: 'Could not request dispatch support.',
    dispatcher: 'Dispatcher',
    retry: 'Find another suitable team',
    gpsStaleTitle: 'Provider location is stale',
    gpsStaleBody: 'Route and ETA are paused until the provider device sends a fresh GPS point.',
    dispatchRequiredTitle: 'Dispatch is handling this request',
    dispatchRequiredBody:
      'The previous provider could not continue. Your request remains open and is not cancelled.',
    attentionRequired: 'This request has an operational alert that needs review',
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
    cancelBody: 'Choose a reason so dispatch can understand the situation. This action is recorded.',
    no: 'No',
    cancel: 'Cancel request',
    chooseCancelReason: 'Cancellation reason',
    cancelReasonRequired: 'Choose a cancellation reason.',
    otherReasonRequired: 'Describe the reason using at least 5 characters.',
    cancelNote: 'Additional details (optional)',
    cancelOtherNote: 'Describe the reason',
    lateCancelWarning:
      'The rescue provider has departed. This will be recorded as a late cancellation; repeated late cancellations may temporarily limit new requests.',
    arrivalDisputeWarning:
      'The provider reported arriving. If you cannot see them, this cancellation will be flagged for dispatch review.',
    cancelAfterArrivalTitle: 'Need to stop after confirming provider arrival?',
    cancelAfterArrivalBody:
      'Self-cancellation is disabled while work is in progress. Call dispatch so both parties are protected and the request history stays accurate.',
    cancellationRecorded: 'Cancellation details',
    operationalCancellation: 'The request was stopped by the rescue provider or dispatch staff.',
    lateCancellationRecorded: 'Late cancellation recorded',
    gpsNearRecorded: 'GPS was near the rescue point at cancellation',
    reasonLabels: {
      issue_resolved: 'The motorcycle works again / help is no longer needed',
      changed_mind: 'Changed mind or chose another option',
      wrong_location: 'Incorrect pickup location',
      duplicate_request: 'Duplicate request',
      provider_not_present: 'Provider is not visible at the meeting point',
      provider_unavailable: 'Provider could not continue',
      safety_issue: 'Safety issue',
      customer_unreachable: 'Customer could not be reached',
      duplicate_or_fraud: 'Duplicate or suspicious request',
      other: 'Other reason',
    },
    confirmArrival: 'Confirm provider arrival',
    rejectArrival: 'Provider not here',
    approveQuote: 'Approve quote',
    rejectQuote: 'Reject quote',
    chooseDestination: 'Choose drop-off point',
    destinationBeforeQuote: 'A transport quote needs a drop-off point before you can approve it.',
    confirmCompletion: 'Confirm completion',
    incomplete: 'Work is not complete',
    feedbackTitle: 'Tell us what is wrong',
    feedbackReasonRequired: 'Choose a reason before submitting.',
    feedbackNote: 'Additional details',
    sendFeedback: 'Submit and request correction',
    closeFeedback: 'Go back',
    feedbackReasons: {
      provider_not_visible: 'Provider is not visible at the meeting point',
      wrong_meeting_point: 'Provider is at the wrong point',
      cannot_contact_provider: 'Provider cannot be contacted',
      issue_persists: 'The motorcycle issue remains',
      work_not_as_agreed: 'Work does not match what was agreed',
      destination_not_reached: 'Motorcycle has not reached the drop-off',
      other: 'Other reason',
    },
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
    startApprovedRepair: 'Start approved repair',
    startApprovedTransport: 'Start approved transport',
    requestCompletion: 'Ask customer to confirm completion',
    reasonRequired: 'Enter a specific reason for the audit record.',
    cancelError: 'Could not cancel the request.',
    cannotContinue: 'cannot continue',
    auditCancel: 'Audited request stop',
    auditBody:
      'Use only for a safety issue or when work cannot continue. The other participant will be notified.',
    withdrawBody:
      'The customer request stays open and another team will be searched. If work already began, dispatch will take over.',
    reason: 'Reason',
    confirmCancel: 'Confirm request stop',
    keep: 'Keep request',
    saveReviewError: 'Could not save review',
    retryGeneric: 'Please try again.',
    deleteReviewTitle: 'Delete review?',
    deleteReviewBody: 'You can create another review later.',
    deleteReviewError: 'Could not delete review',
    editReview: 'Edit review',
    review: 'Review rescue request',
    reviewPlaceholder: 'Comment on attitude and service quality',
    saveReview: 'Save review',
    deleteReview: 'Delete review',
    incidentTitle: 'Complaint or incident report',
    incidentIntro: 'This is separate from star ratings and is visible only to you, dispatchers, and admins.',
    reportIncident: 'Submit complaint / incident',
    incidentCategory: 'Issue category',
    incidentDescription: 'What happened',
    incidentPlaceholder: 'Describe concrete events without unnecessary personal information',
    incidentRequired: 'Choose a category and enter at least 10 characters.',
    incidentSent: 'Submitted for dispatch review.',
    incidentError: 'Could not submit this report.',
    incidentResolution: 'Resolution result',
    resolveIncident: 'Mark as resolved',
    dismissIncident: 'Dismiss with reason',
    incidentStatuses: { open: 'In review', resolved: 'Resolved', dismissed: 'Dismissed' },
    incidentCategories: {
      provider_conduct: 'Provider conduct',
      service_quality: 'Service quality',
      safety: 'Safety concern',
      property_damage: 'Property damage',
      other: 'Other issue',
    },
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
  const [requestingSupport, setRequestingSupport] = useState(false);
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
      if (role === 'customer') await rescueApi.retryCustomer(id);
      else if (request?.status === 'needs_dispatch') await rescueApi.reassignDispatch(id);
      else await rescueApi.retryDispatch(id);
      await requestQuery.refetch();
    } catch (error) {
      setScreenMessage(error instanceof ApiClientError ? error.message : c.retryError);
    } finally {
      setRetryingDispatch(false);
    }
  };

  const requestDispatchSupport = async () => {
    setScreenMessage(null);
    setRequestingSupport(true);
    try {
      await rescueApi.requestSupport(id, 'no_provider');
      setScreenMessage(c.supportRequested);
    } catch (error) {
      setScreenMessage(error instanceof ApiClientError ? error.message : c.supportError);
    } finally {
      setRequestingSupport(false);
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
    const transportLeg =
      request.activeWorkType === 'transport' &&
      (request.status === 'transporting' || request.status === 'awaiting_completion');
    const target =
      transportLeg && request.destinationLatitude != null && request.destinationLongitude != null
        ? { latitude: request.destinationLatitude, longitude: request.destinationLongitude }
        : { latitude: request.pickupLatitude, longitude: request.pickupLongitude };
    return {
      latitude: other ? (target.latitude + other.latitude) / 2 : target.latitude,
      longitude: other ? (target.longitude + other.longitude) / 2 : target.longitude,
      latitudeDelta: other ? Math.max(0.015, Math.abs(target.latitude - other.latitude) * 1.7) : 0.02,
      longitudeDelta: other ? Math.max(0.015, Math.abs(target.longitude - other.longitude) * 1.7) : 0.02,
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
          {request.destinationLatitude != null && request.destinationLongitude != null ? (
            <Marker
              coordinate={{
                latitude: request.destinationLatitude,
                longitude: request.destinationLongitude,
              }}
              title={c.destinationMarker}
              description={request.destinationAreaLabel ?? undefined}
              pinColor={Colors.success}
            />
          ) : null}
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
          {request.destinationAreaLabel ? (
            <Info icon="flag-outline" label={c.destination} value={request.destinationAreaLabel} />
          ) : null}
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
        {request.providerLocationStatus === 'stale' ? (
          <View style={styles.warning}>
            <Text style={styles.noProviderTitle}>{c.gpsStaleTitle}</Text>
            <Text style={styles.warningText}>{c.gpsStaleBody}</Text>
          </View>
        ) : null}
        {request.status === 'needs_dispatch' ? (
          <View style={styles.noProviderCard}>
            <Text style={styles.noProviderTitle}>{c.dispatchRequiredTitle}</Text>
            <Text style={styles.infoLabel}>{c.dispatchRequiredBody}</Text>
          </View>
        ) : null}
        {(role === 'dispatcher' || role === 'admin') && request.attentionCodes.length > 0 ? (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              {c.attentionRequired}: {request.attentionCodes.join(', ')}
            </Text>
          </View>
        ) : null}
        {role === 'customer' && request.status === 'no_provider' ? (
          <View style={styles.noProviderCard}>
            <Text style={styles.noProviderTitle}>{c.noProviderTitle}</Text>
            <Text style={styles.infoLabel}>{c.noProviderBody}</Text>
            <AppButton title={c.retry} loading={retryingDispatch} onPress={() => void retryDispatch()} />
            <AppButton
              title={c.requestDispatchSupport}
              variant="outline"
              loading={requestingSupport}
              onPress={() => void requestDispatchSupport()}
            />
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
        {request.status === 'cancelled' ? <CancellationSummary request={request} role={role} /> : null}
        {role === 'customer' && request.status === 'completed' ? <ReviewEditor request={request} /> : null}
        {(role === 'customer' && request.assignedProviderId) ||
        ((role === 'dispatcher' || role === 'admin') && request.incidentReports.length > 0) ? (
          <IncidentReportPanel request={request} role={role} />
        ) : null}
        {role === 'customer' ? <CustomerActions request={request} /> : null}
        {isAssignedProvider ? <ProviderActions request={request} /> : null}
        {isAssignedProvider ? (
          <OperationalCancel
            request={request}
            actorLabel={c.provider}
            reasonCode="provider_unavailable"
            providerWithdrawal
          />
        ) : null}
        {role === 'dispatcher' || role === 'admin' ? (
          <OperationalCancel request={request} actorLabel={c.dispatcher} reasonCode="other" />
        ) : null}
        {(role === 'dispatcher' || role === 'admin') &&
        (request.status === 'no_provider' || request.status === 'needs_dispatch') ? (
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

function CancellationSummary({ request, role }: { request: RequestDetails; role: string }) {
  const c = useCopy(COPY);
  const reasonLabel = request.cancellationCode ? c.reasonLabels[request.cancellationCode] : null;
  const canSeeOperationalEvidence = role === 'dispatcher' || role === 'admin';
  return (
    <View style={styles.cancellationSummary}>
      <View style={styles.summaryTitleRow}>
        <Ionicons name="document-text-outline" size={21} color={Colors.primary} />
        <Text style={styles.section}>{c.cancellationRecorded}</Text>
      </View>
      {reasonLabel ? <Text style={styles.infoValue}>{reasonLabel}</Text> : null}
      {!reasonLabel && request.cancellationStage === 'operational' ? (
        <Text style={styles.infoValue}>{c.operationalCancellation}</Text>
      ) : null}
      {request.cancellationReason ? <Text style={styles.infoLabel}>{request.cancellationReason}</Text> : null}
      {request.lateCancellation ? (
        <Text style={styles.lateCancellationText}>{c.lateCancellationRecorded}</Text>
      ) : null}
      {canSeeOperationalEvidence && request.providerNearPickupOnCancel === true ? (
        <Text style={styles.infoLabel}>{c.gpsNearRecorded}</Text>
      ) : null}
    </View>
  );
}

function CustomerActions({ request }: { request: RequestDetails }) {
  const actions = useRequestMutation(request.id);
  const c = useCopy(COPY);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<CancellationReasonCode | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [feedbackAction, setFeedbackAction] = useState<
    'reject_arrival' | 'reject_repair' | 'reject_transport' | null
  >(null);
  const [feedbackReason, setFeedbackReason] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [requestingSupport, setRequestingSupport] = useState(false);
  const [supportRequested, setSupportRequested] = useState(false);
  const run = async (operation: Promise<unknown>) => {
    setMessage(null);
    try {
      await operation;
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.actionError);
    }
  };
  const cancellationReasons = customerCancellationReasons(request.status);
  const late = request.status === 'en_route' || request.status === 'awaiting_arrival_confirmation';
  const arrivalDispute = request.status === 'awaiting_arrival_confirmation';
  const transportNeedsDestination =
    request.status === 'awaiting_quote' &&
    request.currentQuote?.status === 'pending' &&
    request.currentQuote.workType === 'transport' &&
    request.destinationLatitude == null;
  const submitCancellation = async () => {
    if (!reasonCode) return setMessage(c.cancelReasonRequired);
    if (reasonCode === 'other' && cancelNote.trim().length < 5) {
      return setMessage(c.otherReasonRequired);
    }
    setMessage(null);
    try {
      await actions.cancel.mutateAsync({
        reasonCode,
        note: cancelNote.trim() || undefined,
        expectedVersion: request.version,
      });
      setCancelOpen(false);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.cancelError);
    }
  };
  const feedbackReasons =
    feedbackAction === 'reject_arrival'
      ? ['provider_not_visible', 'wrong_meeting_point', 'cannot_contact_provider', 'other']
      : ['issue_persists', 'work_not_as_agreed', 'destination_not_reached', 'other'];
  const submitFeedback = async () => {
    if (!feedbackAction || !feedbackReason) return setMessage(c.feedbackReasonRequired);
    if (feedbackReason === 'other' && feedbackNote.trim().length < 5) {
      return setMessage(c.otherReasonRequired);
    }
    setMessage(null);
    try {
      await actions.action.mutateAsync({
        action: feedbackAction,
        version: request.version,
        reasonCode: feedbackReason,
        note: feedbackNote.trim() || undefined,
      });
      setFeedbackAction(null);
      setFeedbackReason(null);
      setFeedbackNote('');
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.actionError);
    }
  };
  const requestDispatchSupport = async () => {
    setMessage(null);
    setRequestingSupport(true);
    try {
      await rescueApi.requestSupport(request.id, 'assisted_cancellation');
      setSupportRequested(true);
      setMessage(c.supportRequested);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.supportError);
    } finally {
      setRequestingSupport(false);
    }
  };
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
            onPress={() => setFeedbackAction('reject_arrival')}
          />
        </>
      ) : null}
      {request.status === 'awaiting_quote' && request.currentQuote?.status === 'pending' ? (
        <>
          {transportNeedsDestination ? (
            <View style={styles.destinationRequiredCard}>
              <Text style={styles.infoLabel}>{c.destinationBeforeQuote}</Text>
              <AppButton
                title={c.chooseDestination}
                variant="outline"
                onPress={() => router.push(`/rescue/${request.id}/destination`)}
              />
            </View>
          ) : (
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
          )}
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
              setFeedbackAction(request.activeWorkType === 'transport' ? 'reject_transport' : 'reject_repair')
            }
          />
        </>
      ) : null}
      {feedbackAction ? (
        <View style={styles.feedbackPanel}>
          <Text style={styles.section}>{c.feedbackTitle}</Text>
          <View accessibilityRole="radiogroup" style={styles.reasonList}>
            {feedbackReasons.map((code) => {
              const selected = feedbackReason === code;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={c.feedbackReasons[code as keyof typeof c.feedbackReasons]}
                  onPress={() => setFeedbackReason(code)}
                  style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={21}
                    color={selected ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={styles.reasonOptionText}>
                    {c.feedbackReasons[code as keyof typeof c.feedbackReasons]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <AppInput
            label={c.feedbackNote}
            value={feedbackNote}
            onChangeText={setFeedbackNote}
            maxLength={300}
            multiline
          />
          <AppButton
            title={c.sendFeedback}
            onPress={() => void submitFeedback()}
            loading={actions.action.isPending}
          />
          <AppButton
            title={c.closeFeedback}
            variant="ghost"
            onPress={() => {
              setFeedbackAction(null);
              setFeedbackReason(null);
              setFeedbackNote('');
            }}
          />
        </View>
      ) : null}
      {canCustomerCancel(request.status) ? (
        cancelOpen ? (
          <View style={styles.cancelPanel}>
            <Text style={styles.section}>{c.cancelTitle}</Text>
            <Text style={styles.infoLabel}>{c.cancelBody}</Text>
            {late ? (
              <View style={styles.cancelWarning}>
                <Ionicons name="warning-outline" size={20} color={Colors.warning} />
                <Text style={styles.cancelWarningText}>
                  {arrivalDispute ? c.arrivalDisputeWarning : c.lateCancelWarning}
                </Text>
              </View>
            ) : null}
            <Text style={styles.fieldLabel}>{c.chooseCancelReason}</Text>
            <View accessibilityRole="radiogroup" style={styles.reasonList}>
              {cancellationReasons.map((code) => {
                const selected = reasonCode === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      setReasonCode(code);
                      setMessage(null);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={c.reasonLabels[code]}
                    style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={21}
                      color={selected ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={styles.reasonOptionText}>{c.reasonLabels[code]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label={reasonCode === 'other' ? c.cancelOtherNote : c.cancelNote}
              value={cancelNote}
              onChangeText={setCancelNote}
              maxLength={300}
              multiline
            />
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <AppButton
              title={c.cancel}
              variant="destructive"
              onPress={() => void submitCancellation()}
              loading={actions.cancel.isPending}
            />
            <AppButton
              title={c.keep}
              variant="ghost"
              onPress={() => {
                setCancelOpen(false);
                setReasonCode(null);
                setCancelNote('');
                setMessage(null);
              }}
            />
          </View>
        ) : (
          <AppButton title={c.cancel} variant="ghost" onPress={() => setCancelOpen(true)} />
        )
      ) : null}
      {requiresAssistedCancellation(request.status) ? (
        <View style={styles.assistedCancelCard}>
          <Text style={styles.noProviderTitle}>{c.cancelAfterArrivalTitle}</Text>
          <Text style={styles.infoLabel}>{c.cancelAfterArrivalBody}</Text>
          <AppButton
            title={supportRequested ? c.supportRequested : c.requestDispatchSupport}
            loading={requestingSupport}
            disabled={supportRequested}
            onPress={() => void requestDispatchSupport()}
          />
          {SUPPORT_HOTLINE ? (
            <AppButton
              title={`${c.callDispatch} ${SUPPORT_HOTLINE}`}
              variant="outline"
              onPress={() => void Linking.openURL(`tel:${SUPPORT_HOTLINE}`)}
            />
          ) : null}
        </View>
      ) : null}
      {!cancelOpen && message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

function customerCancellationReasons(status: RequestDetails['status']): CancellationReasonCode[] {
  if (status === 'awaiting_arrival_confirmation') return ['provider_not_present'];
  if (status === 'searching' || status === 'offered' || status === 'no_provider') {
    return ['issue_resolved', 'changed_mind', 'wrong_location', 'duplicate_request', 'other'];
  }
  return ['issue_resolved', 'changed_mind', 'wrong_location', 'provider_not_present', 'other'];
}

function requiresAssistedCancellation(status: RequestDetails['status']) {
  return [
    'arrived',
    'diagnosing',
    'awaiting_quote',
    'quote_approved',
    'repairing',
    'transporting',
    'awaiting_completion',
  ].includes(status);
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
          <View style={styles.workRow} accessibilityRole="radiogroup">
            {(['repair', 'transport'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setWorkType(value)}
                accessibilityRole="radio"
                accessibilityLabel={value === 'repair' ? c.repairBike : c.transportBike}
                accessibilityState={{ checked: workType === value }}
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
      {request.status === 'quote_approved' && request.activeWorkType ? (
        <AppButton
          title={request.activeWorkType === 'transport' ? c.startApprovedTransport : c.startApprovedRepair}
          onPress={() => void runAction('start_work', request.activeWorkType!)}
        />
      ) : null}
      {request.status === 'repairing' || request.status === 'transporting' ? (
        <AppButton title={c.requestCompletion} onPress={() => void runAction('request_completion')} />
      ) : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

function OperationalCancel({
  request,
  actorLabel,
  reasonCode,
  providerWithdrawal = false,
}: {
  request: RequestDetails;
  actorLabel: string;
  reasonCode: CancellationReasonCode;
  providerWithdrawal?: boolean;
}) {
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
      if (providerWithdrawal) {
        await rescueApi.withdrawProvider(request.id, reason.trim());
        router.replace('/(tabs)/operations');
      } else {
        await actions.cancel.mutateAsync({
          reasonCode,
          note: reason.trim(),
          expectedVersion: request.version,
        });
      }
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
      <Text style={styles.infoLabel}>{providerWithdrawal ? c.withdrawBody : c.auditBody}</Text>
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

function IncidentReportPanel({ request, role }: { request: RequestDetails; role: string }) {
  const client = useQueryClient();
  const c = useCopy(COPY);
  const isStaff = role === 'dispatcher' || role === 'admin';
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<keyof typeof c.incidentCategories | null>(null);
  const [description, setDescription] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const categories = (Object.keys(c.incidentCategories) as (keyof typeof c.incidentCategories)[]).filter(
    (value) => !request.incidentReports.some((report) => report.category === value),
  );

  const submit = async () => {
    if (!category || description.trim().length < 10) {
      setMessage(c.incidentRequired);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await rescueApi.reportIncident(request.id, category, description.trim());
      await client.invalidateQueries({ queryKey: rescueKeys.request(request.id) });
      setCategory(null);
      setDescription('');
      setOpen(false);
      setMessage(c.incidentSent);
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.incidentError);
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (incidentId: string, decision: 'resolved' | 'dismissed') => {
    if (resolution.trim().length < 5) {
      setMessage(c.reasonRequired);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await rescueApi.resolveIncident(incidentId, decision, resolution.trim());
      await Promise.all([
        client.invalidateQueries({ queryKey: rescueKeys.request(request.id) }),
        client.invalidateQueries({ queryKey: rescueKeys.attention(true) }),
      ]);
      setSelectedIncident(null);
      setResolution('');
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.actionError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.incidentPanel}>
      <Text style={styles.section}>{c.incidentTitle}</Text>
      <Text style={styles.infoLabel}>{c.incidentIntro}</Text>
      {request.incidentReports.map((incident) => (
        <View key={incident.id} style={styles.incidentCard}>
          <View style={styles.summaryTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            <Text style={styles.infoValue}>{c.incidentCategories[incident.category]}</Text>
          </View>
          <Text style={styles.infoLabel}>{incident.description}</Text>
          <Text style={styles.incidentStatus}>{c.incidentStatuses[incident.status]}</Text>
          {incident.resolutionNote ? <Text style={styles.infoLabel}>{incident.resolutionNote}</Text> : null}
          {isStaff && incident.status === 'open' ? (
            selectedIncident === incident.id ? (
              <View style={styles.actions}>
                <AppInput
                  label={c.incidentResolution}
                  value={resolution}
                  onChangeText={setResolution}
                  maxLength={500}
                  multiline
                />
                <AppButton
                  title={c.resolveIncident}
                  loading={busy}
                  onPress={() => void resolve(incident.id, 'resolved')}
                />
                <AppButton
                  title={c.dismissIncident}
                  variant="outline"
                  disabled={busy}
                  onPress={() => void resolve(incident.id, 'dismissed')}
                />
              </View>
            ) : (
              <AppButton
                title={c.incidentResolution}
                variant="outline"
                onPress={() => {
                  setSelectedIncident(incident.id);
                  setResolution('');
                  setMessage(null);
                }}
              />
            )
          ) : null}
        </View>
      ))}
      {!isStaff && categories.length > 0 ? (
        open ? (
          <View style={styles.actions}>
            <Text style={styles.fieldLabel}>{c.incidentCategory}</Text>
            <View accessibilityRole="radiogroup" style={styles.reasonList}>
              {categories.map((value) => {
                const selected = category === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={c.incidentCategories[value]}
                    accessibilityState={{ checked: selected }}
                    style={[styles.reasonOption, selected && styles.reasonOptionSelected]}
                    onPress={() => setCategory(value)}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={21}
                      color={selected ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={styles.reasonOptionText}>{c.incidentCategories[value]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <AppInput
              label={c.incidentDescription}
              value={description}
              onChangeText={setDescription}
              placeholder={c.incidentPlaceholder}
              maxLength={1000}
              multiline
            />
            <AppButton title={c.reportIncident} loading={busy} onPress={() => void submit()} />
            <AppButton title={c.keep} variant="ghost" onPress={() => setOpen(false)} />
          </View>
        ) : (
          <AppButton title={c.reportIncident} variant="outline" onPress={() => setOpen(true)} />
        )
      ) : null}
      {message ? <Text style={styles.infoLabel}>{message}</Text> : null}
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
        text: c.deleteReview,
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
      <View style={styles.stars} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => setRating(value)}
            hitSlop={5}
            accessibilityRole="radio"
            accessibilityLabel={`${c.review}: ${value}/5`}
            accessibilityState={{ checked: value === rating }}
            style={styles.starButton}
          >
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
    borderRadius: Radius.lg,
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
  liveDot: { width: 8, height: 8, borderRadius: Radius.full },
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
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  callChipText: { ...Typography.caption, color: Colors.primaryDark, fontFamily: Fonts.bodySemi },
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
  destinationRequiredCard: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.warningSoft,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  feedbackPanel: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningSoft,
  },
  section: { ...Typography.h3, color: Colors.textPrimary },
  timeline: { padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.cardBg },
  event: { flexDirection: 'row', minHeight: 58 },
  eventRail: { width: 24, alignItems: 'center' },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    marginTop: 5,
  },
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
  incidentPanel: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  incidentCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  incidentStatus: { ...Typography.caption, color: Colors.primary, fontFamily: Fonts.bodySemi },
  stars: { flexDirection: 'row', gap: Spacing.sm },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  error: { ...Typography.body, color: Colors.error },
  smallButton: { maxWidth: 220 },
  flex: { flex: 1 },
  cancellationSummary: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
    gap: Spacing.sm,
  },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  lateCancellationText: { ...Typography.bodyBold, color: Colors.warning },
  fieldLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
  reasonList: { gap: Spacing.sm },
  reasonOption: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reasonOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.sky },
  reasonOptionText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  cancelWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningSoft,
  },
  cancelWarningText: { ...Typography.caption, color: Colors.warning, flex: 1 },
  assistedCancelCard: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningSoft,
    gap: Spacing.sm,
  },
  cancelPanel: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: Colors.errorSubtle,
    gap: Spacing.sm,
  },
});
