import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from '@/src/components/MapWrapper';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useRequest, useRoadRoute } from '@/src/features/rescue/hooks/useRescueQueries';
import { RatingBadge } from '@/src/features/rescue/components/RatingBadge';
import { subscribeToProviderLocation } from '@/src/features/rescue/services/liveLocation';
import { isLiveStatus } from '@/src/features/rescue/status';
import type { LocationPoint } from '@/src/types/rescue';
import type NativeMapView from 'react-native-maps';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    loading: 'Đang tải bản đồ ca…',
    errorTitle: 'Không thể mở bản đồ ca',
    errorBody: 'Ca không tồn tại hoặc tài khoản này không có quyền xem.',
    back: 'Quay lại',
    roadStatus: 'Tuyến đường bộ {distance} km • khoảng {minutes} phút',
    invalidRoute: 'Chưa lấy được tuyến đường giao thông hợp lệ',
    loadingRoute: 'Đang lấy tuyến đường giao thông…',
    waitingProvider: 'Đang chờ vị trí cứu hộ viên',
    pickup: 'Điểm nhận cứu hộ',
    provider: 'Cứu hộ viên',
    backDetails: 'Quay lại chi tiết ca',
    title: 'Theo dõi đội cứu hộ',
    noStraightLine: 'Không dùng đường thẳng nối hai điểm để thay thế tuyến giao thông.',
    verifiedTeam: 'Đội cứu hộ đã xác minh',
    updated: 'GPS cập nhật',
    call: 'Gọi',
  },
  en: {
    loading: 'Loading request map…',
    errorTitle: 'Could not open request map',
    errorBody: 'The request does not exist or this account cannot view it.',
    back: 'Go back',
    roadStatus: 'Road route {distance} km • about {minutes} min',
    invalidRoute: 'No valid road route is available',
    loadingRoute: 'Loading road route…',
    waitingProvider: 'Waiting for provider location',
    pickup: 'Rescue pickup',
    provider: 'Rescue provider',
    backDetails: 'Back to request details',
    title: 'Track rescue team',
    noStraightLine: 'A straight line between two points is never used as a road route.',
    verifiedTeam: 'Verified rescue team',
    updated: 'GPS updated',
    call: 'Call',
  },
} as const;

