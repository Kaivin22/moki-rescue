import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useItineraryStore } from '@/src/stores/itineraryStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useSaveItinerary } from '@/src/hooks/useItineraries';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SceneBackground } from '@/src/components/atoms/SceneBackground';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { RouteNode } from '@/src/components/molecules/RouteNode';
import { SegmentedControl } from '@/src/components/atoms/SegmentedControl';
import {
  optimizeItinerary, scheduleDay, geoCluster, formatDateVi, toTimeStr,
  advise, ItineraryDay, Advice, OptimizerWeights, OptimizerResult, DEFAULT_WEIGHTS, transportLabel,
} from '@/src/features/itinerary/services/routeOptimizer';
import { fetchWeatherForecast, WeatherDay } from '@/src/services/weatherService';
import { useInfinitePlaces, useInfiniteSavedPlaces } from '@/src/hooks/usePlaces';
import { useTranslation } from '@/src/i18n';
import { fetchRoadRoute } from '@/src/utils/mapUtils';
import { Place } from '@/src/types/place';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatLocalDate, parseLocalDate, todayInTimeZone } from '@/src/utils/localDate';

import { TimeEditModal, TimeEditValue } from '@/src/features/itinerary/components/TimeEditModal';
import { PlaceSelectorModal } from '@/src/features/itinerary/components/PlaceSelectorModal';
import { MapPreviewModal } from '@/src/features/itinerary/components/MapPreviewModal';
import { WeatherTimeline } from '@/src/features/itinerary/components/WeatherTimeline';
import { PlanningProgress, StepTransition } from '@/src/features/itinerary/components/PlanningProgress';
import { AdviceCard } from '@/src/features/itinerary/components/AdviceCard';
import { OptimizePanel, OptimizeMetrics } from '@/src/features/itinerary/components/OptimizePanel';
import { optimizeVipRoute, reviewOptimizedItinerary } from '@/src/features/ai/services/gemini';
import { PLANNING_RULES } from '@/src/features/itinerary/config/planningRules';
import { TRANSPORT_OPTIONS, TRAVEL_STYLE_OPTIONS } from '@/src/features/itinerary/config/planningOptions';
import { isProfileVipActive } from '@/src/features/vip/api/subscriptions';
import { validateSlotEdit } from '@/src/features/itinerary/services/slotValidation';
import {
  PLANNING_LIMITS,
  estimateRequiredDays,
  validateItineraryDraft,
} from '@/src/features/itinerary/config/planningPolicy';

// ─── Constants ────────────────────────────────────────────────────────────────
function optimizerMetrics(result: OptimizerResult): OptimizeMetrics {
  const scores: number[] = [];
  result.days.forEach((day) => day.places.forEach((slot) => {
    if (slot.weatherScore !== undefined) scores.push(slot.weatherScore);
  }));
  return {
    distanceKm: Math.round(result.totalDistanceKm),
    weatherScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    totalTimeMin: Math.round(result.totalTravelTime),
  };
}

function combinedRoutingStatus(statuses: OptimizerResult['routingStatus'][]): OptimizerResult['routingStatus'] {
  const routed = statuses.filter((status) => status !== 'not_needed');
  if (routed.length === 0) return 'not_needed';
  if (routed.every((status) => status === 'road')) return 'road';
  if (routed.every((status) => status === 'estimated')) return 'estimated';
  return 'mixed';
}

