import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useI18n } from '@/src/i18n';
import { communicationApi as api, nextCursor, type Cursor } from './api';
import { CommunicationPage, QueryState, More, dateText, s, useLiveScreen, errorText } from './shared';

export function NotificationEntry() {
  const en = useI18n((state) => state.language === 'en');
  const userId = useAuthStore((state) => state.user?.id);
  const live = useLiveScreen();
  const query = useQuery({
    queryKey: ['communication', userId, 'unread'],
    queryFn: api.unread,
    enabled: !!userId && live,
    refetchInterval: live ? 15000 : false,
  });
  return (
    <NavigationCard
      icon="notifications-outline"
      title={en ? 'Notifications' : 'Thông báo'}
      description={
        query.isError
          ? en
            ? 'Could not load unread count. Open to retry.'
            : 'Chưa tải được số chưa đọc. Mở để thử lại.'
          : query.data
            ? `${query.data.count} ${en ? 'unread' : 'chưa đọc'}`
            : en
              ? 'Open inbox'
              : 'Mở hộp thông báo'
      }
      onPress={() => router.push('/notifications' as Href)}
    />
  );
}

export function InboxScreen() {
  const en = useI18n((state) => state.language === 'en');
  const userId = useAuthStore((state) => state.user?.id);
  const [unread, setUnread] = useState(false);
  const live = useLiveScreen();
  const query = useInfiniteQuery({
    queryKey: ['communication', userId, 'inbox', unread],
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => api.inbox(unread, pageParam),
    getNextPageParam: nextCursor,
    enabled: !!userId && live,
    refetchInterval: live ? 15000 : false,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <CommunicationPage title={en ? 'Notifications' : 'Thông báo'}>
      <Text style={s.body}>
        {en
          ? 'Updates are saved here even without device push. Requires an internet connection.'
          : 'Thông báo được lưu tại đây dù chưa bật push trên điện thoại. Cần kết nối mạng để cập nhật.'}
      </Text>
      <View style={s.filters}>
        {[false, true].map((value) => (
          <AppButton
            key={String(value)}
            fullWidth={false}
            title={value ? (en ? 'Unread' : 'Chưa đọc') : en ? 'All' : 'Tất cả'}
            variant={unread === value ? 'primary' : 'outline'}
            onPress={() => setUnread(value)}
          />
        ))}
      </View>
      <QueryState query={query} empty={!items.length} />
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`${item.readAt ? '' : en ? 'Unread. ' : 'Chưa đọc. '}${item.title}`}
          style={[s.card, !item.readAt && s.unread]}
          onPress={() => router.push(`/notifications/${item.id}` as Href)}
        >
          <Text style={s.title}>
            {!item.readAt ? '● ' : ''}
            {item.title}
          </Text>
          <Text style={s.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={s.body}>{dateText(item.createdAt, en)}</Text>
        </Pressable>
      ))}
      <More query={query} />
    </CommunicationPage>
  );
}

export function NotificationDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  return <NotificationDetail key={id} id={id} />;
}
function NotificationDetail({ id }: { id: string }) {
  const en = useI18n((state) => state.language === 'en');
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const attempted = useRef(false);
  const query = useQuery({
    queryKey: ['communication', userId, 'notification', id],
    queryFn: () => api.notification(id),
    enabled: !!userId && !!id,
  });
  const mark = useMutation({
    mutationFn: () => api.read(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['communication', userId] }),
  });
  const { mutate } = mark;
  useEffect(() => {
    if (query.data && !query.data.readAt && !attempted.current) {
      attempted.current = true;
      mutate();
    }
  }, [query.data, mutate]);
  const item = query.data;
  return (
    <CommunicationPage
      title={en ? 'Notification details' : 'Chi tiết thông báo'}
      fallback={'/notifications' as Href}
    >
      <QueryState query={query} />
      {mark.isError && (
        <>
          <Text style={s.error}>{errorText(mark.error, en)}</Text>
          <AppButton
            title={en ? 'Mark as read' : 'Đánh dấu đã đọc'}
            loading={mark.isPending}
            onPress={() => mark.mutate()}
          />
        </>
      )}
      {item && (
        <>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.body}>{dateText(item.createdAt, en)}</Text>
          <Text selectable style={s.body}>
            {item.body}
          </Text>
          {item.targetType !== 'announcement' && (
            <AppButton
              title={en ? 'Open related content' : 'Mở nội dung liên quan'}
              onPress={() =>
                router.push(
                  (item.targetType === 'support'
                    ? `/support/${item.targetId}`
                    : `/rescue/${item.targetId}`) as Href,
                )
              }
            />
          )}
          {item.targetType === 'announcement' && (
            <Text style={s.body}>
              {en
                ? 'This is a one-way announcement. For questions, open a separate support ticket from Help.'
                : 'Đây là thông báo một chiều. Nếu cần trao đổi, mở phiếu riêng tại Trợ giúp.'}
            </Text>
          )}
        </>
      )}
    </CommunicationPage>
  );
}
