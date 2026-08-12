import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Linking, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { DayCard } from '@/src/components/molecules/DayCard';
import { Badge } from '@/src/components/atoms/Badge';
import { AppButton } from '@/src/components/atoms/AppButton';

import { useItineraryDetails, useDeleteItinerary, useEnableItinerarySharing } from '@/src/hooks/useItineraries';
import { buildGoogleMapsDirectionsUrl, fetchRoadRoute, Coordinate } from '@/src/utils/mapUtils';
import { MapView, Marker, Polyline, PROVIDER_GOOGLE } from '@/src/components/MapWrapper';
import { useAuthStore } from '@/src/stores/authStore';
import { useItineraryStore } from '@/src/stores/itineraryStore';
import { formatDateVi } from '@/src/features/itinerary/services/routeOptimizer';
import { AdviceCard } from '@/src/features/itinerary/components/AdviceCard';
import { Place } from '@/src/types/place';
import { isProfileVipActive } from '@/src/features/vip/api/subscriptions';
import { StatusBar } from 'expo-status-bar';
import type { TransportMode } from '@/src/types/domain';
import { DA_NANG_CENTER } from '@/src/features/location/config/danang';

// Màu badge theo điểm thời tiết (GĐ 6)
function scoreColor(score: number): string {
  if (score >= 75) return Colors.accent;   // xanh — lý tưởng
  if (score >= 50) return Colors.primary;  // xanh đậm — ổn
  return Colors.error;                       // đỏ — nên tránh
}

function transportIcon(transport?: TransportMode): React.ComponentProps<typeof Ionicons>['name'] {
  if (transport === 'walk') return 'walk-outline';
  if (transport === 'bicycle') return 'bicycle-outline';
  if (transport === 'motorbike') return 'navigate-outline';
  return 'car-outline';
}