function smartPlanSignature(
  days: Place[][],
  transport: string,
  startDate: string,
  numDays: number,
  overrides: Record<string, { startTime: string; durationMin: number }>,
  weights: OptimizerWeights,
): string {
  return JSON.stringify({
    days: days.map((day) => day.map((place) => place.id)),
    transport,
    startDate,
    numDays,
    overrides: Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b)),
    weights,
  });
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateItineraryScreen() {
  const insets = useSafeAreaInsets();
  const {
    draft, editId, expectedUpdatedAt, preloadedDayPlans, preloadedSlotOverrides,
    draftSessionId, setDraftField, addPlaceToDraft, removePlaceFromDraft, reorderPlaces, reset,
  } = useItineraryStore();
  const { profile, user, isHydrated, isLoading: authLoading } = useAuthStore();
  const saveItinerary = useSaveItinerary();
  const { t, language } = useTranslation();

  // Step state
  const [step, setStep] = useState(1);

  // Step 1 state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const selectedStyles = draft.travelStyles;

  // Step 2 state
  const manualPlaces = draft.selectedPlaces;
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [placeTab, setPlaceTab] = useState<'all' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Step 3 state — dayPlans thay thế optimizedDays để giữ thứ tự người dùng
  const [dayPlans, setDayPlans] = useState<Place[][]>(() => preloadedDayPlans?.map((day) => [...day]) ?? []);
  const [optimizing, setOptimizing] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherDay[] | null>(null);
  const [weatherContextKey, setWeatherContextKey] = useState('');
  const [appliedSmartPlanSignature, setAppliedSmartPlanSignature] = useState<string | null>(null);
  const [timeEditVisible, setTimeEditVisible] = useState(false);
  const [timeEditTarget, setTimeEditTarget] = useState({ placeId: '', dayIndex: 0, slotIndex: 0, startTime: '08:00', durationMin: 60 });
  const [slotOverrides, setSlotOverrides] = useState<Record<string, { startTime: string; durationMin: number }>>(
    () => ({ ...(preloadedSlotOverrides ?? {}) })
  );
  const [mapPreviewVisible, setMapPreviewVisible] = useState(false);
  const [previewDayIndex, setPreviewDayIndex] = useState(0);
  const [previewRoute, setPreviewRoute] = useState<{
    status: 'idle' | 'loading' | 'ready' | 'unavailable';
    coordinates: { latitude: number; longitude: number }[];
    message?: string;
  }>({ status: 'idle', coordinates: [] });
  const previewRequestRef = useRef(0);

  // Step 3 — tab + tối ưu VIP
  const [activeTab, setActiveTab] = useState<'schedule' | 'weather' | 'advice'>('schedule');
  const [dismissedAdvice, setDismissedAdvice] = useState<Set<string>>(new Set());
  const [optimizePanelVisible, setOptimizePanelVisible] = useState(false);
  const [weights, setWeights] = useState<OptimizerWeights>({ ...DEFAULT_WEIGHTS });
  const [previewBeforeMetrics, setPreviewBeforeMetrics] = useState<OptimizeMetrics | null>(null);
  const [previewMetrics, setPreviewMetrics] = useState<OptimizeMetrics | null>(null);
  const [previewDayPlans, setPreviewDayPlans] = useState<Place[][] | null>(null);
  const [previewRoutingStatus, setPreviewRoutingStatus] = useState<OptimizerResult['routingStatus'] | null>(null);
  const [previewAiReview, setPreviewAiReview] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<string | null>(null);

  // Một lần tạo mới hoặc nạp lịch để sửa là một phiên độc lập. Store giữ dữ liệu
  // nghiệp vụ; state cục bộ chỉ giữ trạng thái giao diện và kết quả tính toán.
  useEffect(() => {
    setStep(1);
    setShowDatePicker(false);
    setShowPlaceModal(false);
    setPlaceTab('all');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setDayPlans(preloadedDayPlans?.map((day) => [...day]) ?? []);
    setOptimizing(false);
    setWeatherData(null);
    setWeatherContextKey('');
    setAppliedSmartPlanSignature(null);
    setSlotOverrides({ ...(preloadedSlotOverrides ?? {}) });
    setMapPreviewVisible(false);
    setActiveTab('schedule');
    setDismissedAdvice(new Set());
    setOptimizePanelVisible(false);
    setWeights({ ...DEFAULT_WEIGHTS });
    setPreviewBeforeMetrics(null);
    setPreviewMetrics(null);
    setPreviewDayPlans(null);
    setPreviewRoutingStatus(null);
    setPreviewAiReview(null);
    setAiReview(null);
  }, [draftSessionId, preloadedDayPlans, preloadedSlotOverrides]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Khi chuyển sang Step 3, luôn sync dayPlans với manualPlaces
  useEffect(() => {
    if (step !== 3) return;
    setDayPlans((previous) => {
      if (manualPlaces.length === 0) return Array.from({ length: draft.numDays }, () => []);
      if (previous.length === 0) return geoCluster(manualPlaces, draft.numDays);

      const selectedById = new Map(manualPlaces.map((place) => [place.id, place]));
      const next = Array.from({ length: draft.numDays }, (_, index) =>
        (previous[index] ?? []).filter((place) => selectedById.has(place.id))
      );
      const overflow = previous.slice(draft.numDays).flat().filter((place) => selectedById.has(place.id));
      const assignedIds = new Set(next.flat().map((place) => place.id));
      const unassigned = [...overflow, ...manualPlaces.filter((place) => !assignedIds.has(place.id) && !overflow.some((item) => item.id === place.id))];
      unassigned.forEach((place) => {
        const target = next.reduce((minIndex, day, index) => day.length < next[minIndex].length ? index : minIndex, 0);
        if (!next.some((day) => day.some((item) => item.id === place.id))) next[target].push(place);
      });

      const unchanged = previous.length === next.length
        && previous.every((day, dayIndex) => day.length === next[dayIndex].length
          && day.every((place, placeIndex) => place.id === next[dayIndex][placeIndex].id));
      return unchanged ? previous : next;
    });
  }, [step, manualPlaces, draft.numDays]);

  const currentWeatherContextKey = JSON.stringify({
    startDate: draft.startDate,
    numDays: draft.numDays,
    places: manualPlaces
      .map((place) => `${place.id}:${place.lat}:${place.lng}`)
      .sort(),
  });
  const activeWeatherData = weatherContextKey === currentWeatherContextKey ? weatherData : null;
  const currentSmartPlanSignature = useMemo(
    () => smartPlanSignature(dayPlans, draft.transport, draft.startDate, draft.numDays, slotOverrides, weights),
    [dayPlans, draft.numDays, draft.startDate, draft.transport, slotOverrides, weights],
  );
  const isSmartOptimized = appliedSmartPlanSignature === currentSmartPlanSignature;

  // Fallback đồng bộ để giao diện không giật trong lúc tải ma trận đường bộ.
  const fallbackScheduledDays = useMemo<ItineraryDay[]>(() => {
    if (dayPlans.length === 0) return [];
    const weather = isSmartOptimized && activeWeatherData ? activeWeatherData : undefined;
    return dayPlans.map((dayPlaces, dayIndex) =>
      scheduleDay(dayPlaces, draft.transport, draft.startDate || undefined, dayIndex, weather?.[dayIndex], undefined, undefined, slotOverrides)
    );
  }, [activeWeatherData, dayPlans, draft.transport, draft.startDate, isSmartOptimized, slotOverrides]);

  const routingPlanSignature = useMemo(() => JSON.stringify({
    days: dayPlans.map((day) => day.map((place) => place.id)),
    transport: draft.transport,
    startDate: draft.startDate,
    weather: isSmartOptimized ? activeWeatherData?.map((day) => `${day.date}:${day.score}:${day.hourly.length}`) : null,
    overrides: Object.entries(slotOverrides).sort(([a], [b]) => a.localeCompare(b)),
  }), [activeWeatherData, dayPlans, draft.startDate, draft.transport, isSmartOptimized, slotOverrides]);

  const [routingSchedule, setRoutingSchedule] = useState<{
    signature: string;
    status: 'idle' | 'loading' | 'ready';
    result: OptimizerResult | null;
  }>({ signature: '', status: 'idle', result: null });

  useEffect(() => {
    if (step !== 3 || dayPlans.length === 0) return;
    let active = true;
    const signature = routingPlanSignature;
    setRoutingSchedule({ signature, status: 'loading', result: null });
    void optimizeItinerary({
      places: dayPlans.flat(),
      numDays: draft.numDays,
      transport: draft.transport,
      startTime: PLANNING_RULES.defaultDayStart,
      endTime: PLANNING_RULES.defaultDayEnd,
      startDate: draft.startDate || undefined,
      weatherForecast: isSmartOptimized ? activeWeatherData || undefined : undefined,
      lockedDayPlaceIds: dayPlans.map((day) => day.map((place) => place.id)),
      preserveOrder: true,
      slotOverrides,
    }).then((result) => {
      if (active) setRoutingSchedule({ signature, status: 'ready', result });
    }).catch(() => {
      if (active) setRoutingSchedule({ signature, status: 'ready', result: null });
    });
    return () => { active = false; };
  }, [activeWeatherData, dayPlans, draft.numDays, draft.startDate, draft.transport, isSmartOptimized, routingPlanSignature, slotOverrides, step]);

  const activeRoutingResult = routingSchedule.signature === routingPlanSignature && routingSchedule.status === 'ready'
    ? routingSchedule.result
    : null;
  const routingLoading = step === 3
    && dayPlans.length > 0
    && (routingSchedule.signature !== routingPlanSignature || routingSchedule.status === 'loading');
  const scheduledDays = activeRoutingResult?.days ?? fallbackScheduledDays;

  const unscheduledPlaces = useMemo(
    () => scheduledDays.flatMap((day) => day.unscheduledPlaces),
    [scheduledDays],
  );
  const warnings = useMemo(
    () => unscheduledPlaces.map((item) => `Ngày ${item.dayNumber} · ${item.place.name}: ${item.reason}.`),
    [unscheduledPlaces],
  );

  // ─── Lời khuyên hành động (advise) — chỉ khi đã tối ưu VIP có thời tiết ───
  const adviceList = useMemo<Advice[]>(() => {
    if (!isSmartOptimized || scheduledDays.length === 0) return [];
    return advise(scheduledDays).filter((a) => !dismissedAdvice.has(a.id));
  }, [scheduledDays, isSmartOptimized, dismissedAdvice]);

  // Data hooks
  const allPlacesQuery = useInfinitePlaces(
    { categories: [], suitableFor: [], minDuration: null, minRating: null, openNow: false },
    debouncedSearchQuery,
  );
  const allPlaces = useMemo(
    () => allPlacesQuery.data?.pages.flat() ?? [],
    [allPlacesQuery.data],
  );
  const savedPlacesQuery = useInfiniteSavedPlaces(user?.id, debouncedSearchQuery);
  const savedPlaces = useMemo(
    () => savedPlacesQuery.data?.pages.flat() ?? [],
    [savedPlacesQuery.data],
  );

  const filteredPlaces = allPlaces.filter(p =>
    !manualPlaces.some(mp => mp.id === p.id)
  );
  const filteredSaved = savedPlaces.filter(p =>
    !manualPlaces.some(mp => mp.id === p.id)
  );

  const isVip = isProfileVipActive(profile);
  const estimatedRequiredDays = useMemo(
    () => estimateRequiredDays({ selectedPlaces: manualPlaces, transport: draft.transport }),
    [draft.transport, manualPlaces],
  );
  const minimumStartDate = parseLocalDate(todayInTimeZone());
  const selectedDate = draft.startDate ? parseLocalDate(draft.startDate) : minimumStartDate;
  const placeSource = placeTab === 'saved' ? filteredSaved : filteredPlaces;
  const isLoadingPlaces = placeTab === 'saved' ? savedPlacesQuery.isLoading : allPlacesQuery.isLoading;

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setDraftField('startDate', formatLocalDate(date));
  };

  const toggleStyle = (val: string) => {
    setDraftField('travelStyles', selectedStyles.includes(val)
      ? selectedStyles.filter((style) => style !== val)
      : [...selectedStyles, val]);
  };

  const addPlace = (place: Place) => {
    if (manualPlaces.some((item) => item.id === place.id)) return;
    if (manualPlaces.length >= PLANNING_LIMITS.maxSelectedPlaces) {
      Alert.alert(
        'Đã đạt giới hạn',
        `Một lịch trình chỉ được chọn tối đa ${PLANNING_LIMITS.maxSelectedPlaces} địa điểm.`,
      );
      return;
    }
    addPlaceToDraft(place);
  };

  const removeFromManual = (placeId: string) => {
    removePlaceFromDraft(placeId);
    // Xóa khỏi dayPlans nếu đang ở Step 3
    setDayPlans(prev => prev.map(day => day.filter(p => p.id !== placeId)));
  };

  const moveManualPlace = (index: number, direction: -1 | 1) => {
    const newPlaces = [...manualPlaces];
    const targetIndex = index + direction;
    if (targetIndex >= 0 && targetIndex < newPlaces.length) {
      [newPlaces[index], newPlaces[targetIndex]] = [newPlaces[targetIndex], newPlaces[index]];
      reorderPlaces(newPlaces);
    }
  };

  // ─── Day-level controls (Step 3) ────────────────────────────────────────────
  /** Di chuyển địa điểm lên/xuống trong cùng một ngày */
  const movePlaceInDay = (dayIndex: number, placeIndex: number, direction: -1 | 1) => {
    setDayPlans(prev => {
      const newPlans = prev.map(day => [...day]);
      const day = newPlans[dayIndex];
      const targetIndex = placeIndex + direction;
      if (targetIndex < 0 || targetIndex >= day.length) return newPlans;
      [day[placeIndex], day[targetIndex]] = [day[targetIndex], day[placeIndex]];
      return newPlans;
    });
  };

  /** Chuyển địa điểm sang ngày khác */
  const movePlaceToDay = (fromDay: number, placeIndex: number, toDay: number) => {
    setDayPlans(prev => {
      const newPlans = prev.map(day => [...day]);
      const [place] = newPlans[fromDay].splice(placeIndex, 1);
      newPlans[toDay].push(place);
      return newPlans;
    });
  };

  /** Xóa địa điểm khỏi ngày (nhưng vẫn giữ trong manualPlaces để tránh mất dữ liệu — trừ khi xóa hẳn) */
  const removePlaceFromDay = (dayIndex: number, placeIndex: number) => {
    const place = dayPlans[dayIndex]?.[placeIndex];
    if (!place) return;
    setDayPlans(prev => {
      const newPlans = prev.map(day => [...day]);
      newPlans[dayIndex].splice(placeIndex, 1);
      return newPlans;
    });
    removeFromManual(place.id);
  };

  const handlePreviewMap = async (dayIndex: number) => {
    if (!isVip) {
      Alert.alert('Bản đồ lịch trình dành cho VIP', 'Người dùng miễn phí vẫn xem được timeline. Nâng cấp VIP để xem và tối ưu tuyến trên bản đồ.', [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Xem gói VIP', onPress: () => router.push('/vip/upgrade') },
      ]);
      return;
    }
    const requestId = ++previewRequestRef.current;
    setPreviewDayIndex(dayIndex);
    const allCoords = (dayPlans[dayIndex] ?? [])
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
      .map((place) => ({ latitude: place.lat, longitude: place.lng }));
    setMapPreviewVisible(true);
    if (allCoords.length < 2) {
      setPreviewRoute({ status: 'unavailable', coordinates: [], message: 'Cần ít nhất hai địa điểm có tọa độ hợp lệ.' });
      return;
    }
    setPreviewRoute({ status: 'loading', coordinates: [] });
    const result = await fetchRoadRoute(allCoords, draft.transport);
    if (requestId !== previewRequestRef.current) return;
    setPreviewRoute(result.ok
      ? { status: 'ready', coordinates: result.route.coordinates }
      : { status: 'unavailable', coordinates: [], message: result.message });
  };

  const handleSmartOptimize = async () => {
    if (dayPlans.every(d => d.length === 0)) {
      Alert.alert('Chưa có địa điểm', 'Vui lòng thêm ít nhất 1 địa điểm trước.');
      return;
    }
    setOptimizing(true);
    try {
      // Tải thời tiết (nếu chưa có) để chấm điểm theo giờ thực + mở bảng điều khiển
      let weather = activeWeatherData;
      if (!weather) {
        const coordinates = dayPlans.flat().filter(
          (place) => Number.isFinite(place.lat) && Number.isFinite(place.lng),
        );
        if (coordinates.length === 0) {
          throw new Error('Các địa điểm đã chọn chưa có tọa độ hợp lệ.');
        }
        const latitude = coordinates.reduce((sum, place) => sum + place.lat, 0) / coordinates.length;
        const longitude = coordinates.reduce((sum, place) => sum + place.lng, 0) / coordinates.length;
        weather = await fetchWeatherForecast(latitude, longitude, draft.numDays, draft.startDate);
        setWeatherData(weather);
        setWeatherContextKey(currentWeatherContextKey);
        if (weather.length === 0) {
          Alert.alert(
            'Chưa có dự báo cho ngày đã chọn',
            'Lịch trình vẫn được tối ưu theo khoảng cách và giờ mở cửa. Dữ liệu thời tiết sẽ khả dụng khi chuyến đi nằm trong 16 ngày tới.'
          );
        }
      }
      setPreviewBeforeMetrics(null);
      setPreviewMetrics(null);
      setPreviewDayPlans(null);
      setPreviewRoutingStatus(null);
      setPreviewAiReview(null);
      setOptimizePanelVisible(true);
    } catch (err: any) {
      Alert.alert(t('common.error'), 'Không thể tải thời tiết: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleBasicOptimize = async () => {
    const flatPlaces = dayPlans.flat();
    if (flatPlaces.length === 0) {
      Alert.alert('Chưa có địa điểm', 'Vui lòng thêm ít nhất một địa điểm trước.');
      return;
    }
    setOptimizing(true);
    try {
      const result = await optimizeItinerary({
        places: flatPlaces,
        numDays: draft.numDays,
        transport: draft.transport,
        startTime: PLANNING_RULES.defaultDayStart,
        endTime: PLANNING_RULES.defaultDayEnd,
        startDate: draft.startDate || undefined,
        weights: { travel: 1, weather: 0, open: 5, ideal: 0 },
        lockedDayPlaceIds: dayPlans.map((day) => day.map((place) => place.id)),
      });
      if (result.unscheduledPlaces.length > 0) {
        Alert.alert(
          'Lịch chưa đủ chỗ',
          `${result.unscheduledPlaces.length} địa điểm chưa thể xếp trong khung giờ hiện tại. Hãy tăng số ngày, chuyển điểm sang ngày khác hoặc bỏ bớt điểm.`,
        );
        return;
      }
      setDayPlans(result.days.map((day) => day.places.filter((slot) => !slot.isMeal).map((slot) => slot.place)));
      setSlotOverrides({});
      if (result.routingStatus !== 'road' && result.routingStatus !== 'not_needed') {
        Alert.alert(
          'Đã sắp xếp bằng dữ liệu ước tính',
          'Chưa cấu hình được tuyến đường cho phương tiện này. Thứ tự mới chỉ là gợi ý và không được hiển thị như đường thực tế trên bản đồ.'
        );
      }
    } catch (error: any) {
      Alert.alert('Không thể sắp xếp tuyến', error?.message ?? 'Vui lòng thử lại.');
    } finally {
      setOptimizing(false);
    }
  };

  /** Chạy optimizer với trọng số hiện tại → trả về dayPlans mới + metrics (không commit). */
  const runOptimizer = async () => {
    const flatPlaces = dayPlans.flat();
    const baseInput = {
      places: flatPlaces,
      numDays: draft.numDays,
      transport: draft.transport,
      startTime: PLANNING_RULES.defaultDayStart,
      endTime: PLANNING_RULES.defaultDayEnd,
      startDate: draft.startDate || undefined,
      weatherForecast: activeWeatherData || undefined,
      weights,
    };
    const [serverPlan, beforeResult] = await Promise.all([
      optimizeVipRoute(flatPlaces, draft.numDays, draft.transport),
      optimizeItinerary({
        ...baseInput,
        lockedDayPlaceIds: dayPlans.map((day) => day.map((place) => place.id)),
        preserveOrder: true,
      }),
    ]);
    const result = await optimizeItinerary({
      ...baseInput,
      lockedDayPlaceIds: serverPlan.days,
    });
    const newDayPlans = result.days.map((d) => d.places.filter((s) => !s.isMeal).map((s) => s.place));
    const serverStatus: OptimizerResult['routingStatus'] = serverPlan.routingStatus;
    const routingStatus = combinedRoutingStatus([serverStatus, beforeResult.routingStatus, result.routingStatus]);
    return {
      newDayPlans,
      beforeMetrics: optimizerMetrics(beforeResult),
      metrics: optimizerMetrics(result),
      result,
      routingStatus,
    };
  };

  const handleOptimizePreview = async () => {
    setOptimizing(true);
    try {
      const { beforeMetrics, metrics, newDayPlans, result, routingStatus } = await runOptimizer();
      if (result.unscheduledPlaces.length > 0) {
        throw new Error(`${result.unscheduledPlaces.length} địa điểm chưa xếp được. Hãy tăng số ngày hoặc bỏ bớt địa điểm trước khi tối ưu.`);
      }
      setPreviewBeforeMetrics(beforeMetrics);
      setPreviewMetrics(metrics);
      setPreviewDayPlans(newDayPlans);
      setPreviewRoutingStatus(routingStatus);
      try {
        setPreviewAiReview(await reviewOptimizedItinerary(result.days));
      } catch {
        setPreviewAiReview(null);
      }
    } catch (error: any) {
      Alert.alert('Không thể tối ưu', error?.message ?? 'Vui lòng thử lại.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleOptimizeApply = async () => {
    setOptimizing(true);
    try {
      const optimization = previewDayPlans ? null : await runOptimizer();
      if (optimization && optimization.result.unscheduledPlaces.length > 0) {
        throw new Error(`${optimization.result.unscheduledPlaces.length} địa điểm chưa xếp được.`);
      }
      const nextPlans = previewDayPlans ?? optimization!.newDayPlans;
      setDayPlans(nextPlans);
      setSlotOverrides({});
      setAppliedSmartPlanSignature(smartPlanSignature(
        nextPlans,
        draft.transport,
        draft.startDate,
        draft.numDays,
        {},
        weights,
      ));
      setAiReview(previewAiReview);
      setOptimizePanelVisible(false);
      setPreviewBeforeMetrics(null);
      setPreviewMetrics(null);
      setPreviewDayPlans(null);
      setPreviewRoutingStatus(null);
      setPreviewAiReview(null);
    } catch (error: any) {
      Alert.alert('Không thể áp dụng tối ưu', error?.message ?? 'Vui lòng thử lại.');
    } finally {
      setOptimizing(false);
    }
    // KHÔNG khóa chỉnh tay — người dùng vẫn move/remove được sau tối ưu.
  };

  // ─── Advice: áp dụng đề xuất 1 chạm ───
  const handleApplyAdvice = (advice: Advice) => {
    const a = advice.action;
    if (!a) return;
    const dayIdx = a.payload?.dayIndex ?? a.payload?.fromDay ?? 0;

    switch (a.type) {
      case 'shiftTime': {
        // Dời điểm sang khung giờ đề xuất (hoặc lên đầu ngày nếu không có gợi ý giờ)
        if (a.payload?.suggestHour !== undefined) {
          const startTime = toTimeStr(a.payload.suggestHour * 60);
          const place = dayPlans[dayIdx]?.find((p) => p.id === advice.placeId);
          setSlotOverrides((prev) => ({
            ...prev,
            [advice.placeId!]: { startTime, durationMin: place?.avg_duration_min ?? PLANNING_RULES.defaultVisitDurationMin },
          }));
        } else {
          // Đưa điểm lên đầu ngày để tránh vượt giờ đóng cửa
          const idx = dayPlans[dayIdx]?.findIndex((p) => p.id === advice.placeId);
          if (idx !== undefined && idx > 0) {
            for (let i = idx; i > 0; i--) movePlaceInDay(dayIdx, i, -1);
          }
        }
        break;
      }
      case 'movePlaceToDay': {
        // Chuyển điểm cuối của ngày quá tải sang ngày nhẹ nhất
        const from = a.payload?.fromDay ?? 0;
        const targetDay = dayPlans
          .map((d, i) => ({ i, len: d.length }))
          .filter((x) => x.i !== from)
          .sort((x, y) => x.len - y.len)[0];
        if (targetDay && dayPlans[from]?.length > 0) {
          movePlaceToDay(from, dayPlans[from].length - 1, targetDay.i);
        }
        break;
      }
      case 'swapDays': {
        // Điểm không mở ngày này → chuyển sang ngày kế
        const idx = dayPlans[dayIdx]?.findIndex((p) => p.id === advice.placeId);
        const target = dayIdx + 1 < dayPlans.length ? dayIdx + 1 : dayIdx - 1;
        if (idx !== undefined && idx >= 0 && target >= 0) {
          movePlaceToDay(dayIdx, idx, target);
        }
        break;
      }
      default:
        break;
    }
    setDismissedAdvice((prev) => new Set(prev).add(advice.id));
  };

  const handleDismissAdvice = (id: string) => {
    setDismissedAdvice((prev) => new Set(prev).add(id));
  };


  const handleSave = async () => {
    if (!isHydrated || authLoading) {
      Alert.alert('Đang tải', 'Vui lòng đợi một chút rồi thử lại.');
      return;
    }
    if (!user) {
      Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập để lưu lịch trình.', [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    const planningIssue = validateItineraryDraft(draft, {
      requireTitle: true,
      requireStartDate: true,
      requirePlaces: true,
      allowPastStartDate: Boolean(editId),
    })[0];
    if (planningIssue) {
      Alert.alert('Thông tin chưa hợp lệ', planningIssue.message);
      return;
    }
    if (routingLoading) {
      Alert.alert('Đang tính tuyến', 'Vui lòng đợi hệ thống hoàn tất quãng đường và thời gian trước khi lưu.');
      return;
    }
    if (unscheduledPlaces.length > 0) {
      Alert.alert(
        'Chưa thể lưu lịch trình',
        `${unscheduledPlaces.length} địa điểm chưa được xếp vào khung ${PLANNING_RULES.defaultDayStart}–${PLANNING_RULES.defaultDayEnd}. Hãy tăng số ngày, chuyển ngày hoặc bỏ bớt địa điểm.`,
      );
      return;
    }

    // Dùng scheduledDays (đã memo) + slotOverrides — không tạo mới
    const daysToSave = scheduledDays.length > 0
      ? scheduledDays
      : geoCluster(manualPlaces, draft.numDays).map((dayPlaces, i) =>
          scheduleDay(dayPlaces, draft.transport, draft.startDate || undefined, i, undefined, undefined, undefined, slotOverrides)
        );

    try {
      const saved = await saveItinerary.mutateAsync({
        userId: user!.id,
        itineraryId: editId,
        expectedUpdatedAt,
        title: draft.title.trim(),
        numDays: draft.numDays,
        startDate: draft.startDate,
        numPeople: draft.numPeople,
        transport: draft.transport,
        travelStyles: selectedStyles,
        selectedPlaces: manualPlaces,
        scheduledDays: daysToSave,
        slotOverrides,
        advice: isSmartOptimized ? advise(daysToSave) : [],
      });
      reset();
      router.replace(`/itinerary/${saved.id}`);
    } catch (err: any) {
      Alert.alert(t('common.error'), `${editId ? 'Không thể cập nhật' : 'Không thể tạo'} lịch trình: ${err.message}`);
    }
  };

  const canGoNext = () => {
    if (step === 1) return validateItineraryDraft(draft, {
      requireTitle: true,
      requireStartDate: true,
      allowPastStartDate: Boolean(editId),
    }).length === 0;
    if (step === 2) return validateItineraryDraft(draft, {
      requireTitle: true,
      requireStartDate: true,
      requirePlaces: true,
      allowPastStartDate: Boolean(editId),
    }).length === 0;
    return !routingLoading && unscheduledPlaces.length === 0;
  };

  const handleNext = () => {
    if (step < 3) {
      const issue = validateItineraryDraft(draft, {
        requireTitle: true,
        requireStartDate: true,
        requirePlaces: step >= 2,
        allowPastStartDate: Boolean(editId),
      })[0];
      if (issue) {
        Alert.alert('Thông tin chưa hợp lệ', issue.message);
        return;
      }
      setStep(step + 1);
      return;
    }
    handleSave();
  };

  const openTimeEdit = (dayIndex: number, slotIndex: number, placeId: string, startTime: string, durationMin: number) => {
    setTimeEditTarget({ dayIndex, slotIndex, placeId, startTime, durationMin });
    setTimeEditVisible(true);
  };

  const saveTimeEdit = ({ dayIndex, slotIndex, startTime, durationMin, placeId }: TimeEditValue): string | null => {
    const error = validateSlotEdit(scheduledDays, slotOverrides, { dayIndex, slotIndex, startTime, durationMin, placeId });
    if (error) return error;
    setSlotOverrides(prev => ({ ...prev, [placeId]: { startTime, durationMin } }));
    return null;
  };

  const STEPS_LIST = [
    { id: 1, title: t('create.step1'), icon: 'options-outline' as const },
    { id: 2, title: t('create.step2'), icon: 'location-outline' as const },
    { id: 3, title: t('create.step3'), icon: 'sparkles-outline' as const },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <SceneBackground scene="mountain" height={96}>
        <View style={[styles.headerOverlay, { paddingTop: insets.top + Spacing.sm }]}>
          <Text style={styles.headerTitle}>{t('create.title')}</Text>
        </View>
      </SceneBackground>

      {/* Step indicator */}
      <PlanningProgress steps={STEPS_LIST} current={step} onBackTo={setStep} />

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        <StepTransition step={step}>

        {/* ── STEP 1: Thông tin cơ bản ── */}
        {step === 1 && (
          <View>
            <AppInput
              label="Tên lịch trình *"
              placeholder="Ví dụ: Đà Nẵng 3 ngày 2 đêm"
              value={draft.title}
              onChangeText={v => setDraftField('title', v)}
              maxLength={PLANNING_LIMITS.maxTitleLength}
            />

            <View style={styles.infoGrid}>
            <View style={[styles.card, styles.infoCard]}>
              <Text style={styles.cardLabel}>{t('create.days')}</Text>
              <Text style={styles.fieldHint}>Từ 1 đến 10 ngày</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraftField('numDays', Math.max(1, draft.numDays - 1))}>
                  <Ionicons name="remove" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{draft.numDays}</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraftField('numDays', Math.min(10, draft.numDays + 1))}>
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.card, styles.infoCard]}>
              <Text style={styles.cardLabel}>{t('create.people')}</Text>
              <Text style={styles.fieldHint}>Thông tin quy mô nhóm</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraftField('numPeople', Math.max(1, draft.numPeople - 1))}>
                  <Ionicons name="remove" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{draft.numPeople}</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraftField('numPeople', Math.min(30, draft.numPeople + 1))}>
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            </View>

            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateBtnText}>
                {draft.startDate
                  ? parseLocalDate(draft.startDate).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                  : t('create.startDate')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={selectedDate} mode="date" display="default" minimumDate={minimumStartDate} onChange={handleDateChange} />
            )}

            {/* Ẩn dự trù kinh phí */}

            <Text style={styles.sectionLabel}>Phương tiện di chuyển</Text>
            <View style={styles.optionGrid}>
              {TRANSPORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionChip, draft.transport === opt.value && styles.optionChipActive]}
                  onPress={() => setDraftField('transport', opt.value as any)}
                >
                  <Text style={styles.optionEmoji}>{opt.icon}</Text>
                  <Text style={[styles.optionLabel, draft.transport === opt.value && styles.optionLabelActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Sở thích chuyến đi (không bắt buộc)</Text>
            <Text style={styles.fieldHint}>Được lưu cùng lịch trình để mô tả nhu cầu của nhóm.</Text>
            <View style={styles.optionGrid}>
              {TRAVEL_STYLE_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.optionChip, selectedStyles.includes(s.value) && styles.optionChipActive]}
                  onPress={() => toggleStyle(s.value)}
                >
                  <Text style={styles.optionEmoji}>{s.icon}</Text>
                  <Text style={[styles.optionLabel, selectedStyles.includes(s.value) && styles.optionLabelActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── STEP 2: Chọn địa điểm ── */}
        {step === 2 && (
          <View>
            {manualPlaces.length > 0 && (
              <>
              <View style={[
                styles.capacityCard,
                estimatedRequiredDays > draft.numDays && styles.capacityCardWarning,
              ]}>
                <Ionicons
                  name={estimatedRequiredDays > draft.numDays ? 'time-outline' : 'checkmark-circle-outline'}
                  size={20}
                  color={estimatedRequiredDays > draft.numDays ? Colors.warning : Colors.success}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.capacityTitle}>
                    {estimatedRequiredDays > PLANNING_LIMITS.maxDays
                      ? 'Số điểm vượt sức chứa 10 ngày'
                      : estimatedRequiredDays > draft.numDays
                        ? `Nên dành khoảng ${estimatedRequiredDays} ngày`
                        : `Phù hợp với ${draft.numDays} ngày (ước tính)`}
                  </Text>
                  <Text style={styles.capacityText}>
                    Ước tính từ thời lượng tham quan, thời gian di chuyển và nghỉ. Tuyến đường thực sẽ được kiểm tra ở bước tiếp theo.
                  </Text>
                </View>
                {estimatedRequiredDays > draft.numDays && estimatedRequiredDays <= PLANNING_LIMITS.maxDays ? (
                  <TouchableOpacity onPress={() => setDraftField('numDays', estimatedRequiredDays)}>
                    <Text style={styles.capacityAction}>Dùng {estimatedRequiredDays} ngày</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>{t('create.selectPlaces')} ({manualPlaces.length})</Text>
                <View style={{ gap: Spacing.sm }}>
                  {manualPlaces.map((item, i) => (
                    <View key={item.id} style={styles.selectedPlaceRow}>
                      <View style={styles.selectedPlaceIndex}>
                        <Text style={styles.selectedPlaceNum}>{i + 1}</Text>
                      </View>
                      <View style={styles.selectedPlaceInfo}>
                        <Text style={styles.selectedPlaceName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.selectedPlaceCat}>{item.category}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        {i > 0 ? (
                          <TouchableOpacity onPress={() => moveManualPlace(i, -1)}>
                            <Ionicons name="arrow-up-circle" size={24} color={Colors.primary} />
                          </TouchableOpacity>
                        ) : <View style={{ width: 24 }} />}
                        {i < manualPlaces.length - 1 ? (
                          <TouchableOpacity onPress={() => moveManualPlace(i, 1)}>
                            <Ionicons name="arrow-down-circle" size={24} color={Colors.primary} />
                          </TouchableOpacity>
                        ) : <View style={{ width: 24 }} />}
                        <TouchableOpacity onPress={() => removeFromManual(item.id)}>
                          <Ionicons name="close-circle" size={24} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              </>
            )}

            <TouchableOpacity style={styles.addPlaceBtn} onPress={() => setShowPlaceModal(true)}>
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
              <Text style={styles.addPlaceBtnText}>Thêm địa điểm</Text>
            </TouchableOpacity>

            {manualPlaces.length === 0 && (
              <View style={styles.emptyHint}>
                <Ionicons name="location-outline" size={48} color={Colors.divider} />
                <Text style={styles.emptyHintText}>Chưa có địa điểm nào. Nhấn “Thêm địa điểm” để bắt đầu.</Text>
              </View>
            )}
          </View>
        )}

        {/* ── STEP 3: Sắp xếp & xem trước (3 tab) ── */}
        {step === 3 && (
          <View>
            <View style={[
              styles.routingStatus,
              activeRoutingResult?.routingStatus === 'estimated' && styles.routingStatusWarning,
              activeRoutingResult?.routingStatus === 'mixed' && styles.routingStatusWarning,
            ]}>
              {routingLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name={activeRoutingResult?.routingStatus === 'road' ? 'navigate-circle' : 'information-circle-outline'}
                  size={20}
                  color={activeRoutingResult?.routingStatus === 'road' ? Colors.success : Colors.warning}
                />
              )}
              <Text style={styles.routingStatusText}>
                {routingLoading
                  ? `Đang tính thời gian theo mạng lưới đường cho ${transportLabel(draft.transport)}…`
                  : activeRoutingResult?.routingStatus === 'road'
                    ? `Quãng đường và thời gian lấy từ tuyến đường thực tế cho ${transportLabel(draft.transport)}.`
                    : activeRoutingResult?.routingStatus === 'mixed'
                      ? `Một số ngày chưa có dữ liệu đường thực tế (ngày ${activeRoutingResult.estimatedRouteDays.join(', ')}); các ngày đó đang dùng ước tính.`
                      : activeRoutingResult?.routingStatus === 'not_needed'
                        ? 'Ngày chỉ có một địa điểm nên không phát sinh chặng di chuyển.'
                        : `Chưa có dịch vụ định tuyến cho ${transportLabel(draft.transport)}; khoảng cách và thời gian đang là ước tính, không phải đường hiển thị trên bản đồ.`}
              </Text>
            </View>

            {/* VIP Banner (Nhỏ gọn) */}
            <View style={styles.vipBannerCompact}>
              <View style={styles.vipBannerCompactLeft}>
                <Ionicons name={isVip ? "star" : "lock-closed"} size={16} color={isVip ? Colors.lime : Colors.secondary} />
                <Text style={[styles.vipBannerCompactTitle, !isVip && { color: Colors.secondary }]}>
                  {isVip ? 'Tối ưu tuyến và khung giờ' : 'Sắp tuyến cơ bản theo thời gian di chuyển'}
                </Text>
              </View>
              {isVip ? (
                <TouchableOpacity style={styles.optimizeBtnCompact} onPress={handleSmartOptimize} disabled={optimizing || routingLoading}>
                  <Text style={styles.optimizeBtnTextCompact}>{optimizing || routingLoading ? '...' : '⚡ Tối ưu'}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.basicRouteActions}>
                  <TouchableOpacity style={styles.basicRouteButton} onPress={handleBasicOptimize} disabled={optimizing || routingLoading}>
                    <Text style={styles.basicRouteButtonText}>{optimizing ? 'Đang sắp…' : 'Sắp tuyến cơ bản'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/vip/upgrade')}>
                    <Text style={styles.vipLockLink}>VIP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Tab selector — Thời tiết & Lời khuyên chỉ hiện khi đã tối ưu VIP */}
            {isSmartOptimized ? (
              <SegmentedControl
                items={[
                  { key: 'schedule', label: 'Lịch trình' },
                  { key: 'weather', label: 'Thời tiết' },
                  { key: 'advice', label: 'Lời khuyên', badge: adviceList.length },
                ]}
                value={activeTab}
                onChange={(k) => setActiveTab(k as any)}
              />
            ) : null}

            {/* ─── TAB: LỊCH TRÌNH ─── */}
            {(!isSmartOptimized || activeTab === 'schedule') && (
              <View>
                {isVip && aiReview && (
                  <View style={styles.aiReviewBox}>
                    <Text style={styles.aiReviewTitle}>✨ AI review sau tối ưu</Text>
                    <Text style={styles.aiReviewText}>{aiReview}</Text>
                  </View>
                )}
                {scheduledDays.length > 0 ? scheduledDays.map((day, dayIndex) => {
                  const dayDate = day.date ? formatDateVi(day.date) : undefined;
                  const scheduledCount = day.places.filter((slot) => !slot.isMeal).length;
                  const plannedCount = dayPlans[dayIndex]?.length ?? 0;
                  return (
                    <View key={dayIndex} style={styles.daySection}>
                      <View style={styles.dayHeader}>
                        <Text style={styles.dayTitle}>📅 Ngày {day.dayNumber}</Text>
                        <TouchableOpacity onPress={() => handlePreviewMap(dayIndex)} style={styles.dayMapButton}>
                          <Ionicons name={isVip ? 'map-outline' : 'lock-closed-outline'} size={15} color={Colors.primary} />
                          <Text style={styles.dayMapButtonText}>Bản đồ ngày</Text>
                        </TouchableOpacity>
                        {dayDate && <Text style={styles.dayDate}>{dayDate}</Text>}
                        {day.weatherSummary && <Text style={styles.dayWeather}>{day.weatherSummary}</Text>}
                        <View style={styles.dayMeta}>
                          <Ionicons name="location" size={12} color={Colors.secondary} />
                          <Text style={styles.dayMetaText}>
                            {scheduledCount === plannedCount ? `${scheduledCount} điểm` : `${scheduledCount}/${plannedCount} điểm đã xếp`}
                          </Text>
                          <Ionicons name="navigate" size={12} color={Colors.secondary} style={{ marginLeft: 6 }} />
                          <Text style={styles.dayMetaText}>{day.routeDistanceKm} km</Text>
                        </View>
                      </View>

                      {scheduledCount === 0 ? (
                        <Text style={styles.emptyDay}>
                          {plannedCount === 0 ? 'Ngày nghỉ — chưa có địa điểm' : 'Các địa điểm của ngày này chưa xếp được trong khung giờ hợp lệ'}
                        </Text>
                      ) : (
                        <View style={styles.routeList}>
                          {day.places.map((slot, idx) => {
                            const key = slot.place.id;
                            const override = slotOverrides[key];
                            const displayTime = override?.startTime ?? slot.startTime;
                            // Điểm ăn tự chèn không có action điều khiển
                            const isMeal = slot.isMeal;
                            // Vị trí thực trong dayPlans (bỏ qua các slot bữa ăn phía trước)
                            const placeIdx = dayPlans[dayIndex]?.findIndex((p) => p.id === slot.place.id) ?? idx;
                            return (
                              <View key={slot.place.id} style={styles.routeNodeWrap}>
                                <RouteNode
                                  item={{ ...slot, startTime: displayTime }}
                                  index={idx}
                                  isLast={idx === day.places.length - 1}
                                  onRemove={!isMeal ? () => removePlaceFromDay(dayIndex, placeIdx) : undefined}
                                  onMoveUp={!isMeal && placeIdx > 0 ? () => movePlaceInDay(dayIndex, placeIdx, -1) : undefined}
                                  onMoveDown={!isMeal && placeIdx < (dayPlans[dayIndex]?.length ?? 0) - 1 ? () => movePlaceInDay(dayIndex, placeIdx, 1) : undefined}
                                  isVip={isVip}
                                  transport={draft.transport}
                                />

                                {/* Thanh action bổ sung: sửa giờ + chuyển ngày (bỏ qua slot bữa ăn) */}
                                {!isMeal && (
                                  <View style={styles.slotActions}>
                                    <TouchableOpacity
                                      style={styles.editTimeBtn}
                                      onPress={() => openTimeEdit(dayIndex, idx, slot.place.id, displayTime, override?.durationMin ?? slot.place.avg_duration_min ?? PLANNING_RULES.defaultVisitDurationMin)}
                                    >
                                      <Ionicons name="time-outline" size={13} color={Colors.primary} />
                                      <Text style={styles.editTimeBtnText}>Đổi giờ{override ? ' ✏️' : ''}</Text>
                                    </TouchableOpacity>

                                    {scheduledDays.length > 1 && (
                                      <View style={styles.moveDayBtns}>
                                        {dayIndex > 0 && (
                                          <TouchableOpacity style={styles.moveDayBtn} onPress={() => movePlaceToDay(dayIndex, placeIdx, dayIndex - 1)}>
                                            <Ionicons name="arrow-back" size={12} color={Colors.primary} />
                                          </TouchableOpacity>
                                        )}
                                        {dayIndex < scheduledDays.length - 1 && (
                                          <TouchableOpacity style={styles.moveDayBtn} onPress={() => movePlaceToDay(dayIndex, placeIdx, dayIndex + 1)}>
                                            <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                }) : (
                  <View style={styles.emptyHint}>
                    <Ionicons name="map-outline" size={48} color={Colors.divider} />
                    <Text style={styles.emptyHintText}>Quay lại bước 2 để thêm địa điểm.</Text>
                  </View>
                )}

                {/* Cảnh báo */}
                {warnings.length > 0 && (
                  <View style={styles.warningsBox}>
                    <Text style={styles.warningsTitle}>⚠️ Chưa thể lưu — còn địa điểm chưa xếp:</Text>
                    {warnings.map((w, i) => (
                      <Text key={i} style={styles.warningItem}>• {w}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ─── TAB: THỜI TIẾT ─── */}
            {isSmartOptimized && activeTab === 'weather' && (
              <View>
                {activeWeatherData && scheduledDays.length > 0 ? (
                  scheduledDays.map((day, i) => {
                    const w = activeWeatherData[i];
                    if (!w) return null;
                    return (
                      <WeatherTimeline
                        key={i}
                        day={w}
                        dayNumber={day.dayNumber}
                        date={day.date}
                        goldenWindows={day.goldenWindows}
                        onSelectHour={() => setActiveTab('schedule')}
                      />
                    );
                  })
                ) : (
                  <View style={styles.emptyHint}>
                    <Ionicons name="partly-sunny-outline" size={48} color={Colors.divider} />
                    <Text style={styles.emptyHintText}>Chưa có dữ liệu thời tiết.</Text>
                  </View>
                )}
              </View>
            )}

            {/* ─── TAB: LỜI KHUYÊN ─── */}
            {isSmartOptimized && activeTab === 'advice' && (
              <View>
                {adviceList.length > 0 ? (
                  adviceList.map((a) => (
                    <AdviceCard
                      key={a.id}
                      advice={a}
                      onApply={handleApplyAdvice}
                      onDismiss={handleDismissAdvice}
                    />
                  ))
                ) : (
                  <View style={styles.emptyHint}>
                    <Ionicons name="checkmark-circle-outline" size={48} color={Colors.accent} />
                    <Text style={styles.emptyHintText}>Không có lời khuyên nào — lịch trình đã ổn!</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
        </StepTransition>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
        <View style={styles.footerRow}>
          {step > 1 && (
            <AppButton
              title="← Quay lại"
              variant="outline"
              onPress={() => setStep(step - 1)}
              style={styles.footerBtnBack}
              fullWidth={false}
            />
          )}
          <AppButton
            title={step === 3 ? (routingLoading ? 'Đang tính tuyến…' : '✅ Lưu lịch trình') : 'Tiếp theo →'}
            onPress={handleNext}
            loading={saveItinerary.isPending || routingLoading}
            disabled={!canGoNext()}
            style={styles.footerBtnNext}
            fullWidth={false}
          />
        </View>
      </View>

      {/* Modals */}
      <TimeEditModal
        visible={timeEditVisible}
        {...timeEditTarget}
        onSave={saveTimeEdit}
        onClose={() => setTimeEditVisible(false)}
      />
      <PlaceSelectorModal
        visible={showPlaceModal}
        onClose={() => setShowPlaceModal(false)}
        placeTab={placeTab}
        setPlaceTab={setPlaceTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeSource={placeSource}
        isLoadingPlaces={isLoadingPlaces}
        savedPlacesCount={savedPlaces.length}
        onAddPlace={addPlace}
        selectedCount={manualPlaces.length}
        maxSelectedCount={PLANNING_LIMITS.maxSelectedPlaces}
        hasMore={placeTab === 'saved' ? savedPlacesQuery.hasNextPage : allPlacesQuery.hasNextPage}
        isFetchingMore={placeTab === 'saved' ? savedPlacesQuery.isFetchingNextPage : allPlacesQuery.isFetchingNextPage}
        onLoadMore={() => {
          if (placeTab === 'saved') void savedPlacesQuery.fetchNextPage();
          else void allPlacesQuery.fetchNextPage();
        }}
        loadError={placeTab === 'saved'
          ? savedPlacesQuery.error ? 'Không thể tải địa điểm đã lưu.' : null
          : allPlacesQuery.error ? 'Không thể tải danh sách địa điểm.' : null}
        onRetry={() => {
          if (placeTab === 'saved') void savedPlacesQuery.refetch();
          else void allPlacesQuery.refetch();
        }}
      />
      <MapPreviewModal
        visible={mapPreviewVisible}
        onClose={() => setMapPreviewVisible(false)}
        places={dayPlans[previewDayIndex] ?? []}
        routeCoordinates={previewRoute.coordinates}
        routeStatus={previewRoute.status}
        routeMessage={previewRoute.message}
      />
      <OptimizePanel
        visible={optimizePanelVisible}
        weights={weights}
        onChangeWeights={(nextWeights) => {
          setWeights(nextWeights);
          setPreviewBeforeMetrics(null);
          setPreviewMetrics(null);
          setPreviewDayPlans(null);
          setPreviewRoutingStatus(null);
          setPreviewAiReview(null);
        }}
        before={previewBeforeMetrics ?? undefined}
        after={previewMetrics ?? undefined}
        routingStatus={previewRoutingStatus ?? undefined}
        loading={optimizing}
        onPreview={handleOptimizePreview}
        onApply={handleOptimizeApply}
        onClose={() => {
          setOptimizePanelVisible(false);
          setPreviewBeforeMetrics(null);
          setPreviewMetrics(null);
          setPreviewDayPlans(null);
          setPreviewRoutingStatus(null);
          setPreviewAiReview(null);
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerTitle: { ...Typography.h2, color: Colors.white, textAlign: 'center' },

  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },

  card: {
    backgroundColor: Colors.cardBg, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.divider,
    shadowColor: '#06251A', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  infoGrid: { flexDirection: 'row', gap: Spacing.sm },
  infoCard: { flex: 1 },
  cardLabel: { ...Typography.label, color: Colors.primary, marginBottom: Spacing.sm },
  fieldHint: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.xs },
  sectionLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.md },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.divider,
  },
  stepperValue: { ...Typography.display, color: Colors.primary, fontSize: 36, minWidth: 60, textAlign: 'center' },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.divider, gap: Spacing.sm,
  },
  dateBtnText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  optionChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full, backgroundColor: Colors.cardBg,
    borderWidth: 1.5, borderColor: Colors.divider, gap: Spacing.xs,
  },
  optionChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  optionEmoji: { fontSize: 16 },
  optionLabel: { ...Typography.caption, color: Colors.textSecondary },
  optionLabelActive: { color: Colors.primary, fontWeight: '700' },

  selectedPlaceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.divider, gap: Spacing.sm,
  },
  selectedPlaceIndex: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  selectedPlaceNum: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  selectedPlaceInfo: { flex: 1 },
  selectedPlaceName: { ...Typography.bodyBold, color: Colors.textPrimary },
  selectedPlaceCat: { ...Typography.caption, color: Colors.secondary },

  capacityCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success,
    backgroundColor: Colors.cardBg,
  },
  capacityCardWarning: { borderColor: Colors.warning, backgroundColor: '#FFF9E6' },
  capacityTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  capacityText: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  capacityAction: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  addPlaceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.primary,
    borderStyle: 'dashed', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  addPlaceBtnText: { ...Typography.bodyBold, color: Colors.primary },

  emptyHint: { alignItems: 'center', paddingVertical: 40, gap: Spacing.md },
  emptyHintText: { ...Typography.body, color: Colors.secondary, textAlign: 'center' },

  routingStatus: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success,
    backgroundColor: Colors.cardBg,
  },
  routingStatusWarning: { borderColor: Colors.warning, backgroundColor: '#FFF9E6' },
  routingStatusText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 18 },

  vipBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primaryDark, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm,
  },
  vipBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  vipBannerTitle: { ...Typography.bodyBold, color: Colors.white },
  vipBannerDesc: { ...Typography.caption, color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  optimizeBtn: { paddingHorizontal: Spacing.sm, minHeight: 36 },
  vipLockBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface + '80', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm, flexWrap: 'wrap',
  },
  vipLockText: { ...Typography.caption, color: Colors.secondary, flex: 1 },
  vipLockLink: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  weatherSummaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  weatherDayChip: {
    alignItems: 'center', backgroundColor: Colors.cardBg,
    borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider, minWidth: 64,
  },
  weatherDayIcon: { fontSize: 20 },
  weatherDayNum: { ...Typography.caption, color: Colors.secondary, fontSize: 10 },
  weatherDayScore: { ...Typography.caption, color: Colors.primary, fontWeight: '700', fontSize: 11 },

  daySection: { marginBottom: Spacing.xl },
  dayHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: Spacing.sm, gap: Spacing.sm },
  dayTitle: { ...Typography.h3, color: Colors.primary },
  dayMapButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.surface },
  dayMapButtonText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  dayDate: { ...Typography.caption, color: Colors.primary, fontWeight: '600', fontSize: 12 },
  dayWeather: { ...Typography.caption, color: Colors.textSecondary, flex: 1, fontSize: 11 },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayMetaText: { ...Typography.caption, color: Colors.secondary, fontSize: 11 },
  emptyDay: { ...Typography.caption, color: Colors.secondary, fontStyle: 'italic' },
  routeList: { gap: 8 },
  routeNodeWrap: { position: 'relative' },

  // Slot action bar
  slotActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 44, marginTop: -4, marginBottom: 4, gap: 8, flexWrap: 'wrap' },
  editTimeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.sky + '60',
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  editTimeBtnText: { ...Typography.caption, color: Colors.primary, fontSize: 11 },
  moveDayBtns: { flexDirection: 'row', gap: 6 },
  moveDayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.divider,
  },
  moveDayBtnText: { ...Typography.caption, color: Colors.primary, fontSize: 11 },

  warningsBox: {
    backgroundColor: '#FFF9E6', borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: '#F59E0B', marginTop: Spacing.md,
  },
  warningsTitle: { ...Typography.bodyBold, color: '#92400E', marginBottom: Spacing.xs },
  warningItem: { ...Typography.caption, color: '#78350F', marginTop: 3 },
  aiReviewBox: {
    backgroundColor: Colors.primary + '10', borderColor: Colors.primary,
    borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  aiReviewTitle: { ...Typography.bodyBold, color: Colors.primary, marginBottom: Spacing.xs },
  aiReviewText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 20 },

  previewMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary,
  },
  previewMapBtnText: { ...Typography.bodyBold, color: Colors.primary },

  footer: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.white,
    shadowColor: '#06251A', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.md },
  footerBtnBack: { flex: 1 },
  footerBtnNext: { flex: 2 },

  vipBannerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryDark,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  vipBannerCompactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  vipBannerCompactTitle: {
    ...Typography.bodyBold,
    color: Colors.white,
    fontSize: 13,
  },
  optimizeBtnCompact: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  optimizeBtnTextCompact: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  basicRouteActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  basicRouteButton: {
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  basicRouteButtonText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
});
