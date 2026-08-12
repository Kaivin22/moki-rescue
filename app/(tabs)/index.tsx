import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { SceneBackground } from '@/src/components/atoms/SceneBackground';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { useAuthStore } from '@/src/stores/authStore';
import { usePlaces, useSavedPlaces } from '@/src/hooks/usePlaces';
import { useTranslation } from '@/src/i18n';
import { CATEGORIES } from '@/src/utils/format';
import { useQuery } from '@tanstack/react-query';
import { fetchWeatherForecast } from '@/src/services/weatherService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthStore();
  const { data: places, isLoading, error, refetch: refetchPlaces } = usePlaces();
  const { data: savedPlacesList, refetch: refetchSavedPlaces } = useSavedPlaces(user?.id);
  const { t } = useTranslation();
  const { data: weather, isError: weatherError, refetch: refetchWeather } = useQuery({
    queryKey: ['weather', 'danang', 'home'],
    queryFn: () => fetchWeatherForecast(undefined, undefined, 3),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });

  const savedIds = useMemo(() => new Set((savedPlacesList || []).map(p => p.id)), [savedPlacesList]);

  const greeting = profile?.display_name
    ? `${t('home.greeting')}, ${profile.display_name.split(' ')[0]}`
    : `${t('home.greeting')}!`;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPlaces(), refetchSavedPlaces(), refetchWeather()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPlaces, refetchSavedPlaces, refetchWeather]);

  // Bộ sưu tập
  const topRatedPlaces = useMemo(() =>
    [...(places || [])].sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0)).slice(0, 5),
  [places]);

  const familyPlaces = useMemo(() =>
    places?.filter(p => p.suitable_for?.includes('family')).slice(0, 5) || [],
  [places]);

  const photoPlaces = useMemo(() =>
    places?.filter(p => p.tags?.includes('check-in') || p.tags?.includes('photo') || p.category === 'viewpoint').slice(0, 6) || [],
  [places]);

  const PlaceSkeleton = () => (
    <View style={[styles.horizontalCard, { height: 220, backgroundColor: Colors.surface, borderRadius: Radius.xl, marginRight: Spacing.md }]} />
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {/* Header Hero */}
        <SceneBackground
          scene="city"
          height={260}
        >
          <View style={[styles.headerOverlay, { paddingTop: insets.top + Spacing.md }]}>
            <View style={styles.headerTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.caption, styles.kicker]}>{greeting}</Text>
                <Text style={[Typography.h1, styles.heroTitle]}>{t('home.subtitle')}</Text>
              </View>
              <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile')} accessibilityRole="button">
                <Ionicons name="person-circle" size={40} color={Colors.white} />
              </TouchableOpacity>
            </View>

            {/* Thanh tìm kiếm nhanh dẫn sang tab Search */}
            <TouchableOpacity
              style={styles.heroSearchBtn}
              activeOpacity={0.9}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Ionicons name="search" size={20} color={Colors.primary} />
              <Text style={styles.heroSearchText}>Bạn muốn đi đâu hôm nay?</Text>
            </TouchableOpacity>
          </View>
        </SceneBackground>

        <View style={styles.weatherCard}>
          <View style={styles.weatherIconWrap}>
            <Text style={styles.weatherIcon}>{weather?.[0]?.icon ?? '☀️'}</Text>
          </View>
          <View style={styles.weatherCopy}>
            <Text style={styles.weatherTitle}>Thời tiết Đà Nẵng hôm nay</Text>
            <Text style={styles.weatherDescription}>
              {weatherError
                ? 'Tạm thời chưa tải được dự báo'
                : weather?.[0]
                  ? `${weather[0].description} · ${weather[0].tempMin}–${weather[0].tempMax}°C · mưa ${weather[0].rainSum} mm`
                  : 'Đang cập nhật dự báo…'}
            </Text>
          </View>
          {weather?.[0] && <Text style={styles.weatherScore}>{weather[0].score}/100</Text>}
        </View>

        {/* Bento Grid Thể loại */}
        <View style={styles.bentoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Khám phá theo thể loại</Text>
          </View>
          <View style={styles.bentoGrid}>
            {CATEGORIES.slice(0, 4).map((cat, index) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.bentoItem, index === 0 && styles.bentoItemLarge]}
                onPress={() => router.push(`/(tabs)/search?category=${cat.id}`)}
              >
                <View style={styles.bentoBg}>
                  <View style={styles.categoryIcon}>
                    <Ionicons name={(cat.icon ?? 'location-outline') as any} size={25} color={Colors.primary} />
                  </View>
                  <Text style={styles.bentoTitle}>{cat.label}</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
              {[1, 2, 3].map(k => <PlaceSkeleton key={k} />)}
            </ScrollView>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Lỗi tải dữ liệu. Vui lòng thử lại.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetchPlaces()} accessibilityRole="button">
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : places?.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="location-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Chưa có địa điểm đã xuất bản.</Text>
          </View>
        ) : (
          <View style={styles.collectionsWrapper}>
            {/* Top Đánh Giá (Thẻ bự) */}
            {topRatedPlaces.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Top đánh giá</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/search?sort=rating')}>
                    <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {topRatedPlaces.map(place => (
                    <PlaceCard
                      key={place.id}
                      {...place}
                      title={place.name}
                      rating={place.rating_avg || 0}
                      ratingCount={place.rating_count || 0}
                      imageUrl={place.image_urls?.[0] || undefined}
                      style={styles.horizontalCardLarge}
                      isSaved={savedIds.has(place.id)}
                      onPress={() => router.push(`/place/${place.id}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Check-in Sống Ảo (Lưới vuông) */}
            {photoPlaces.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Góc check-in sống ảo</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/search?category=viewpoint')}>
                    <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.squareList}>
                  {photoPlaces.map(place => (
                    <PlaceCard
                      key={place.id}
                      {...place}
                      title={place.name}
                      rating={place.rating_avg || 0}
                      ratingCount={place.rating_count || 0}
                      imageUrl={place.image_urls?.[0] || undefined}
                      style={styles.squareCard}
                      compact
                      isSaved={savedIds.has(place.id)}
                      onPress={() => router.push(`/place/${place.id}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Phù hợp cho Gia đình (Thẻ chuẩn) */}
            {familyPlaces.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Dành cho Gia đình</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/search?suitableFor=family')}>
                    <Text style={styles.seeAllText}>{t('home.seeAll')}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {familyPlaces.map(place => (
                    <PlaceCard
                      key={place.id}
                      {...place}
                      title={place.name}
                      rating={place.rating_avg || 0}
                      ratingCount={place.rating_count || 0}
                      imageUrl={place.image_urls?.[0] || undefined}
                      style={styles.horizontalCard}
                      isSaved={savedIds.has(place.id)}
                      onPress={() => router.push(`/place/${place.id}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing.lg },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)', // Dark overlay
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { color: Colors.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  heroTitle: { color: Colors.white, fontSize: 32, lineHeight: 40 },
  profileBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-end' },

  heroSearchBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md, paddingVertical: 14, borderRadius: Radius.full, gap: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5,
  },
  heroSearchText: { ...Typography.body, color: Colors.textSecondary },
  weatherCard: { marginHorizontal: Spacing.md, marginTop: -18, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  weatherIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  weatherIcon: { fontSize: 23 },
  weatherCopy: { flex: 1 },
  weatherTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  weatherDescription: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  weatherScore: { ...Typography.caption, color: Colors.primary, fontWeight: '800' },

  bentoSection: { padding: Spacing.md, marginTop: Spacing.md },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  bentoItem: { width: '48%', height: 86, borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: Colors.surface },
  bentoItemLarge: { width: '48%', height: 86 },
  bentoBg: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  categoryIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  bentoTitle: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },

  collectionsWrapper: { marginTop: Spacing.sm },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h2, color: Colors.textPrimary },
  seeAllText: { ...Typography.bodyBold, color: Colors.primary },

  horizontalList: { paddingLeft: Spacing.md, paddingRight: Spacing.sm },
  horizontalCard: { width: 220, marginRight: Spacing.md },
  horizontalCardLarge: { width: 280, marginRight: Spacing.md },

  squareList: { paddingLeft: Spacing.md, paddingRight: Spacing.sm },
  squareCard: { width: 140, marginRight: Spacing.md },

  loadingContainer: { marginTop: Spacing.xl },
  errorContainer: { padding: Spacing.xl, alignItems: 'center' },
  errorText: { color: Colors.error, ...Typography.body },
  emptyText: { color: Colors.textSecondary, ...Typography.body, marginTop: Spacing.sm, textAlign: 'center' },
  retryButton: { marginTop: Spacing.md, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.lg, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.primary },
  retryText: { ...Typography.bodyBold, color: Colors.primary },
});
