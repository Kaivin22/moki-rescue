import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Switch, FlatList, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { SearchBar } from '@/src/components/organisms/SearchBar';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useInfinitePlaces, useSavedPlaces } from '@/src/hooks/usePlaces';
import { FilterState, Place } from '@/src/types/place';
import { CATEGORIES, SUITABLE_FOR, categoryLabel } from '@/src/utils/format';
import { useAuthStore } from '@/src/stores/authStore';
import { haversineKm } from '@/src/features/itinerary/services/routeOptimizer';
import { useCurrentLocation } from '@/src/features/location/hooks/useCurrentLocation';
import { clearSearchHistory, getSearchHistoryKey, readSearchHistory } from '@/src/features/search/searchHistory';

const emptyFilters = (): FilterState => ({ categories: [], suitableFor: [], minDuration: null, minRating: null, openNow: false });

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { user } = useAuthStore();
  const { coordinate, status: locationStatus, requestLocation } = useCurrentLocation(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortMode, setSortMode] = useState<'rating' | 'duration' | 'distance'>('rating');
  const [history, setHistory] = useState<string[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    categories: params.category ? [params.category as string] : [],
    suitableFor: params.suitableFor ? [params.suitableFor as string] : [],
    minDuration: null,
    minRating: null,
    openNow: false,
  });
  const [draftFilters, setDraftFilters] = useState<FilterState>(() => ({ ...filters, categories: [...filters.categories], suitableFor: [...filters.suitableFor] }));

  const [showFilterModal, setShowFilterModal] = useState(false);

  // Expo Router giữ tab Search được mount; đồng bộ lại khi Home mở một danh mục khác.
  useEffect(() => {
    const category = typeof params.category === 'string' ? params.category : undefined;
    const suitableFor = typeof params.suitableFor === 'string' ? params.suitableFor : undefined;
    const sort = params.sort === 'distance' || params.sort === 'duration' ? params.sort : 'rating';
    setFilters({ ...emptyFilters(), categories: category ? [category] : [], suitableFor: suitableFor ? [suitableFor] : [] });
    setSortMode(sort);
  }, [params.category, params.suitableFor, params.sort]);

  const historyKey = getSearchHistoryKey(user?.id);

  useFocusEffect(useCallback(() => {
    let active = true;
    readSearchHistory(user?.id).then((items) => {
      if (active) setHistory(items);
    });
    return () => { active = false; };
  }, [user?.id]));

  const saveHistory = async (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 10);
    setHistory(newHistory);
    await AsyncStorage.setItem(historyKey, JSON.stringify(newHistory));
  };

  const clearHistory = async () => {
    setHistory([]);
    await clearSearchHistory(user?.id);
  };

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const {
    data: placePages, isLoading, error, refetch, isRefetching,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfinitePlaces(filters, debouncedQuery, null);
  const places = useMemo(() => placePages?.pages.flat() ?? [], [placePages]);
  const { data: savedPlacesList } = useSavedPlaces(user?.id);
  const savedIds = useMemo(() => new Set((savedPlacesList || []).map(p => p.id)), [savedPlacesList]);
  const searchSuggestions = useMemo(() => (places ?? []).slice(0, 4).map((place) => place.name), [places]);

  const sortedPlaces = useMemo(() => {
    if (!places) return [];
    const list = places.map((place) => ({
      ...place,
      distanceKm: coordinate && Number.isFinite(place.lat) && Number.isFinite(place.lng)
        ? haversineKm(coordinate.latitude, coordinate.longitude, place.lat, place.lng)
        : undefined,
    }));

    if (sortMode === 'rating') {
      list.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
    } else if (sortMode === 'duration') {
      list.sort((a, b) => (a.avg_duration_min || 0) - (b.avg_duration_min || 0));
    } else if (sortMode === 'distance') {
      list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }
    return list;
  }, [places, sortMode, coordinate]);

  const chooseSearch = (query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
    void saveHistory(query);
  };

  const selectDistanceSort = async () => {
    if (!coordinate) {
      const result = await requestLocation();
      if (!result) {
        Alert.alert(
          locationStatus === 'denied' ? 'Chưa có quyền vị trí' : 'Không lấy được vị trí',
          'Bạn có thể cấp quyền vị trí trong cài đặt hoặc chọn cách sắp xếp khác.'
        );
        return;
      }
    }
    setSortMode('distance');
  };

  const toggleCategory = (id: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(id)
        ? prev.categories.filter(c => c !== id)
        : [...prev.categories, id]
    }));
  };

  const toggleDraftCategory = (id: string) => {
    setDraftFilters((current) => ({
      ...current,
      categories: current.categories.includes(id) ? current.categories.filter((value) => value !== id) : [...current.categories, id],
    }));
  };

  const openFilters = () => {
    setDraftFilters({ ...filters, categories: [...filters.categories], suitableFor: [...filters.suitableFor] });
    setShowFilterModal(true);
  };

  const removeFilter = (key: keyof FilterState, val?: string) => {
    setFilters(prev => {
      if (key === 'categories') return { ...prev, categories: prev.categories.filter(x => x !== val) };
      if (key === 'suitableFor') return { ...prev, suitableFor: prev.suitableFor.filter(x => x !== val) };
      if (key === 'openNow') return { ...prev, openNow: false };
      return { ...prev, [key]: null };
    });
  };

  const activeFiltersCount =
    filters.categories.length +
    filters.suitableFor.length +
    (filters.minDuration !== null ? 1 : 0) +
    (filters.minRating !== null ? 1 : 0) +
    (filters.openNow ? 1 : 0);

  const renderActiveFilters = () => {
    if (activeFiltersCount === 0) return null;
    return (
      <ScrollView horizontal style={styles.activeFiltersViewport} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
        {filters.categories.map(c => (
          <TouchableOpacity key={`cat_${c}`} style={styles.activeFilterChip} onPress={() => removeFilter('categories', c)}>
            <Text style={styles.activeFilterText}>{categoryLabel(c)}</Text>
            <Ionicons name="close" size={14} color={Colors.white} />
          </TouchableOpacity>
        ))}
        {filters.suitableFor.map(s => (
          <TouchableOpacity key={`suit_${s}`} style={styles.activeFilterChip} onPress={() => removeFilter('suitableFor', s)}>
            <Text style={styles.activeFilterText}>{SUITABLE_FOR.find(x => x.id === s)?.label}</Text>
            <Ionicons name="close" size={14} color={Colors.white} />
          </TouchableOpacity>
        ))}
        {filters.minRating !== null && (
          <TouchableOpacity style={styles.activeFilterChip} onPress={() => removeFilter('minRating')}>
            <Text style={styles.activeFilterText}>≥ {filters.minRating} ⭐</Text>
            <Ionicons name="close" size={14} color={Colors.white} />
          </TouchableOpacity>
        )}
        {filters.minDuration !== null && (
          <TouchableOpacity style={styles.activeFilterChip} onPress={() => removeFilter('minDuration')}>
            <Text style={styles.activeFilterText}>≥ {filters.minDuration} phút</Text>
            <Ionicons name="close" size={14} color={Colors.white} />
          </TouchableOpacity>
        )}
        {filters.openNow && (
          <TouchableOpacity style={styles.activeFilterChip} onPress={() => removeFilter('openNow')}>
            <Text style={styles.activeFilterText}>Đang mở cửa</Text>
            <Ionicons name="close" size={14} color={Colors.white} />
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  const renderEmptyState = () => {
    if (debouncedQuery.length === 0 && activeFiltersCount === 0) {
      return (
        <ScrollView style={styles.landingContainer} showsVerticalScrollIndicator={false}>
          {history.length > 0 && (
            <View style={styles.landingSection}>
              <View style={styles.landingSectionHeader}>
                <Text style={styles.landingSectionTitle}>Tìm kiếm gần đây</Text>
                <TouchableOpacity onPress={clearHistory} accessibilityRole="button" accessibilityLabel="Xóa lịch sử">
                  <Text style={styles.landingClearBtn}>Xóa</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyList}>
                {history.map((h, i) => (
                  <TouchableOpacity key={i} style={styles.historyItem} onPress={() => chooseSearch(h)}>
                    <Ionicons name="time-outline" size={18} color={Colors.secondary} />
                    <Text style={styles.historyText}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.landingSection}>
            <Text style={styles.landingSectionTitle}>Gợi ý tìm kiếm</Text>
            <View style={styles.trendingGrid}>
              {searchSuggestions.map(k => (
                <TouchableOpacity key={k} style={styles.trendingChip} onPress={() => chooseSearch(k)}>
                  <Ionicons name="search-outline" size={16} color={Colors.primary} />
                  <Text style={styles.trendingText}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={64} color={Colors.divider} />
        <Text style={[Typography.h3, { color: Colors.secondary, marginTop: Spacing.md }]}>Không tìm thấy kết quả</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm }]}>
          Thử thay đổi từ khóa hoặc nới lỏng các bộ lọc để tìm được nhiều địa điểm hơn.
        </Text>
      </View>
    );
  };

  const renderPlace = ({ item }: { item: Place }) => {
    const isSaved = savedIds.has(item.id);
    const distStr = item.distanceKm !== undefined ? `${item.distanceKm.toFixed(1)} km` : undefined;
    return (
      <View style={styles.gridItem}>
        <PlaceCard
          id={item.id}
          title={item.name}
          imageUrl={item.image_urls?.[0] || undefined}
          rating={item.rating_avg || 0}
          ratingCount={item.rating_count || 0}
          category={item.category}
          distance={distStr}
          isSaved={isSaved}
          compact
          onPress={() => router.push(`/place/${item.id}`)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <View style={styles.searchBarWrapper}>
            <SearchBar
              placeholder="Tìm kiếm địa điểm..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
              onSubmitEditing={() => void saveHistory(searchQuery.trim())}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={openFilters}
            accessibilityRole="button"
            accessibilityLabel="Mở bộ lọc"
          >
            <Ionicons name="options-outline" size={24} color={activeFiltersCount > 0 ? Colors.primary : Colors.textPrimary} />
            {activeFiltersCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Categories Scroll */}
        <ScrollView horizontal style={styles.quickCatViewport} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCatScroll}>
          {CATEGORIES.map(c => {
            const isActive = filters.categories.includes(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                accessibilityRole="switch"
                accessibilityState={{ checked: isActive }}
                style={[styles.quickCatChip, isActive && styles.quickCatChipActive]}
                onPress={() => toggleCategory(c.id)}
              >
                <Text style={[styles.quickCatText, isActive && styles.quickCatTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {renderActiveFilters()}

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Sort Controls */}
        {(debouncedQuery.length > 0 || activeFiltersCount > 0) && sortedPlaces.length > 0 && (
          <View style={styles.sortBar}>
            <Text style={[Typography.label, { color: Colors.secondary }]}>{sortedPlaces.length} kết quả</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
              <TouchableOpacity style={[styles.sortChip, sortMode === 'rating' && styles.sortChipActive]} onPress={() => setSortMode('rating')}>
                <Text style={[styles.sortText, sortMode === 'rating' && styles.sortTextActive]}>Top đánh giá</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sortChip, sortMode === 'distance' && styles.sortChipActive]} onPress={selectDistanceSort} disabled={locationStatus === 'loading'}>
                <Text style={[styles.sortText, sortMode === 'distance' && styles.sortTextActive]}>{locationStatus === 'loading' ? 'Đang định vị…' : 'Gần tôi'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {debouncedQuery.length === 0 && activeFiltersCount === 0 ? (
          renderEmptyState()
        ) : isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.errorText}>Lỗi tải dữ liệu. Hãy thử lại.</Text>
            <AppButton title={isRefetching ? 'Đang thử lại…' : 'Thử lại'} onPress={() => refetch()} disabled={isRefetching} style={{ marginTop: Spacing.md }} />
          </View>
        ) : sortedPlaces.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={sortedPlaces}
            keyExtractor={item => item.id}
            renderItem={renderPlace}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={styles.listFooter} /> : null}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={Typography.h3}>Lọc kết quả</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[Typography.h3, styles.filterSectionTitle]}>Thể loại</Text>
              <View style={styles.filterGrid}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.filterChip, draftFilters.categories.includes(c.id) && styles.filterChipActive]}
                    onPress={() => toggleDraftCategory(c.id)}
                  >
                    <Text style={[styles.filterChipText, draftFilters.categories.includes(c.id) && styles.filterChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[Typography.h3, styles.filterSectionTitle]}>Phù hợp cho</Text>
              <View style={styles.filterGrid}>
                {SUITABLE_FOR.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.filterChip, draftFilters.suitableFor.includes(c.id) && styles.filterChipActive]}
                    onPress={() => {
                      setDraftFilters(prev => ({
                        ...prev, suitableFor: prev.suitableFor.includes(c.id) ? prev.suitableFor.filter(x => x !== c.id) : [...prev.suitableFor, c.id]
                      }));
                    }}
                  >
                    <Text style={[styles.filterChipText, draftFilters.suitableFor.includes(c.id) && styles.filterChipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[Typography.h3, styles.filterSectionTitle]}>Đánh giá tối thiểu</Text>
              <View style={styles.filterGrid}>
                {[4.5, 4.0, 3.5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[styles.filterChip, draftFilters.minRating === rating && styles.filterChipActive]}
                    onPress={() => setDraftFilters(prev => ({ ...prev, minRating: prev.minRating === rating ? null : rating }))}
                  >
                    <Text style={[styles.filterChipText, draftFilters.minRating === rating && styles.filterChipTextActive]}>{rating}+ ⭐</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[Typography.h3, styles.filterSectionTitle]}>Thời gian tham quan</Text>
              <View style={styles.filterGrid}>
                {[30, 60, 120].map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.filterChip, draftFilters.minDuration === time && styles.filterChipActive]}
                    onPress={() => setDraftFilters(prev => ({ ...prev, minDuration: prev.minDuration === time ? null : time }))}
                  >
                    <Text style={[styles.filterChipText, draftFilters.minDuration === time && styles.filterChipTextActive]}>≥ {time} phút</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={Typography.bodyBold}>Đang mở cửa</Text>
                <Switch
                  value={draftFilters.openNow}
                  onValueChange={val => setDraftFilters(prev => ({ ...prev, openNow: val }))}
                  trackColor={{ false: Colors.divider, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
              <AppButton
                title="Xóa lọc"
                variant="outline"
                onPress={() => {
                  setDraftFilters(emptyFilters());
                }}
                style={{ flex: 1, marginRight: Spacing.md }}
              />
              <AppButton
                title="Áp dụng"
                onPress={() => {
                  setFilters({ ...draftFilters, categories: [...draftFilters.categories], suitableFor: [...draftFilters.suitableFor] });
                  setShowFilterModal(false);
                }}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchBarWrapper: {
    flex: 1,
    marginRight: Spacing.md,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.accent,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.white,
  },
  quickCatScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  quickCatViewport: { flexGrow: 0, height: 44 },
  quickCatChip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surface,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  quickCatChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  quickCatText: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  quickCatTextActive: {
    color: Colors.primary,
  },
  activeFiltersScroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.white,
  },
  activeFiltersViewport: { flexGrow: 0, maxHeight: 52, backgroundColor: Colors.white },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 4,
    minHeight: 36,
  },
  activeFilterText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  content: { flex: 1, padding: Spacing.md },
  sortBar: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  sortScroll: { paddingLeft: Spacing.sm, gap: Spacing.sm },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    minHeight: 36,
    justifyContent: 'center',
  },
  sortChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  sortTextActive: { color: Colors.white },

  flatListContent: { paddingBottom: Spacing.xxl },
  listFooter: { paddingVertical: Spacing.lg },
  gridRow: { justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: Spacing.md },

  landingContainer: { flex: 1 },
  landingSection: { marginBottom: Spacing.xl },
  landingSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  landingSectionTitle: { ...Typography.h3, color: Colors.textPrimary },
  landingClearBtn: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  historyList: { gap: Spacing.sm },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  historyText: { ...Typography.body, color: Colors.textPrimary },
  trendingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  trendingChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider },
  trendingText: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 13 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xl },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  closeBtn: { padding: 4 },
  modalBody: { padding: Spacing.lg },
  filterSectionTitle: { color: Colors.primaryDark, marginBottom: Spacing.sm, marginTop: Spacing.md },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.sky + '30' },
  filterChipText: { ...Typography.bodyBold, color: Colors.textSecondary, fontSize: 13 },
  filterChipTextActive: { color: Colors.primaryDark },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xl, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  modalFooter: { flexDirection: 'row', padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.white },
});