function template(value: string, params: Record<string, string | number>) {
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

function displayPhone(phone: string) {
  return phone.startsWith('+84') ? `0${phone.slice(3)}` : phone;
}

export default function RescueMapScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const requestQuery = useRequest(id);
  const request = requestQuery.data;
  const [liveLocation, setLiveLocation] = useState<LocationPoint | null>(null);
  const providerLocation = liveLocation ?? request?.providerLocation ?? null;
  const route = useRoadRoute(
    id,
    Boolean(request?.assignedProviderId && providerLocation && request && isLiveStatus(request.status)),
  );
  const mapRef = useRef<NativeMapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const c = useCopy(COPY);
  const language = useI18n((state) => state.language);

  useEffect(() => setLiveLocation(request?.providerLocation ?? null), [request?.providerLocation]);
  useEffect(() => {
    if (!request?.assignedProviderId) return;
    return subscribeToProviderLocation(id, setLiveLocation);
  }, [id, request?.assignedProviderId]);

  const region = useMemo(() => {
    if (!request) return undefined;
    if (!providerLocation) {
      return {
        latitude: request.pickupLatitude,
        longitude: request.pickupLongitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      };
    }
    return {
      latitude: (request.pickupLatitude + providerLocation.latitude) / 2,
      longitude: (request.pickupLongitude + providerLocation.longitude) / 2,
      latitudeDelta: Math.max(0.018, Math.abs(request.pickupLatitude - providerLocation.latitude) * 1.8),
      longitudeDelta: Math.max(0.018, Math.abs(request.pickupLongitude - providerLocation.longitude) * 1.8),
    };
  }, [providerLocation, request]);

  useEffect(() => {
    if (!mapReady || !request) return;
    const coordinates = route.data?.coordinates.length
      ? route.data.coordinates
      : providerLocation
        ? [providerLocation, { latitude: request.pickupLatitude, longitude: request.pickupLongitude }]
        : [{ latitude: request.pickupLatitude, longitude: request.pickupLongitude }];
    mapRef.current?.fitToCoordinates(coordinates, {
      animated: true,
      edgePadding: { top: insets.top + 82, right: 36, bottom: insets.bottom + 255, left: 36 },
    });
  }, [insets.bottom, insets.top, mapReady, providerLocation, request, route.data?.coordinates]);

  if (requestQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.muted}>{c.loading}</Text>
      </View>
    );
  }
  if (requestQuery.isError || !request) {
    return (
      <View style={styles.center}>
        <Ionicons name="map-outline" size={38} color={Colors.error} />
        <Text style={styles.errorTitle}>{c.errorTitle}</Text>
        <Text style={styles.muted}>{c.errorBody}</Text>
        <AppButton
          title={c.back}
          variant="outline"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/activity'))}
          style={styles.retry}
        />
      </View>
    );
  }

  const hasRoadRoute = Boolean(route.data?.coordinates.length);
  const routingUnavailable = request.routingStatus === 'unavailable' || route.isError;
  const mapStatus = hasRoadRoute
    ? template(c.roadStatus, {
        distance: (route.data!.distanceMeters / 1000).toFixed(1),
        minutes: Math.max(1, Math.round(route.data!.durationSeconds / 60)),
      })
    : routingUnavailable
      ? c.invalidRoute
      : providerLocation
        ? c.loadingRoute
        : c.waitingProvider;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        mapPadding={{ top: insets.top + 72, right: 28, bottom: insets.bottom + 240, left: 28 }}
        toolbarEnabled={false}
        showsMyLocationButton={false}
        loadingEnabled
        onMapReady={() => setMapReady(true)}
      >
        <Marker
          coordinate={{ latitude: request.pickupLatitude, longitude: request.pickupLongitude }}
          title={c.pickup}
          description={request.pickupAreaLabel}
          pinColor={Colors.error}
        />
        {providerLocation ? (
          <Marker
            coordinate={providerLocation}
            title={request.providerName ?? c.provider}
            description={request.providerTeamName ?? undefined}
            pinColor={Colors.primary}
          />
        ) : null}
        {hasRoadRoute ? (
          <Polyline coordinates={route.data!.coordinates} strokeColor={Colors.primary} strokeWidth={6} />
        ) : null}
      </MapView>

      <View pointerEvents="none" style={[styles.statusScrim, { height: insets.top }]} />
      <Pressable
        style={[styles.back, { top: insets.top + Spacing.sm }]}
        onPress={() => (router.canGoBack() ? router.back() : router.replace(`/rescue/${id}`))}
        accessibilityRole="button"
        accessibilityLabel={c.backDetails}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </Pressable>
      <View style={[styles.titleChip, { top: insets.top + Spacing.sm }]} pointerEvents="none">
        <Text style={styles.title}>{c.title}</Text>
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.handle} />
        <View style={styles.statusRow}>
          <Ionicons
            name={
              hasRoadRoute ? 'navigate-circle' : routingUnavailable ? 'warning-outline' : 'locate-outline'
            }
            size={26}
            color={hasRoadRoute ? Colors.success : routingUnavailable ? Colors.error : Colors.warning}
          />
          <View style={styles.flex}>
            <Text style={styles.statusText}>{mapStatus}</Text>
            <Text style={styles.caption}>{c.noStraightLine}</Text>
          </View>
        </View>
        {request.providerName ? (
          <View style={styles.providerRow}>
            <View style={styles.providerIcon}>
              <Ionicons name="person" size={22} color={Colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.providerName}>{request.providerName}</Text>
              <Text style={styles.caption}>{request.providerTeamName ?? c.verifiedTeam}</Text>
              <RatingBadge rating={request.providerRating} label={c.provider} compact />
              {providerLocation ? (
                <Text style={styles.updated}>
                  {c.updated}{' '}
                  {new Date(providerLocation.recordedAt).toLocaleTimeString(
                    language === 'en' ? 'en-US' : 'vi-VN',
                  )}
                </Text>
              ) : null}
            </View>
            {request.providerContactPhone ? (
              <Pressable
                style={styles.call}
                onPress={() => void Linking.openURL(`tel:${request.providerContactPhone}`)}
                accessibilityRole="button"
                accessibilityLabel={`${c.call} ${displayPhone(request.providerContactPhone)}`}
              >
                <Ionicons name="call" size={21} color={Colors.primaryDark} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surface },
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Colors.overlayLight },
  back: {
    position: 'absolute',
    left: Spacing.md,
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  titleChip: {
    position: 'absolute',
    left: 76,
    right: Spacing.md,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { ...Typography.bodyBold, color: Colors.textPrimary },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  handle: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: Colors.mist },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  statusText: { ...Typography.bodyBold, color: Colors.textPrimary },
  caption: { ...Typography.caption, color: Colors.textMuted },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  providerName: { ...Typography.bodyBold, color: Colors.textPrimary },
  updated: { ...Typography.caption, color: Colors.success },
  call: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  errorTitle: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center' },
  muted: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' },
  retry: { minWidth: 180 },
  flex: { flex: 1 },
});
