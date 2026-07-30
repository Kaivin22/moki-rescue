import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AnimatedBackground } from '@/src/components/atoms/AnimatedBackground';
import { SearchBar } from '@/src/components/organisms/SearchBar';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { ItineraryCard } from '@/src/components/molecules/ItineraryCard';
import { useAuthStore } from '@/src/stores/authStore';
import { usePlaces } from '@/src/hooks/usePlaces';
import { usePublicItineraries } from '@/src/hooks/useItineraries';
import { categoryLabel } from '@/src/utils/format';

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const { data: places, isLoading, error } = usePlaces();
  const { data: itineraries, isLoading: loadingItineraries } = usePublicItineraries(6);

  const greeting = `Xin chào, ${profile?.display_name?.split(' ')[0] || 'bạn'}`;

  const quickActions = [
    { id: 'plan', label: 'Lập lịch', icon: 'calendar' as const, route: '/(tabs)/create' },
    { id: 'map', label: 'Bản đồ', icon: 'map' as const, route: '/(tabs)/map' },
    { id: 'ai', label: 'AI Chat', icon: 'chatbubbles' as const, route: '/ai/chat' },
    { id: 'vip', label: 'VIP', icon: 'star' as const, route: '/vip/upgrade' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AnimatedBackground 
          scene="city"
          source={require('../../assets/images/bridges_night_panorama.jpg')} 
          height={220}
          duration={30000}
        >
          <View style={styles.headerOverlay}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={[Typography.caption, styles.kicker]}>{greeting}</Text>
              <Text style={[Typography.h1, styles.heroTitle]}>Đà Nẵng đang chờ bạn</Text>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => router.push('/(tabs)/profile')}
              accessibilityLabel="Hồ sơ"
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.profileAvatar} />
              ) : (
                <View style={[styles.profileAvatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={20} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </AnimatedBackground>

        <View style={styles.searchSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(tabs)/discover')}>
            <View pointerEvents="none">
              <SearchBar placeholder="Tìm địa điểm, lịch trình..." editable={false} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionItem}
              onPress={() => router.push(action.route as any)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons name={action.icon} size={22} color={Colors.accent} />
              </View>
              <Text style={[Typography.caption, styles.actionLabel]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.h3, styles.sectionTitle]}>Gợi ý cho bạn</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
              <Text style={[Typography.bodyBold, styles.seeAll]}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.md }} />
          ) : error ? (
            <Text style={styles.errorText}>Không tải được địa điểm. Kiểm tra kết nối và thử lại.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {places?.slice(0, 8).map((place) => (
                <PlaceCard
                  key={place.id}
                  title={place.name}
                  imageUrl={place.image_urls?.[0]}
                  rating={place.rating_avg}
                  ratingCount={place.rating_count}
                  category={place.category}
                  onPress={() => router.push(`/place/${place.id}`)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[Typography.h3, styles.sectionTitle]}>Lịch trình nổi bật</Text>
          </View>

          {loadingItineraries ? (
            <ActivityIndicator color={Colors.primary} />
          ) : !itineraries?.length ? (
            <View style={styles.emptyBox}>
              <Text style={[Typography.body, { color: Colors.textSecondary }]}>
                Chưa có lịch trình công khai. Hãy tạo lịch trình đầu tiên của bạn.
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/create')} style={styles.emptyCta}>
                <Text style={[Typography.bodyBold, { color: Colors.primary }]}>Tạo lịch trình</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingHorizontal: Spacing.md }}>
              {itineraries.map((item) => (
                <ItineraryCard
                  key={item.id}
                  title={item.title}
                  imageUrl={item.cover_image_url || undefined}
                  days={item.num_days}
                  authorName={item.profiles?.display_name}
                  onPress={() => router.push(`/itinerary/${item.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  headerOverlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: 60, // Fixed padding for status bar instead of SafeArea
  },
  kicker: {
    color: Colors.accentSoft,
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    color: Colors.white,
  },
  profileBtn: {
    marginBottom: Spacing.xs,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  avatarFallback: {
    backgroundColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.lg,
    marginBottom: Spacing.xl,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  actionItem: {
    alignItems: 'center',
    minWidth: 64,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primary,
  },
  actionLabel: {
    color: Colors.textPrimary,
    fontFamily: Typography.bodyBold.fontFamily,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.primary,
  },
  seeAll: {
    color: Colors.secondary,
  },
  horizontalScroll: {
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    color: Colors.error,
    paddingHorizontal: Spacing.md,
  },
  emptyBox: {
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  emptyCta: {
    marginTop: Spacing.md,
  },
});
