import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import {
  CancellationSummary,
  OperationalCancellationPanel,
} from '@/src/features/rescue/components/details/CancellationPanels';
import { CustomerRescueActions } from '@/src/features/rescue/components/details/CustomerRescueActions';
import { IncidentPanel } from '@/src/features/rescue/components/details/IncidentPanel';
import { ProviderRescueActions } from '@/src/features/rescue/components/details/ProviderRescueActions';
import { RescueMapSection } from '@/src/features/rescue/components/details/RescueMapSection';
import { RescueOverview } from '@/src/features/rescue/components/details/RescueOverview';
import { RescueQuoteCard } from '@/src/features/rescue/components/details/RescueQuoteCard';
import { RescueTimeline } from '@/src/features/rescue/components/details/RescueTimeline';
import { RescueTrackingNotice } from '@/src/features/rescue/components/details/RescueTrackingNotice';
import { ReviewPanel } from '@/src/features/rescue/components/details/ReviewPanel';
import { useRescueDetailsCopy } from '@/src/features/rescue/components/details/rescueDetailsCopy';
import { rescueDetailsStyles as styles } from '@/src/features/rescue/components/details/rescueDetailsStyles';
import { useDispatchRetry, useSupportAction } from '@/src/features/rescue/hooks/useRescueActions';
import { useRescuePermissions } from '@/src/features/rescue/hooks/useRescuePermissions';
import { useProviderTracking } from '@/src/features/rescue/hooks/useProviderTracking';
import { useRequest, useRoadRoute } from '@/src/features/rescue/hooks/useRescueQueries';
import { useRescueRealtime } from '@/src/features/rescue/hooks/useRescueRealtime';
import { rescueMapRegion } from '@/src/features/rescue/services/rescueDetailsPolicy';
import { isLiveStatus } from '@/src/features/rescue/status';
import { useAuthStore } from '@/src/stores/authStore';

const SUPPORT_HOTLINE = String(Constants.expoConfig?.extra?.supportHotline ?? '').replace(/[^+\d]/g, '');

export default function RescueDetailsScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((state) => state.profile);
  const requestQuery = useRequest(id);
  const request = requestQuery.data;
  const role = profile?.role ?? 'customer';
  const permissions = useRescuePermissions(role, profile?.id, request);
  const providerLocation = useRescueRealtime(id, request?.assignedProviderId, request?.providerLocation);
  const tracking = useProviderTracking(
    id,
    Boolean(permissions.isAssignedProvider && request && isLiveStatus(request.status)),
  );
  const route = useRoadRoute(
    id,
    Boolean(request?.assignedProviderId && providerLocation && request && isLiveStatus(request.status)),
  );
  const dispatchRetry = useDispatchRetry(id, role, request?.status, requestQuery.refetch);
  const support = useSupportAction(id);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);
  const c = useRescueDetailsCopy();
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

  return (
    <View style={styles.screen}>
      <RescueMapSection
        request={request}
        providerLocation={providerLocation}
        route={route.data}
        region={region}
        insetTop={insets.top}
      />

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
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
        />
        {permissions.isAssignedProvider ? <RescueTrackingNotice state={tracking} /> : null}
        {request.currentQuote ? <RescueQuoteCard quote={request.currentQuote} /> : null}
        {request.status === 'cancelled' ? <CancellationSummary request={request} role={role} /> : null}
        {permissions.showReview ? <ReviewPanel request={request} /> : null}
        {permissions.showIncident ? <IncidentPanel request={request} role={role} /> : null}
        {permissions.showCustomerActions ? <CustomerRescueActions request={request} /> : null}
        {permissions.showProviderActions ? <ProviderRescueActions request={request} /> : null}
        {permissions.isAssignedProvider ? (
          <OperationalCancellationPanel
            request={request}
            actorLabel={c.provider}
            reasonCode="provider_unavailable"
            providerWithdrawal
          />
        ) : null}
        {permissions.isStaff ? (
          <OperationalCancellationPanel request={request} actorLabel={c.dispatcher} reasonCode="other" />
        ) : null}
        {permissions.showStaffRetry ? (
          <AppButton title={c.retry} loading={dispatchRetry.isPending} onPress={() => void retryDispatch()} />
        ) : null}
        <RescueTimeline events={request.events} />
      </ScrollView>
    </View>
  );
}
