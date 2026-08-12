import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ItineraryCard } from '@/src/components/molecules/ItineraryCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useInfiniteMyItineraries, useDeleteItinerary, type ItineraryHistoryFilter } from '@/src/hooks/useItineraries';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { localDateDifference, todayInTimeZone } from '@/src/utils/localDate';

export default function ItineraryHistoryScreen() {
  const user = useAuthStore((state) => state.user);
  const deleteMutation = useDeleteItinerary();

  const [activeTab, setActiveTab] = useState<ItineraryHistoryFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const today = todayInTimeZone();
  const query = useInfiniteMyItineraries(user?.id, activeTab, today);
  const itineraries = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  const onRefresh = async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Xóa lịch trình', `Bạn có chắc chắn muốn xóa "${title}" không?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await deleteMutation.mutateAsync(id);
        } catch (e: any) {
          Alert.alert('Lỗi', 'Không thể xóa: ' + e.message);
        }
      }}
    ]);
  };

  const renderRightActions = (id: string, title: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(id, title)}
      >
        <Ionicons name="trash-outline" size={24} color={Colors.white} />
        <Text style={styles.deleteActionText}>Xóa</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Sắp tới</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>Đã qua</Text>
        </TouchableOpacity>
      </View>

      {query.isLoading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : query.isError && itineraries.length === 0 ? (
        <View style={styles.center}>
          <Text style={[Typography.body, { color: Colors.error }]}>Đã có lỗi xảy ra. Vui lòng thử lại.</Text>
          <TouchableOpacity style={[styles.createBtn, { marginTop: Spacing.md }]} onPress={() => query.refetch()}>
            <Text style={styles.createBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : itineraries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={64} color={Colors.divider} style={{ marginBottom: Spacing.md }} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'all' ? 'Chưa có lịch trình nào' :
             activeTab === 'upcoming' ? 'Không có chuyến đi sắp tới' : 'Không có chuyến đi nào đã qua'}
          </Text>
          <Text style={styles.emptyDesc}>Bắt đầu lên kế hoạch cho chuyến đi Đà Nẵng tuyệt vời của bạn ngay hôm nay!</Text>

          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/(tabs)/create')}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.createBtnText}>Tạo lịch trình mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={itineraries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          renderItem={({ item }) => {
            const isFuture = Boolean(item.start_date && item.start_date > today);
            const isOngoing = Boolean(item.start_date && item.start_date <= today && (item.end_date ?? item.start_date) >= today);
            const isActive = isFuture || isOngoing;
            const daysLeft = isFuture && item.start_date ? localDateDifference(today, item.start_date) : null;

            return (
              <Swipeable renderRightActions={() => renderRightActions(item.id, item.title)}>
                <View style={{ marginBottom: Spacing.md, backgroundColor: Colors.background }}>
                  <ItineraryCard
                    title={item.title}
                    imageUrl={item.cover_image_url || undefined}
                    days={item.num_days}
                    authorName="Bạn"
                    onPress={() => router.push(`/itinerary/${item.id}`)}
                  />
                  {/* Status Badge overlays */}
                  <View style={styles.statusBadgeWrap}>
                    <View style={[styles.statusBadge, isActive ? styles.statusUpcoming : styles.statusPast]}>
                      <Text style={styles.statusText}>{isOngoing ? 'Đang diễn ra' : isFuture ? 'Sắp tới' : 'Đã qua'}</Text>
                    </View>
                  </View>
                  {daysLeft !== null && daysLeft <= 30 && (
                    <View style={styles.countdownBadge}>
                      <Text style={styles.countdownText}>Còn {daysLeft} ngày 🚀</Text>
                    </View>
                  )}
                </View>
              </Swipeable>
            );
          }}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={query.isFetchingNextPage
            ? <ActivityIndicator color={Colors.primary} style={styles.listFooter} />
            : query.isError
              ? <TouchableOpacity style={styles.loadMoreButton} onPress={() => query.fetchNextPage()}><Text style={styles.loadMoreText}>Thử tải tiếp</Text></TouchableOpacity>
              : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabs: {
    flexDirection: 'row',
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  tabActive: {
    backgroundColor: Colors.primary + '15',
  },
  tabText: {
    ...Typography.bodyBold,
    color: Colors.secondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  createBtnText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  deleteAction: {
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    marginLeft: Spacing.sm,
  },
  deleteActionText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadgeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  statusUpcoming: {
    backgroundColor: Colors.lime,
  },
  statusPast: {
    backgroundColor: Colors.surface,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '700',
  },
  countdownBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  countdownText: {
    ...Typography.caption,
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  listFooter: { marginVertical: Spacing.md },
  loadMoreButton: { alignSelf: 'center', padding: Spacing.md },
  loadMoreText: { ...Typography.bodyBold, color: Colors.primary },
});
