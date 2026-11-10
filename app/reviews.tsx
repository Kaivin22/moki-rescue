import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { apiRequest } from '@/src/features/rescue/api/client';
import { useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/stores/authStore';

interface Review {
  id: string;
  providerName: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
}
interface Page {
  items: Review[];
  nextOffset: number | null;
}
export default function ReviewsScreen() {
  const english = useI18n((s) => s.language === 'en');
  const userId = useAuthStore((s) => s.user?.id);
  const reviews = useInfiniteQuery({
    queryKey: ['reviews', userId],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => apiRequest<Page>(`/api/reviews?offset=${pageParam}`),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
  });
  const items = reviews.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <>
      <Stack.Screen options={{ title: english ? 'Customer reviews' : 'Đánh giá từ khách hàng' }} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {reviews.isPending ? <Text>{english ? 'Loading…' : 'Đang tải…'}</Text> : null}
        {reviews.isError ? (
          <AppButton title={english ? 'Retry' : 'Thử lại'} onPress={() => void reviews.refetch()} />
        ) : null}
        {reviews.isSuccess && !items.length ? (
          <Text>{english ? 'No reviews yet.' : 'Chưa có đánh giá.'}</Text>
        ) : null}
        {items.map((item) => (
          <View
            key={item.id}
            style={{ backgroundColor: Colors.cardBg, borderRadius: 12, padding: 16, gap: 8 }}
          >
            <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}>{item.providerName}</Text>
            <Text accessibilityLabel={`${item.rating}/5`}>
              {'★'.repeat(item.rating)}
              {'☆'.repeat(5 - item.rating)}
            </Text>
            {item.comment ? <Text style={{ color: Colors.textPrimary }}>{item.comment}</Text> : null}
            <Text style={{ color: Colors.textMuted }}>
              {new Date(item.createdAt).toLocaleDateString(english ? 'en-GB' : 'vi-VN')}
              {item.hidden ? (english ? ' · Hidden' : ' · Đã ẩn') : ''}
            </Text>
          </View>
        ))}
        {reviews.hasNextPage ? (
          <AppButton
            title={english ? 'Load more' : 'Xem thêm'}
            loading={reviews.isFetchingNextPage}
            onPress={() => void reviews.fetchNextPage()}
          />
        ) : null}
      </ScrollView>
    </>
  );
}
