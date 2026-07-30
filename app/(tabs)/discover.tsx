import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { AnimatedBackground } from '@/src/components/atoms/AnimatedBackground';
import { SearchBar } from '@/src/components/organisms/SearchBar';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { usePlaces } from '@/src/hooks/usePlaces';
import { useUIStore } from '@/src/stores/uiStore';
import { categoryLabel } from '@/src/utils/format';

const FILTERS = [
  { id: 'all', label: 'Tất cả', category: null as string | null },
  { id: 'beach', label: 'Bãi biển', category: 'beach' },
  { id: 'mountain', label: 'Núi', category: 'mountain' },
  { id: 'food', label: 'Ẩm thực', category: 'food' },
  { id: 'historical', label: 'Di tích', category: 'historical' },
  { id: 'viewpoint', label: 'Ngắm cảnh', category: 'viewpoint' },
];

export default function DiscoverScreen() {
  const { searchQuery, setSearchQuery, selectedCategory, setCategory } = useUIStore();
  const [sortMode, setSortMode] = useState<'default' | 'rating' | 'new'>('default');

  const { data: places, isLoading, error } = usePlaces(
    undefined,
    searchQuery,
    selectedCategory && selectedCategory !== 'all' ? selectedCategory : null
  );

  const sortedPlaces = useMemo(() => {
    if (!places) return [];
    const list = [...places];
    if (sortMode === 'rating') {
      list.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
    } else if (sortMode === 'new') {
      list.reverse();
    }
    return list;
  }, [places, sortMode]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedBackground 
        source={require('../../assets/images/hoian_panorama.jpg')} 
        height={180}
        duration={35000}
      >
        <View style={styles.header}>
          <Text style={[Typography.h1, styles.headerTitle]}>Khám phá</Text>
          <Text style={[Typography.caption, styles.headerSub]}>Phố cổ, biển xanh và hơn thế nữa</Text>
        </View>
      </AnimatedBackground>

      <View style={styles.searchSection}>
        <SearchBar
          placeholder="Tìm địa điểm tại Đà Nẵng..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          showFilter
          onFilterPress={() =>
            setSortMode((m) => (m === 'default' ? 'rating' : m === 'rating' ? 'new' : 'default'))
          }
        />
        <Text style={[Typography.caption, styles.sortHint]}>
          Sắp xếp: {sortMode === 'default' ? 'Mặc định' : sortMode === 'rating' ? 'Đánh giá cao' : 'Mới nhất'}
        </Text>
      </View>

      <View style={styles.tabsSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {FILTERS.map((cat) => {
            const active = (selectedCategory || 'all') === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tab, active && styles.activeTab]}
                onPress={() => setCategory(cat.id === 'all' ? null : cat.category)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[Typography.bodyBold, active ? styles.activeTabText : styles.inactiveTabText]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
        ) : error ? (
          <Text style={styles.errorText}>Không tải được dữ liệu địa điểm.</Text>
        ) : sortedPlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={56} color={Colors.secondary} />
            <Text style={[Typography.h3, { color: Colors.primary, marginTop: Spacing.md }]}>
              Không tìm thấy kết quả
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {sortedPlaces.map((place) => (
              <View key={place.id} style={styles.gridItem}>
                <PlaceCard
                  title={place.name}
                  imageUrl={place.image_urls?.[0]}
                  rating={place.rating_avg}
                  ratingCount={place.rating_count}
                  category={place.category}
                  compact
                  style={{ width: '100%', marginRight: 0 }}
                  onPress={() => router.push(`/place/${place.id}`)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.white,
  },
  headerSub: {
    color: Colors.accentSoft,
    marginTop: 4,
  },
  searchSection: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  sortHint: {
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  tabsSection: {
    backgroundColor: Colors.background,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.md,
  },
  tab: {
    marginRight: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
  },
  activeTabText: {
    color: Colors.primary,
  },
  inactiveTabText: {
    color: Colors.secondary,
  },
  content: {
    padding: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
