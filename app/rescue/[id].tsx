import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { useI18n } from '@/src/i18n';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import {
  RescueJourney,
  JourneyTimeline,
  journeyStyles,
} from '@/src/features/rescue/components/details/RescueJourney';
import { ApiClientError } from '@/src/features/rescue/api/client';
import {
  CancellationSummary,
  OperationalCancellationPanel,
} from '@/src/features/rescue/components/details/CancellationPanels';
import { CustomerRescueActions } from '@/src/features/rescue/components/details/CustomerRescueActions';
import { ProviderRescueActions } from '@/src/features/rescue/components/details/ProviderRescueActions';
import { OperatorCompletionPanel } from '@/src/features/rescue/components/details/OperatorCompletionPanel';
import { RescueMapSection } from '@/src/features/rescue/components/details/RescueMapSection';
import { RescueOverview } from '@/src/features/rescue/components/details/RescueOverview';
import { useRescueDetailsCopy } from '@/src/features/rescue/components/details/rescueDetailsCopy';
import { rescueDetailsStyles as styles } from '@/src/features/rescue/components/details/rescueDetailsStyles';
import { useDispatchRetry, useSupportAction } from '@/src/features/rescue/hooks/useRescueActions';
import { useRescuePermissions } from '@/src/features/rescue/hooks/useRescuePermissions';
import { useRequest, useRoadRoute } from '@/src/features/rescue/hooks/useRescueQueries';
import { rescueMapRegion } from '@/src/features/rescue/services/rescueDetailsPolicy';
import { isLiveStatus } from '@/src/features/rescue/status';
import { useAuthStore } from '@/src/stores/authStore';

const SUPPORT_HOTLINE = String(Constants.expoConfig?.extra?.supportHotline ?? '').replace(/[^+\d]/g, '');