export default function ItineraryDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuthStore();
  const userId = user?.id;

  const { data: itinerary, isLoading, error } = useItineraryDetails(id);
  const deleteMutation = useDeleteItinerary();
  const enableSharingMutation = useEnableItinerarySharing();

  const { prefillDraft } = useItineraryStore();

  const [showMap, setShowMap] = useState(false);
  const [osrmCoordinates, setOsrmCoordinates] = useState<Coordinate[]>([]);
  const [mapRouteStatus, setMapRouteStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [mapRouteMessage, setMapRouteMessage] = useState('');
  const mapRequestRef = useRef(0);
  const itineraryMapRef = useRef<MapView>(null);
  const [focusedCoordinate, setFocusedCoordinate] = useState<Coordinate | null>(null);
  const [mapDayIndex, setMapDayIndex] = useState(0);

  const isOwner = Boolean(itinerary && userId && itinerary.user_id === userId);
  const isVip = isProfileVipActive(profile);

  const openItineraryMap = (dayIndex = 0, coordinate?: Coordinate) => {
    if (!isVip) {
      Alert.alert(
        'Bản đồ lịch trình dành cho VIP',
        'Bạn vẫn có thể xem thứ tự và thời gian dạng danh sách. Nâng cấp VIP để xem tuyến tương tác và tối ưu đường đi.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xem gói VIP', onPress: () => router.push('/vip/upgrade') },
        ]
      );
      return;
    }
    setMapDayIndex(dayIndex);
    setFocusedCoordinate(coordinate ?? null);
    setOsrmCoordinates([]);
    setMapRouteStatus('idle');
    setMapRouteMessage('');
    setShowMap(true);
  };

  const routeCoordinates = useMemo(() => (itinerary?.itinerary_days?.[mapDayIndex]?.itinerary_slots ?? [])
    .filter(s => Number.isFinite(s.places?.lat) && Number.isFinite(s.places?.lng))
    .map(s => ({ latitude: s.places!.lat, longitude: s.places!.lng })), [itinerary?.itinerary_days, mapDayIndex]);

  useEffect(() => {
    if (!showMap) return;
    const requestId = ++mapRequestRef.current;
    if (routeCoordinates.length < 2) {
      setMapRouteStatus('unavailable');
      setMapRouteMessage('Cần ít nhất hai địa điểm có tọa độ hợp lệ.');
      return;
    }
    setMapRouteStatus('loading');
    setOsrmCoordinates([]);
    void fetchRoadRoute(routeCoordinates, (itinerary?.transport as 'motorbike' | 'car' | 'walk' | 'bicycle') || 'motorbike').then((result) => {
      if (requestId !== mapRequestRef.current) return;
      if (result.ok) {
        setOsrmCoordinates(result.route.coordinates);
        setMapRouteStatus('ready');
      } else {
        setMapRouteStatus('unavailable');
        setMapRouteMessage(result.message);
      }
    });
    return () => { mapRequestRef.current += 1; };
  }, [itinerary?.transport, routeCoordinates, showMap]);

  const fitItineraryMap = useCallback(() => {
    if (focusedCoordinate) {
      itineraryMapRef.current?.animateToRegion({ ...focusedCoordinate, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 300);
      return;
    }
    const coordinates = osrmCoordinates.length >= 2 ? osrmCoordinates : routeCoordinates;
    if (coordinates.length >= 2) {
      itineraryMapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 72, right: 48, bottom: 96, left: 48 },
        animated: true,
      });
    }
  }, [focusedCoordinate, osrmCoordinates, routeCoordinates]);

  useEffect(() => {
    if (showMap) fitItineraryMap();
  }, [fitItineraryMap, showMap]);

  const openGoogleMapsDirections = () => {
    if (!itinerary) return;
    const url = buildGoogleMapsDirectionsUrl(routeCoordinates, itinerary.transport);
    if (!url) return;
    const open = () => void Linking.openURL(url);
    if (routeCoordinates.length > 5) {
      Alert.alert(
        'Nhiều điểm trung gian',
        'Google Maps trên một số thiết bị có thể giới hạn số waypoint. Bản đồ trong ứng dụng vẫn giữ đầy đủ các điểm và đúng thứ tự.',
        [{ text: 'Hủy', style: 'cancel' }, { text: 'Vẫn mở', onPress: open }],
      );
      return;
    }
    open();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !itinerary) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="dark" translucent backgroundColor="transparent" />
        <Text style={{ color: Colors.error }}>Không thể tải lịch trình</Text>
        <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>{error ? (error as any).message : 'Lịch trình không tồn tại'}</Text>
        <AppButton title="Quay lại" onPress={() => router.back()} style={{ marginTop: Spacing.md }} fullWidth={false} />
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert('Xóa lịch trình', 'Bạn có chắc chắn muốn xóa lịch trình này không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await deleteMutation.mutateAsync(id);
          router.back();
        } catch (e: any) {
          Alert.alert('Lỗi', 'Không thể xóa: ' + e.message);
        }
      }}
    ]);
  };

  const openPlannerFromItinerary = (mode: 'edit' | 'clone') => {
    const dayPlans: Place[][] = [];
    const selectedPlaces: Place[] = [];
    const slotOverrides: Record<string, { startTime: string; durationMin: number }> = {};
    const unavailablePlaceNames: string[] = [];
    let realSlotCount = 0;
    itinerary.itinerary_days?.forEach(d => {
      const realSlots = (d.itinerary_slots || []).filter((slot) => !slot.is_meal);
      realSlotCount += realSlots.length;
      realSlots.filter((slot) => !slot.places).forEach((slot) => {
        unavailablePlaceNames.push(slot.place_name || 'Địa điểm không còn khả dụng');
      });
      const daySlots = realSlots
        .filter((slot) => slot.places)
        .map((slot) => {
          const place = slot.places as Place;
          slotOverrides[place.id] = { startTime: slot.start_time, durationMin: slot.duration_min };
          return place;
        });
      dayPlans.push(daySlots);
      daySlots.forEach(p => {
        if (!selectedPlaces.find(sp => sp.id === p.id)) selectedPlaces.push(p);
      });
    });

    if (unavailablePlaceNames.length > 0) {
      Alert.alert(
        mode === 'edit' ? 'Chưa thể sửa lịch trình' : 'Chưa thể nhân bản',
        `Có ${unavailablePlaceNames.length} địa điểm không còn khả dụng: ${unavailablePlaceNames.slice(0, 3).join(', ')}${unavailablePlaceNames.length > 3 ? '…' : ''}. Lịch cũ vẫn xem được, nhưng chỉ có thể sửa hoặc nhân bản sau khi các địa điểm này được xuất bản lại.`,
      );
      return;
    }
    if (realSlotCount !== selectedPlaces.length) {
      Alert.alert(
        mode === 'edit' ? 'Chưa thể sửa lịch trình' : 'Chưa thể nhân bản',
        'Lịch sử này có địa điểm bị lặp. Hãy tạo lịch trình mới để tránh xung đột dữ liệu.',
      );
      return;
    }

    prefillDraft({
      title: mode === 'clone' ? `${itinerary.title} (bản sao)` : itinerary.title,
      numDays: itinerary.num_days,
      // Bản sao là một chuyến đi mới: bắt buộc người dùng chủ động chọn ngày,
      // không mang dự báo/thời điểm có thể đã quá hạn từ lịch nguồn.
      startDate: mode === 'clone' ? '' : itinerary.start_date || '',
      numPeople: itinerary.num_people,
      transport: itinerary.transport,
      travelStyles: itinerary.travel_style ?? [],
      selectedPlaces,
    }, dayPlans, {
      editId: mode === 'edit' ? id : undefined,
      expectedUpdatedAt: mode === 'edit' ? itinerary.updated_at : undefined,
      slotOverrides: mode === 'edit' ? slotOverrides : undefined,
    });
    router.push('/(tabs)/create');
  };

  const handleEdit = () => openPlannerFromItinerary('edit');

  const handleClone = () => {
    if (!userId) {
      Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để nhân bản lịch trình này.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    openPlannerFromItinerary('clone');
  };

  const handleOpenGroupVote = async () => {
    if (!isOwner || !userId) {
      Alert.alert('Chỉ chủ sở hữu', 'Chỉ chủ sở hữu lịch trình mới có thể mở phiên bình chọn.');
      return;
    }
    try {
      const shared = await enableSharingMutation.mutateAsync({ itineraryId: id, userId });
      router.push(`/itinerary/share/${shared.share_token}`);
    } catch (e: any) {
      Alert.alert('Không thể chia sẻ', e?.message ?? 'Vui lòng thử lại sau.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroContainer}>
          <Image
            source={itinerary.cover_image_url ? { uri: itinerary.cover_image_url } : require('@/assets/icon.png')}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.overlay}>
          <View style={[styles.floatingHeader, { paddingTop: insets.top + Spacing.sm }]}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </TouchableOpacity>

              <View style={styles.headerRight}>
                {isOwner && (
                  <TouchableOpacity onPress={handleOpenGroupVote} disabled={enableSharingMutation.isPending} style={styles.iconBtn}>
                    <Ionicons name="people" size={24} color={Colors.white} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.heroTextContainer}>
              <Badge label={`${itinerary.num_days} ngày`} variant="lime" />
              <Text style={[Typography.display, styles.title]}>{itinerary.title}</Text>
              <Text style={[Typography.body, { color: Colors.surface }]}>
                {isOwner ? 'Lịch trình của bạn' : `Tạo bởi ${itinerary.author_name || 'Du khách'}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Ionicons name="map-outline" size={24} color={Colors.primary} />
              <Text style={[Typography.caption, { color: Colors.secondary, marginTop: 4 }]}>Di chuyển</Text>
              <Text style={[Typography.bodyBold, { color: Colors.primary }]}>
                {itinerary.transport || 'Tự túc'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="people-outline" size={24} color={Colors.primary} />
              <Text style={[Typography.caption, { color: Colors.secondary, marginTop: 4 }]}>Số người</Text>
              <Text style={[Typography.bodyBold, { color: Colors.primary }]}>
                {itinerary.num_people || 1} người
              </Text>
            </View>
          </View>

          <Text style={[Typography.h2, { color: Colors.primary, marginBottom: Spacing.md }]}>
            Lịch trình chi tiết
          </Text>

          {itinerary.itinerary_days?.map((day, dayIndex) => {
            const dateStr = day.date ? formatDateVi(day.date) : undefined;

            return (
              <DayCard
                key={day.id}
                dayNumber={day.day_number}
                title={`Ngày ${day.day_number}`}
                date={dateStr}
                placeCount={day.itinerary_slots?.length || 0}
                defaultExpanded={day.day_number === 1}
              >
                {/* GĐ 6: tóm tắt thời tiết ngày (nếu đã lưu) */}
                {(day.weather_summary || day.weather_score != null) && (
                  <View style={styles.dayWeatherRow}>
                    <Text style={styles.dayWeatherText} numberOfLines={1}>
                      {day.weather_summary || 'Thời tiết đã lưu'}
                    </Text>
                    {day.weather_score != null && (
                      <View style={styles.dayScorePill}>
                        <Text style={styles.dayScorePillText}>{day.weather_score}đ</Text>
                      </View>
                    )}
                  </View>
                )}

                {day.itinerary_slots?.map((slot, idx) => (
                  <View key={slot.id} style={styles.timelineItem}>
                    <Text style={[Typography.label, { color: Colors.accent, width: 50 }]}>{slot.start_time || '--:--'}</Text>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[Typography.bodyBold, { color: Colors.textPrimary }]} numberOfLines={2}>
                            {slot.is_meal ? '🍜 ' : (slot.is_indoor ? '🏛️ ' : '')}{slot.place_name}
                          </Text>
                          {/* GĐ 6: điểm & ghi chú thời tiết theo giờ thực */}
                          {slot.weather_score != null && !slot.is_meal && (
                            <View style={styles.slotWeatherRow}>
                              <View style={[styles.slotScoreBadge, { backgroundColor: scoreColor(slot.weather_score) }]}>
                                <Text style={styles.slotScoreText}>{slot.weather_score}đ</Text>
                              </View>
                              {slot.weather_note ? (
                                <Text style={styles.slotWeatherNote} numberOfLines={1}>{slot.weather_note}</Text>
                              ) : null}
                            </View>
                          )}
                          {slot.travel_time_min ? (
                            <Text style={[Typography.caption, { color: Colors.secondary, marginTop: 4 }]}>
                              <Ionicons name={transportIcon(slot.transport_mode || itinerary.transport)} size={14} /> Di chuyển ~{slot.travel_time_min} phút
                            </Text>
                          ) : null}
                        </View>

                        {slot.places?.lat && slot.places?.lng && (
                          <TouchableOpacity
                            style={styles.navigateBtn}
                            onPress={() => openItineraryMap(dayIndex, { latitude: slot.places!.lat, longitude: slot.places!.lng })}
                            accessibilityLabel={`Xem ${slot.place_name} trên bản đồ trong ứng dụng`}
                          >
                            <Ionicons name="navigate-circle" size={32} color={Colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))}

                {/* GĐ 6: lời khuyên đã lưu (chỉ đọc) */}
                {Array.isArray(day.advice) && day.advice.length > 0 && (
                  <View style={styles.dayAdviceBox}>
                    <Text style={styles.dayAdviceTitle}>💡 Lời khuyên</Text>
                    {day.advice.map((a: any, i: number) => (
                      <AdviceCard key={a.id ?? i} advice={a} readOnly />
                    ))}
                  </View>
                )}
              </DayCard>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB to open Map */}
      <TouchableOpacity style={[styles.fabMap, { bottom: 78 + Math.max(insets.bottom, Spacing.md) }]} onPress={() => openItineraryMap(0)}>
        <Ionicons name="map" size={24} color={Colors.white} />
        <Text style={{ color: Colors.white, marginLeft: 8, fontWeight: '600' }}>Bản đồ</Text>
      </TouchableOpacity>

      {/* Map Modal */}
      <Modal visible={showMap} animationType="slide" statusBarTranslucent onRequestClose={() => setShowMap(false)}>
        {showMap ? <StatusBar style="dark" translucent backgroundColor="transparent" /> : null}
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bản đồ ngày {mapDayIndex + 1}</Text>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity
                style={styles.modalIconButton}
                onPress={openGoogleMapsDirections}
                accessibilityRole="button"
                accessibilityLabel="Mở tuyến ngày này trong Google Maps"
              >
                <Ionicons name="open-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalIconButton}
                onPress={() => setShowMap(false)}
                accessibilityRole="button"
                accessibilityLabel="Đóng bản đồ"
              >
                <Ionicons name="close" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <MapView
            ref={itineraryMapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={
              (focusedCoordinate ?? routeCoordinates[0])
                ? { ...(focusedCoordinate ?? routeCoordinates[0]), latitudeDelta: focusedCoordinate ? 0.02 : 0.1, longitudeDelta: focusedCoordinate ? 0.02 : 0.1 }
                : { ...DA_NANG_CENTER, latitudeDelta: 0.1, longitudeDelta: 0.1 }
            }
            onMapReady={fitItineraryMap}
          >
            {mapRouteStatus === 'ready' && osrmCoordinates.length >= 2 && (
              <Polyline
                coordinates={osrmCoordinates}
                strokeColor={Colors.primary}
                strokeWidth={4}
              />
            )}
            {itinerary.itinerary_days?.[mapDayIndex]?.itinerary_slots?.map((slot, index) => {
                const place = slot.places;
                if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return null;
                return (
                  <Marker
                    key={slot.id}
                    coordinate={{ latitude: place.lat, longitude: place.lng }}
                    title={slot.place_name}
                    description={`Ngày ${mapDayIndex + 1} - ${slot.start_time || ''}`}
                  >
                    <View style={styles.markerView}>
                      <Text style={styles.markerText}>{index + 1}</Text>
                    </View>
                  </Marker>
                );
              })}
          </MapView>
          {mapRouteStatus === 'loading' && (
            <View style={styles.mapRouteNotice} pointerEvents="none">
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.mapRouteNoticeText}>Đang tải tuyến đường thực tế…</Text>
            </View>
          )}
          {mapRouteStatus === 'unavailable' && (
            <View style={[styles.mapRouteNotice, styles.mapRouteWarning]} pointerEvents="none">
              <Ionicons name="warning-outline" size={18} color={Colors.error} />
              <Text style={styles.mapRouteWarningText}>{mapRouteMessage || 'Không lấy được tuyến đường thực tế. Ứng dụng không hiển thị đường nối ước tính.'}</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        {isOwner ? (
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <AppButton
              title="Chỉnh sửa"
              onPress={handleEdit}
              style={{ flex: 1 }}
              variant="outline"
            />
            <AppButton
              title="Xóa"
              onPress={handleDelete}
              style={{ flex: 1, backgroundColor: Colors.error }}
            />
          </View>
        ) : userId ? (
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <AppButton
              title="Nhân bản"
              onPress={handleClone}
              style={{ flex: 1 }}
              variant="outline"
            />
            {isVip && <AppButton
              title="Mở Google Maps"
              onPress={openGoogleMapsDirections}
              style={{ flex: 1 }}
            />}
          </View>
        ) : (
          <AppButton title="Đăng nhập để lưu lịch" onPress={() => router.push('/(auth)/login')} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  heroContainer: {
    height: 300,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 68, 37, 0.5)',
    justifyContent: 'space-between',
  },
  floatingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 68, 37, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    padding: Spacing.xl,
  },
  title: {
    color: Colors.white,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  content: {
    padding: Spacing.md,
    marginTop: -20,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    backgroundColor: Colors.white,
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    marginTop: 4,
    marginRight: Spacing.md,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  navigateBtn: {
    marginLeft: Spacing.sm,
    padding: 4,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  fabMap: {
    position: 'absolute',
    right: Spacing.lg,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    backgroundColor: Colors.cardBg,
  },
  modalTitle: { ...Typography.h3, color: Colors.primary },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  modalIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  markerView: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white,
  },
  markerText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  mapRouteNotice: {
    position: 'absolute', top: 76, left: Spacing.md, right: Spacing.md,
    minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  mapRouteWarning: { alignItems: 'flex-start', borderWidth: 1, borderColor: Colors.error },
  mapRouteNoticeText: { ...Typography.caption, color: Colors.primary },
  mapRouteWarningText: { ...Typography.caption, color: Colors.error, flex: 1 },
  // ─── GĐ 6: thời tiết & lời khuyên đã lưu ───
  dayWeatherRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dayWeatherText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, fontSize: 13 },
  dayScorePill: {
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  dayScorePillText: { ...Typography.caption, color: Colors.textOnAccent, fontWeight: '700', fontSize: 11 },
  slotWeatherRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  slotScoreBadge: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  slotScoreText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  slotWeatherNote: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11, flex: 1 },
  dayAdviceBox: { marginTop: Spacing.sm },
  dayAdviceTitle: { ...Typography.label, color: Colors.primary, marginBottom: Spacing.sm },
});
