import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useItineraryStore } from '@/src/stores/itineraryStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useSaveItinerary } from '@/src/hooks/useItineraries';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AnimatedBackground } from '@/src/components/atoms/AnimatedBackground';
import { RouteNode } from '@/src/components/molecules/RouteNode';
import DateTimePicker from '@react-native-community/datetimepicker';
import { optimizeRoute, haversineKm } from '@/src/features/itinerary/services/routeOptimizer';
import { fetchWeatherForecast, WeatherDay } from '@/src/services/weatherService';
import { usePlaces } from '@/src/hooks/usePlaces';
import { Place } from '@/src/types/place';

const TRANSPORT_OPTIONS = [
  { value: 'motorbike', label: 'Xe máy', icon: '🏍️' },
  { value: 'car', label: 'Ô tô', icon: '🚗' },
  { value: 'walk', label: 'Đi bộ', icon: '🚶' },
  { value: 'bicycle', label: 'Xe đạp', icon: '🚲' },
];

const TRAVEL_STYLES = [
  { value: 'relax', label: 'Thư giãn', icon: '🌴' },
  { value: 'photo', label: 'Sống ảo', icon: '📸' },
  { value: 'adventure', label: 'Phiêu lưu', icon: '🧗' },
  { value: 'food', label: 'Ẩm thực', icon: '🍜' },
  { value: 'culture', label: 'Văn hóa', icon: '🏛️' },
  { value: 'family', label: 'Gia đình', icon: '👨‍👩‍👧' },
];

const STEPS = [
  { id: 1, title: 'Thông tin cơ bản' },
  { id: 2, title: 'Chọn địa điểm' },
  { id: 3, title: 'Sắp xếp lịch trình' },
];