export default function RescueDetailsScreen() {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const requestQuery = useRequest(id);
  const request = requestQuery.data;
  const role = profile?.role ?? 'customer';
  const permissions = useRescuePermissions(role, profile?.id, request);
  const providerLocation = request?.providerLocation ?? null;
  const route = useRoadRoute(
    id,
    Boolean(request?.assignedProviderId && providerLocation && request && isLiveStatus(request.status)),
    request?.assignedProviderId,
    providerLocation?.recordedAt,
  );
  const dispatchRetry = useDispatchRetry(id, role, request?.status, requestQuery.refetch);
  const support = useSupportAction(id);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const c = useRescueDetailsCopy();
  const en = useI18n((s) => s.language === 'en');
  const region = useMemo(() => rescueMapRegion(request, providerLocation), [providerLocation, request]);

  const retryDispatch = async () => {
    setScreenMessage(null);
    try {
      await dispatchRetry.mutateAsync();
    } catch (error) {
      setScreenMessage(error instanceof ApiClientError ? error.message : c.retryError);
    }
  };

  const requestDispatchSupport = async () => {
    setScreenMessage(null);
    try {
      await support.mutateAsync('no_provider');
      setScreenMessage(c.supportRequested);
    } catch (error) {
      setScreenMessage(error instanceof ApiClientError ? error.message : c.supportError);
    }
  };

  if (requestQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
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

  const closed = ['completed', 'cancelled', 'no_provider'].includes(request.status);
  const contact = !closed
    ? role === 'customer'
      ? request.providerContactPhone
      : role === 'provider'
        ? request.customerContactPhone
        : null
    : null;
  const footerTitle = permissions.showReview
    ? request.review
      ? c.editReview
      : c.review
    : contact
      ? role === 'provider'
        ? en
          ? 'Call customer'
          : 'Gọi khách hàng'
        : en
          ? 'Call rescue provider'
          : 'Gọi cứu hộ viên'
      : closed
        ? en
          ? 'Return home'
          : 'Về trang chủ'
        : null;
  const footerAction = () => {
    if (permissions.showReview) router.push(`/rescue/${id}/review`);
    else if (contact)
      void Linking.openURL(`tel:${contact}`).catch(() =>
        setScreenMessage(en ? 'Could not open the phone app.' : 'Không thể mở ứng dụng gọi điện.'),
      );
    else router.replace('/(tabs)');
  };
  const priorityActions =
    permissions.showProviderActions ||
    (permissions.showCustomerActions && request.status === 'awaiting_quote');
  const caseActions =
    (permissions.showCustomerActions && !['completed', 'cancelled'].includes(request.status)) ||
    (permissions.showProviderActions && !closed) ? (
      <View style={journeyStyles.card}>
        <Text style={journeyStyles.section}>{en ? 'Case actions' : 'Xử lý ca'}</Text>
        {permissions.showCustomerActions && request.status === 'awaiting_quote' && request.currentQuote ? (
          <>
            <Text style={journeyStyles.body}>{request.currentQuote.description}</Text>
            <Text style={journeyStyles.metricValue}>
              {request.currentQuote.amountVnd.toLocaleString(en ? 'en-US' : 'vi-VN')} đ
            </Text>
          </>
        ) : null}
        {permissions.showCustomerActions ? <CustomerRescueActions request={request} /> : null}
        {permissions.showProviderActions ? <ProviderRescueActions request={request} compact /> : null}
      </View>
    ) : null;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[trackingStyles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={trackingStyles.back}
          accessibilityRole="button"
          accessibilityLabel={c.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/activity'))}
        >
          <Ionicons name="chevron-back" size={23} color={Colors.textPrimary} />
        </Pressable>
        <Text accessibilityRole="header" style={trackingStyles.headerTitle}>
          {en ? 'Rescue progress' : 'Theo dõi cứu hộ'}
        </Text>
        <View style={trackingStyles.backSpace} />
      </View>
      <ScrollView
        contentContainerStyle={[
          trackingStyles.content,
          { paddingBottom: footerTitle ? 24 : insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <RescueJourney request={request} role={role} />
        {priorityActions ? caseActions : null}
        {screenMessage ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {screenMessage}
          </Text>
        ) : null}
        <RescueOverview
          request={request}
          role={role}
          showAttention={permissions.showAttention}
          supportHotline={SUPPORT_HOTLINE}
          retryingDispatch={dispatchRetry.isPending}
          requestingSupport={support.isPending}
          onRetryDispatch={() => void retryDispatch()}
          onRequestSupport={() => void requestDispatchSupport()}
          compact
        />
        {request.currentQuote ? (
          <NavigationCard
            title={en ? 'View quote' : 'Xem chi tiết báo giá'}
            description={`${request.currentQuote.amountVnd.toLocaleString(en ? 'en-US' : 'vi-VN')} VND`}
            icon="receipt-outline"
            onPress={() => router.push(`/rescue/${id}/quote` as Href)}
          />
        ) : null}
        {request.status === 'cancelled' ? <CancellationSummary request={request} role={role} /> : null}
        {permissions.showReview && !footerTitle ? (
          <NavigationCard
            title={request.review ? c.editReview : c.review}
            description={en ? 'Optional — you may skip this.' : 'Không bắt buộc — bạn có thể bỏ qua.'}
            icon="star-outline"
            onPress={() => router.push(`/rescue/${id}/review` as Href)}
          />
        ) : null}
        {permissions.showIncident ? (
          <NavigationCard
            title={c.incidentTitle}
            icon="flag-outline"
            onPress={() => router.push(`/rescue/${id}/incidents` as Href)}
          />
        ) : null}
        <JourneyTimeline request={request} onOpen={() => router.push(`/rescue/${id}/timeline` as Href)} />
        {!priorityActions ? caseActions : null}
        <View style={journeyStyles.card}>
          <View style={journeyStyles.metaRow}>
            <Text style={journeyStyles.section}>{en ? 'Meeting point' : 'Điểm cứu hộ'}</Text>
            <Pressable
              style={journeyStyles.more}
              accessibilityRole="button"
              accessibilityLabel={en ? 'Full map' : 'Mở bản đồ'}
              onPress={() => router.push(`/rescue/${id}/map`)}
            >
              <Text style={journeyStyles.moreText}>{en ? 'Full map' : 'Mở bản đồ'}</Text>
            </Pressable>
          </View>
          <Text style={journeyStyles.body}>{request.pickupAreaLabel}</Text>
          <RescueMapSection
            request={request}
            providerLocation={providerLocation}
            route={route.data}
            region={region}
            insetTop={0}
            embedded
          />
        </View>
        {permissions.isAssignedProvider ? (
          <OperationalCancellationPanel
            request={request}
            actorLabel={c.provider}
            reasonCode="provider_unavailable"
            providerWithdrawal
          />
        ) : null}
        {permissions.isStaff ? <OperatorCompletionPanel request={request} /> : null}
        {permissions.isStaff ? (
          <OperationalCancellationPanel request={request} actorLabel={c.admin} reasonCode="other" />
        ) : null}
        {permissions.showStaffRetry ? (
          <AppButton title={c.retry} loading={dispatchRetry.isPending} onPress={() => void retryDispatch()} />
        ) : null}
      </ScrollView>
      {footerTitle && (
        <View style={[trackingStyles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <AppButton title={footerTitle} onPress={footerAction} />
          {permissions.showReview && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={en ? 'Skip for now' : 'Để sau'}
              style={trackingStyles.skip}
              onPress={() => router.replace('/(tabs)/activity')}
            >
              <Text style={journeyStyles.moreText}>{en ? 'Skip for now' : 'Để sau'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const trackingStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpace: { width: 44 },
  headerTitle: { ...Typography.h3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.cardBg,
    gap: 4,
  },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
