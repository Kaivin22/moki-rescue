import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { PlaceCard } from '@/src/components/molecules/PlaceCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useInfiniteSavedPlaces } from '@/src/hooks/usePlaces';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/src/components/atoms/AppButton';

const { width } = Dimensions.get('window');

export default function SavedPlacesScreen() {
  const user = useAuthStore((state) => state.user);
  const query = useInfiniteSavedPlaces(user?.id);
  const savedPlaces = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  const renderEmptyState = () => {
    if (query.isLoading && !refreshing) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (query.isError) {
      return (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} style={{ marginBottom: Spacing.md }} />
          <Text style={[Typography.h3, { color: Colors.error, marginBottom: Spacing.sm }]}>Đã có lỗi xảy ra</Text>
          <Text style={[Typography.body, { color: Colors.secondary, textAlign: 'center', marginBottom: Spacing.xl }]}>
            Không thể tải danh sách địa điểm đã lưu.
          </Text>
          <AppButton title="Thử lại" onPress={() => query.refetch()} />
        </View>
      );
    }

    return (
      <View style={styles.center}>
        <View style={styles.emptyIconBox}>
          <Ionicons name="bookmark-outline" size={48} color={Colors.primary} />
        </View>
        <Text style={[Typography.h2, { color: Colors.primary, marginBottom: Spacing.sm }]}>Chưa có địa điểm nào</Text>
        <Text style={[Typography.body, { color: Colors.secondary, textAlign: 'center', marginBottom: Spacing.xl, paddingHorizontal: Spacing.xl }]}>
          Hãy khám phá và lưu lại những địa điểm bạn yêu thích để dễ dàng lên lịch trình sau này nhé!
        </Text>
        <AppButton title="Khám phá ngay" onPress={() => router.push('/(tabs)/search')} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Đã lưu', headerTitleStyle: Typography.h3, headerShadowVisible: false }} />

      <FlatList
        data={savedPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          savedPlaces.length === 0 && { flex: 1, justifyContent: 'center' }
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <PlaceCard
              id={item.id}
              title={item.name}
              imageUrl={item.image_urls?.[0]}
              rating={item.rating_avg}
              ratingCount={item.rating_count}
              category={item.category}
              onPress={() => router.push(`/place/${item.id}`)}
              style={styles.card}
            />
          </View>
        )}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={query.isFetchingNextPage
          ? <ActivityIndicator color={Colors.primary} style={styles.listFooter} />
          : query.isError && savedPlaces.length > 0
            ? <AppButton title="Tải tiếp" variant="outline" onPress={() => query.fetchNextPage()} style={styles.listFooter} />
            : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  list: {
    padding: Spacing.md,
  },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  cardWrapper: {
    marginBottom: Spacing.md,
  },
  card: {
    width: width - Spacing.md * 2, // Full width minus padding
  },
  listFooter: { marginVertical: Spacing.md },
});