export default function CreateItineraryScreen() {
  const { draft, setDraftField, addPlaceToDraft, removePlaceFromDraft } = useItineraryStore();
  const { profile } = useAuthStore();
  const saveItinerary = useSaveItinerary();

  const [step, setStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherDay[] | null>(null);
  const [optimizedDays, setOptimizedDays] = useState<ReturnType<typeof optimizeRoute> | null>(null);
  const [manualPlaces, setManualPlaces] = useState<Place[]>([...draft.selectedPlaces]);
  const [showPlaceModal, setShowPlaceModal] = useState(false);

  const isVip = profile?.vip_status === 'active' || profile?.vip_status === 'vip';

  // Fetch places for selection
  const { data: allPlaces = [], isLoading: placesLoading } = usePlaces({ categories: [], suitableFor: [], maxEntryFee: null, minDuration: null, minRating: null, openNow: false });

  const filteredPlaces = allPlaces.filter(p =>
    !manualPlaces.some(mp => mp.id === p.id) &&
    (searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedDate = draft.startDate
    ? new Date(draft.startDate)
    : new Date();

  // ─── Step 1 handlers ──────────────────────────────────────────────────────
  const handleDateChange = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setDraftField('startDate', date.toISOString().split('T')[0]);
  };

  const toggleStyle = (val: string) => {
    setSelectedStyles(prev =>
      prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
    );
  };

  // ─── Step 2: place management ──────────────────────────────────────────────
  const addPlace = (place: Place) => {
    setManualPlaces(prev => [...prev, place]);
    addPlaceToDraft(place);
  };

  const removePlace = (placeId: string) => {
    setManualPlaces(prev => prev.filter(p => p.id !== placeId));
    removePlaceFromDraft(placeId);
    if (optimizedDays) setOptimizedDays(null); // reset optimization
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...manualPlaces];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setManualPlaces(newList);
    if (optimizedDays) setOptimizedDays(null);
  };

  const moveDown = (index: number) => {
    if (index === manualPlaces.length - 1) return;
    const newList = [...manualPlaces];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setManualPlaces(newList);
    if (optimizedDays) setOptimizedDays(null);
  };

  // ─── VIP: Smart optimize ──────────────────────────────────────────────────
  const handleSmartOptimize = async () => {
    if (manualPlaces.length === 0) {
      Alert.alert('Chưa có địa điểm', 'Vui lòng thêm ít nhất 1 địa điểm trước.');
      return;
    }
    setOptimizing(true);
    try {
      const weather = await fetchWeatherForecast(16.0544, 108.2022, draft.numDays);
      setWeatherData(weather);
      const result = optimizeRoute({
        places: manualPlaces,
        numDays: draft.numDays,
        transport: draft.transport,
        startTime: '08:00',
        endTime: '21:00',
        weatherForecast: weather,
      });
      setOptimizedDays(result);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể tải thời tiết: ' + err.message);
    } finally {
      setOptimizing(false);
    }
  };

  // Build simple user order result (no weather)
  const buildUserResult = () => {
    return optimizeRoute({
      places: manualPlaces,
      numDays: draft.numDays,
      transport: draft.transport,
      startTime: '08:00',
      endTime: '21:00',
    });
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!profile) {
      Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập để tạo lịch trình.');
      return;
    }
    if (!draft.title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên lịch trình.');
      return;
    }

    const result = optimizedDays ?? buildUserResult();

    try {
      const saved = await saveItinerary.mutateAsync({
        userId: profile.id,
        title: draft.title,
        numDays: draft.numDays,
        startDate: draft.startDate,
        numPeople: draft.numPeople,
        budgetTier: draft.budgetTier,
        transport: draft.transport,
        travelStyles: selectedStyles,
        selectedPlaces: manualPlaces,
        result,
      });
      router.replace(`/itinerary/${saved.id}`);
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể tạo lịch trình: ' + err.message);
    }
  };

  const canGoNext = () => {
    if (step === 1) return draft.title.trim().length > 0;
    if (step === 2) return manualPlaces.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else handleSave();
  };

  // Build display for step 3
  const displayResult = optimizedDays ?? (manualPlaces.length > 0 ? buildUserResult() : null);

  return (
    <View style={styles.container}>
      {/* ── Animated Header ── */}
      <AnimatedBackground scene="mountain" height={130}>
        <View style={styles.headerOverlay}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lập lịch trình</Text>
          <View style={{ width: 40 }} />
        </View>
      </AnimatedBackground>

      {/* ── Step Progress ── */}
      <View style={styles.progressBar}>
        {STEPS.map(s => (
          <TouchableOpacity key={s.id} style={styles.stepItem} onPress={() => step > s.id && setStep(s.id)}>
            <View style={[styles.stepCircle, step >= s.id && styles.stepCircleActive]}>
              {step > s.id ? (
                <Ionicons name="checkmark" size={14} color={Colors.white} />
              ) : (
                <Text style={[styles.stepNum, step >= s.id && styles.stepNumActive]}>{s.id}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, step >= s.id && styles.stepLabelActive]} numberOfLines={1}>
              {s.title}
            </Text>
            {s.id < STEPS.length && <View style={[styles.stepConnector, step > s.id && styles.stepConnectorActive]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Content ── */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

        {/* ──── STEP 1: Basic Info ──────────────────────────────────────── */}
        {step === 1 && (
          <View>
            <AppInput
              label="Tên lịch trình *"
              placeholder="Ví dụ: Đà Nẵng 3 ngày 2 đêm"
              value={draft.title}
              onChangeText={v => setDraftField('title', v)}
            />

            {/* Num Days */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Số ngày đi</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraftField('numDays', Math.max(1, draft.numDays - 1))}>
                  <Ionicons name="remove" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{draft.numDays}</Text>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setDraftField('numDays', Math.min(14, draft.numDays + 1))}>
                  <Ionicons name="add" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Num People */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Số người</Text>
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

            {/* Start Date */}
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateBtnText}>
                {draft.startDate
                  ? new Date(draft.startDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                  : 'Chọn ngày bắt đầu'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={selectedDate} mode="date" display="default" minimumDate={new Date()} onChange={handleDateChange} />
            )}

            {/* Transport */}
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

            {/* Travel styles */}
            <Text style={styles.sectionLabel}>Phong cách du lịch</Text>
            <View style={styles.optionGrid}>
              {TRAVEL_STYLES.map(s => (
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

        {/* ──── STEP 2: Select Places ───────────────────────────────────── */}
        {step === 2 && (
          <View>
            {/* Selected places list */}
            {manualPlaces.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Địa điểm đã chọn ({manualPlaces.length})</Text>
                {manualPlaces.map((p, i) => (
                  <View key={p.id} style={styles.selectedPlaceRow}>
                    <View style={styles.selectedPlaceIndex}>
                      <Text style={styles.selectedPlaceNum}>{i + 1}</Text>
                    </View>
                    <View style={styles.selectedPlaceInfo}>
                      <Text style={styles.selectedPlaceName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.selectedPlaceCat}>{p.category}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removePlace(p.id)}>
                      <Ionicons name="close-circle" size={22} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Add places button */}
            <TouchableOpacity style={styles.addPlaceBtn} onPress={() => setShowPlaceModal(true)}>
              <Ionicons name="add-circle" size={24} color={Colors.accent} />
              <Text style={styles.addPlaceBtnText}>Thêm địa điểm</Text>
            </TouchableOpacity>

            {/* Info */}
            {manualPlaces.length === 0 && (
              <View style={styles.emptyHint}>
                <Ionicons name="location-outline" size={48} color={Colors.divider} />
                <Text style={styles.emptyHintText}>Chưa có địa điểm nào. Nhấn "Thêm địa điểm" để bắt đầu.</Text>
              </View>
            )}
          </View>
        )}

        {/* ──── STEP 3: Arrange & Preview ──────────────────────────────── */}
        {step === 3 && (
          <View>
            {/* VIP Banner */}
            {isVip ? (
              <View style={styles.vipBanner}>
                <View style={styles.vipBannerLeft}>
                  <Ionicons name="star" size={20} color={Colors.lime} />
                  <View style={{ marginLeft: Spacing.sm }}>
                    <Text style={styles.vipBannerTitle}>Tối ưu lộ trình thông minh (VIP)</Text>
                    <Text style={styles.vipBannerDesc}>Sắp xếp tự động dựa trên thời tiết thực tế & quãng đường</Text>
                  </View>
                </View>
                <AppButton
                  title={optimizing ? '...' : '⚡ Tối ưu'}
                  onPress={handleSmartOptimize}
                  loading={optimizing}
                  style={styles.optimizeBtn}
                  fullWidth={false}
                />
              </View>
            ) : (
              <View style={styles.vipLockBanner}>
                <Ionicons name="lock-closed" size={16} color={Colors.secondary} />
                <Text style={styles.vipLockText}>Nâng cấp VIP để dùng tính năng tối ưu thông minh</Text>
                <TouchableOpacity onPress={() => router.push('/vip/upgrade')}>
                  <Text style={styles.vipLockLink}>Nâng cấp</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Weather summary for VIP */}
            {weatherData && optimizedDays?.isSmartOptimized && (
              <View style={styles.weatherSummaryRow}>
                {weatherData.slice(0, draft.numDays).map((w, i) => (
                  <View key={i} style={styles.weatherDayChip}>
                    <Text style={styles.weatherDayIcon}>{w.icon}</Text>
                    <Text style={styles.weatherDayNum}>Ngày {i + 1}</Text>
                    <Text style={styles.weatherDayScore}>{w.score}pts</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Days */}
            {displayResult ? displayResult.days.map(day => (
              <View key={day.dayNumber} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>📅 Ngày {day.dayNumber}</Text>
                  {day.weatherSummary && (
                    <Text style={styles.dayWeather}>{day.weatherSummary}</Text>
                  )}
                  <View style={styles.dayMeta}>
                    <Ionicons name="navigate" size={12} color={Colors.secondary} />
                    <Text style={styles.dayMetaText}>{day.routeDistanceKm} km</Text>
                  </View>
                </View>

                {day.places.length === 0 ? (
                  <Text style={styles.emptyDay}>Không có địa điểm cho ngày này</Text>
                ) : (
                  <View style={styles.routeList}>
                    {day.places.map((slot, idx) => (
                      <RouteNode
                        key={slot.place.id}
                        item={slot}
                        index={idx}
                        isLast={idx === day.places.length - 1}
                        onRemove={!optimizedDays?.isSmartOptimized ? removePlace : undefined}
                        onMoveUp={!optimizedDays?.isSmartOptimized && idx > 0 ? moveUp : undefined}
                        onMoveDown={!optimizedDays?.isSmartOptimized && idx < day.places.length - 1 ? moveDown : undefined}
                        isVip={isVip}
                      />
                    ))}
                  </View>
                )}
              </View>
            )) : (
              <View style={styles.emptyHint}>
                <Ionicons name="map-outline" size={48} color={Colors.divider} />
                <Text style={styles.emptyHintText}>Quay lại bước 2 để thêm địa điểm.</Text>
              </View>
            )}

            {/* Warnings */}
            {displayResult && displayResult.warnings.length > 0 && (
              <View style={styles.warningsBox}>
                <Text style={styles.warningsTitle}>⚠️ Lưu ý:</Text>
                {displayResult.warnings.map((w, i) => (
                  <Text key={i} style={styles.warningItem}>• {w}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
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
            title={step === 3 ? '✅ Lưu lịch trình' : 'Tiếp theo →'}
            onPress={handleNext}
            loading={saveItinerary.isPending}
            disabled={!canGoNext()}
            style={styles.footerBtnNext}
            fullWidth={false}
          />
        </View>
      </View>

      {/* ── Place Picker Modal ── */}
      <Modal visible={showPlaceModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn địa điểm</Text>
            <TouchableOpacity onPress={() => setShowPlaceModal(false)}>
              <Ionicons name="close" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm địa điểm..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {placesLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={filteredPlaces}
              keyExtractor={p => p.id}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.placePickerItem} onPress={() => { addPlace(item); }}>
                  <View style={styles.placePickerLeft}>
                    <View style={styles.placePickerIcon}>
                      <Ionicons name="location" size={18} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.placePickerName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.placePickerCat}>{item.category} · {item.avg_duration_min || 60}ph</Text>
                    </View>
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color={Colors.accent} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: Colors.secondary, marginTop: 40 }}>Không tìm thấy địa điểm</Text>}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: 44,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...Typography.h2, color: Colors.white, flex: 1, textAlign: 'center' },

  // Progress
  progressBar: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  stepItem: { flex: 1, alignItems: 'center', flexDirection: 'column' },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.secondary + '60',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 3,
  },
  stepCircleActive: { backgroundColor: Colors.accent },
  stepNum: { ...Typography.caption, color: Colors.surface, fontSize: 11, fontWeight: '700' },
  stepNumActive: { color: Colors.primary },
  stepLabel: { ...Typography.caption, color: Colors.surface + '99', fontSize: 9, textAlign: 'center' },
  stepLabelActive: { color: Colors.accent },
  stepConnector: { position: 'absolute', right: 0, top: 13, width: '40%', height: 2, backgroundColor: Colors.secondary + '40' },
  stepConnectorActive: { backgroundColor: Colors.accent },

  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 100 },

  // Cards
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  cardLabel: { ...Typography.label, color: Colors.primary, marginBottom: Spacing.sm },
  sectionLabel: { ...Typography.label, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.md },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.divider,
  },
  stepperValue: { ...Typography.display, color: Colors.accent, fontSize: 36, minWidth: 60, textAlign: 'center' },

  // Date button
  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.divider,
    gap: Spacing.sm,
  },
  dateBtnText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },

  // Options grid
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  optionChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1.5, borderColor: Colors.divider,
    gap: Spacing.xs,
  },
  optionChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
  optionEmoji: { fontSize: 16 },
  optionLabel: { ...Typography.caption, color: Colors.textSecondary },
  optionLabelActive: { color: Colors.primary, fontWeight: '700' },

  // Selected places
  selectedPlaceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  selectedPlaceIndex: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  selectedPlaceNum: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  selectedPlaceInfo: { flex: 1 },
  selectedPlaceName: { ...Typography.bodyBold, color: Colors.textPrimary },
  selectedPlaceCat: { ...Typography.caption, color: Colors.secondary },

  // Add place button
  addPlaceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.accent,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  addPlaceBtnText: { ...Typography.bodyBold, color: Colors.accent },

  // Empty state
  emptyHint: { alignItems: 'center', paddingVertical: 40, gap: Spacing.md },
  emptyHintText: { ...Typography.body, color: Colors.secondary, textAlign: 'center' },

  // VIP banner
  vipBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  vipBannerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  vipBannerTitle: { ...Typography.bodyBold, color: Colors.white },
  vipBannerDesc: { ...Typography.caption, color: Colors.surface + 'aa', fontSize: 10 },
  optimizeBtn: { paddingHorizontal: Spacing.sm, minHeight: 36 },

  vipLockBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  vipLockText: { ...Typography.caption, color: Colors.secondary, flex: 1 },
  vipLockLink: { ...Typography.caption, color: Colors.accent, fontWeight: '700' },

  // Weather summary
  weatherSummaryRow: {
    flexDirection: 'row', gap: Spacing.sm,
    marginBottom: Spacing.md, flexWrap: 'wrap',
  },
  weatherDayChip: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider,
    minWidth: 64,
  },
  weatherDayIcon: { fontSize: 20 },
  weatherDayNum: { ...Typography.caption, color: Colors.secondary, fontSize: 10 },
  weatherDayScore: { ...Typography.caption, color: Colors.primary, fontWeight: '700', fontSize: 11 },

  // Day section
  daySection: { marginBottom: Spacing.xl },
  dayHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: Spacing.sm, gap: Spacing.sm },
  dayTitle: { ...Typography.h3, color: Colors.primary },
  dayWeather: { ...Typography.caption, color: Colors.textSecondary, flex: 1, fontSize: 11 },
  dayMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayMetaText: { ...Typography.caption, color: Colors.secondary, fontSize: 11 },
  emptyDay: { ...Typography.caption, color: Colors.secondary, fontStyle: 'italic' },
  routeList: { gap: 8 },

  // Warnings
  warningsBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1, borderColor: '#F59E0B',
    marginTop: Spacing.md,
  },
  warningsTitle: { ...Typography.bodyBold, color: '#92400E', marginBottom: Spacing.xs },
  warningItem: { ...Typography.caption, color: '#78350F', marginTop: 3 },

  // Footer
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.md },
  footerBtnBack: { flex: 1 },
  footerBtnNext: { flex: 2 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.white },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  modalTitle: { ...Typography.h3, color: Colors.primary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.sm, ...Typography.body, color: Colors.textPrimary },
  placePickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  placePickerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  placePickerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  placePickerName: { ...Typography.bodyBold, color: Colors.textPrimary },
  placePickerCat: { ...Typography.caption, color: Colors.secondary },
});
