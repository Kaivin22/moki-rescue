import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import { useInfiniteMyReviews } from '@/src/features/places/api/reviews';

export default function MyReviewsScreen() {
  const user = useAuthStore((state) => state.user);
  const query = useInfiniteMyReviews(user?.id);
  const reviews = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);

  if (!user) return <SafeAreaView style={styles.center}><AppButton title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></SafeAreaView>;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.primary} /></TouchableOpacity><Text style={styles.headerTitle}>Đánh giá của tôi</Text><View style={{ width: 24 }} /></View>
      {query.isLoading ? <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={Colors.primary} /> : query.isError && reviews.length === 0 ? (
        <View style={styles.center}><Text style={styles.error}>Không thể tải đánh giá của bạn.</Text><AppButton title="Thử tải lại" onPress={() => query.refetch()} /></View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(review) => review.id}
          contentContainerStyle={[styles.content, reviews.length === 0 && styles.emptyContent]}
          refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} colors={[Colors.primary]} />}
          renderItem={({ item: review }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/place/${review.place_id}`)}>
              {review.place?.image_urls?.[0] ? <Image source={{ uri: review.place.image_urls[0] }} style={styles.image} contentFit="cover" /> : <View style={[styles.image, styles.imageEmpty]}><Ionicons name="image-outline" size={24} color={Colors.textMuted} /></View>}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{review.place?.name || 'Địa điểm không còn hiển thị'}</Text>
                <Text style={styles.rating}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
                {!!review.comment && <Text style={styles.comment} numberOfLines={3}>{review.comment}</Text>}
                <Text style={styles.meta}>{new Date(review.created_at).toLocaleDateString('vi-VN')} · {review.helpful_count} hữu ích</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Bạn chưa đánh giá địa điểm nào.</Text>}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={query.isFetchingNextPage
            ? <ActivityIndicator color={Colors.primary} style={styles.listFooter} />
            : query.isError
              ? <AppButton title="Tải tiếp" variant="outline" onPress={() => query.fetchNextPage()} style={styles.listFooter} />
              : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider }, headerTitle: { ...Typography.h2, color: Colors.primary },
  content: { padding: Spacing.md, gap: Spacing.sm }, emptyContent: { flexGrow: 1, justifyContent: 'center' }, card: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.white },
  image: { width: 76, height: 76, borderRadius: Radius.sm }, imageEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface }, info: { flex: 1, gap: 3 },
  title: { ...Typography.bodyBold, color: Colors.textPrimary }, rating: { color: Colors.warning, letterSpacing: 1 }, comment: { ...Typography.body, color: Colors.secondary }, meta: { ...Typography.caption, color: Colors.textMuted }, empty: { ...Typography.body, color: Colors.secondary, textAlign: 'center', padding: Spacing.xl },
  error: { ...Typography.body, color: Colors.error, textAlign: 'center', marginBottom: Spacing.md }, listFooter: { marginVertical: Spacing.md },
});
