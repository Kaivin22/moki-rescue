import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { ConfirmAction } from '@/src/components/atoms/ConfirmAction';
import { AppInput } from '@/src/components/atoms/AppInput';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { useAuthStore } from '@/src/stores/authStore';
import { useI18n } from '@/src/i18n';
import { communicationApi as api, nextCursor, type Audience, type Cursor, type Announcement } from './api';
import { CommunicationPage, QueryState, More, dateText, s, errorText, audienceLabel } from './shared';

export function AnnouncementListScreen() {
  const en = useI18n((state) => state.language === 'en');
  const userId = useAuthStore((state) => state.user?.id);
  const query = useInfiniteQuery({
    queryKey: ['communication', userId, 'announcements'],
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) => api.announcements(pageParam),
    getNextPageParam: nextCursor,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <CommunicationPage title={en ? 'Manage announcements' : 'Quản lý thông báo'} fallback="/operator">
      <AppButton
        title={en ? 'Compose announcement' : 'Soạn thông báo'}
        onPress={() => router.push('/operator/announcements/new' as Href)}
      />
      <QueryState query={query} empty={!items.length} />
      {items.map((item) => (
        <NavigationCard
          key={item.id}
          icon="megaphone-outline"
          title={`${item.withdrawnAt ? (en ? '[Withdrawn] ' : '[Đã thu hồi] ') : ''}${item.title}`}
          description={`${audienceLabel(item.audience, en)} · ${item.recipientCount} ${en ? 'inboxes' : 'hộp thông báo'}\n${dateText(item.createdAt, en)}`}
          onPress={() => router.push(`/operator/announcements/${item.id}` as Href)}
        />
      ))}
      <More query={query} />
    </CommunicationPage>
  );
}
export function AnnouncementDetailScreen() {
  const client = useQueryClient();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const en = useI18n((state) => state.language === 'en');
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: ['communication', userId, 'announcement', id],
    queryFn: () => api.announcement(id),
    enabled: !!id,
  });
  const item = query.data;
  return (
    <CommunicationPage
      title={en ? 'Published announcement' : 'Thông báo đã gửi'}
      fallback={'/operator/announcements' as Href}
    >
      <QueryState query={query} />
      {item && (
        <>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.body}>{audienceLabel(item.audience, en)}</Text>
          <Text style={s.body}>{dateText(item.createdAt, en)}</Text>
          <Text selectable style={s.body}>
            {item.body}
          </Text>
          <Text style={s.body}>
            {en
              ? `Saved to ${item.recipientCount} inboxes. This is not a read count or a device push receipt.`
              : `Đã lưu vào ${item.recipientCount} hộp thông báo. Đây không phải số người đã đọc hoặc số điện thoại đã nhận push.`}
          </Text>
          {item.withdrawnAt ? (
            <Text style={s.body}>
              {en
                ? 'This announcement has been withdrawn from recipients’ inboxes.'
                : 'Thông báo đã được thu hồi khỏi hộp thông báo của người nhận.'}
            </Text>
          ) : (
            <>
              <AnnouncementEditor key={`${item.id}:${item.version}`} item={item} />
              <ConfirmAction
                title={en ? 'Withdraw announcement' : 'Thu hồi thông báo'}
                message={
                  en
                    ? 'Remove this announcement from all recipients’ inboxes? The administration record is retained.'
                    : 'Thu hồi thông báo khỏi toàn bộ người nhận? Hồ sơ gửi vẫn được giữ cho quản trị.'
                }
                onConfirm={async () => {
                  await api.withdrawAnnouncement(item.id, item.version);
                  await client.invalidateQueries({ queryKey: ['communication'] });
                }}
              />
            </>
          )}
        </>
      )}
    </CommunicationPage>
  );
}
function AnnouncementEditor({ item }: { item: Announcement }) {
  const en = useI18n((s) => s.language === 'en');
  const client = useQueryClient();
  const [editing, setEditing] = useState(false),
    [title, setTitle] = useState(item.title),
    [body, setBody] = useState(item.body);
  const save = useMutation({
    mutationFn: () =>
      api.editAnnouncement(item.id, { title: title.trim(), body: body.trim(), version: item.version }),
    onSuccess: async () => {
      setEditing(false);
      await client.invalidateQueries({ queryKey: ['communication'] });
    },
  });
  return (
    <View style={s.card}>
      <AppButton
        title={en ? 'Edit content' : 'Sửa nội dung'}
        variant="outline"
        disabled={save.isPending}
        onPress={() => setEditing(!editing)}
      />
      {editing && (
        <>
          <Text style={s.body}>
            {en
              ? 'Updates apply to the same recipients. Notifications they deleted stay deleted.'
              : 'Cập nhật cho cùng nhóm người nhận. Thông báo họ đã xóa sẽ không xuất hiện lại.'}
          </Text>
          <AppInput
            label={en ? 'Title' : 'Tiêu đề'}
            value={title}
            onChangeText={setTitle}
            maxLength={160}
            editable={!save.isPending}
          />
          <AppInput
            label={en ? 'Content' : 'Nội dung'}
            value={body}
            onChangeText={setBody}
            maxLength={4000}
            multiline
            editable={!save.isPending}
          />
          <AppButton
            title={en ? 'Save changes' : 'Lưu thay đổi'}
            loading={save.isPending}
            disabled={title.trim().length < 5 || body.trim().length < 10}
            onPress={() => save.mutate()}
          />
          {save.isError && (
            <Text accessibilityRole="alert" style={s.error}>
              {errorText(save.error, en)}
            </Text>
          )}
        </>
      )}
    </View>
  );
}
export function NewAnnouncementScreen() {
  const en = useI18n((state) => state.language === 'en');
  const userId = useAuthStore((state) => state.user?.id);
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('customer');
  const [previewing, setPreviewing] = useState(false);
  const submission = useRef<{ key: string; id: string } | null>(null);
  const preview = useQuery({
    queryKey: ['communication', userId, 'audience', audience],
    queryFn: () => api.preview(audience),
    enabled: previewing,
    staleTime: 0,
  });
  const mutation = useMutation({
    mutationFn: () => {
      const input = { audience, title: title.trim(), body: body.trim() };
      const key = JSON.stringify(input);
      if (!submission.current || submission.current.key !== key)
        submission.current = { key, id: randomUUID() };
      return api.publish({ ...input, id: submission.current.id });
    },
    onSuccess: (sent) => {
      void client.invalidateQueries({ queryKey: ['communication'] });
      router.replace(`/operator/announcements/${sent.id}` as Href);
    },
  });
  return (
    <CommunicationPage
      title={
        previewing
          ? en
            ? 'Review before sending'
            : 'Xem lại trước khi gửi'
          : en
            ? 'Compose announcement'
            : 'Soạn thông báo'
      }
      fallback={'/operator/announcements' as Href}
    >
      <Text style={s.body}>
        {en
          ? 'One-way announcement saved in the app, without SMS/email or new device push. Only accounts active at publication are recipients.'
          : 'Thông báo một chiều lưu trong app, không gửi SMS/email hoặc push mới đến điện thoại. Chỉ gửi cho tài khoản đang hoạt động tại thời điểm gửi.'}
      </Text>
      {previewing ? (
        <>
          <View style={s.card}>
            <Text style={s.title}>{title.trim()}</Text>
            <Text style={s.body}>{audienceLabel(audience, en)}</Text>
            <Text selectable style={s.body}>
              {body.trim()}
            </Text>
          </View>
          <QueryState query={preview} />
          {preview.data && (
            <Text style={s.title}>
              {en
                ? `Estimated recipients: ${preview.data.count}`
                : `Số tài khoản dự kiến nhận: ${preview.data.count}`}
            </Text>
          )}
          <Text style={s.body}>
            {en
              ? 'The final count can change before publication. You can edit or withdraw the announcement from its details page.'
              : 'Số thực tế có thể thay đổi trước lúc gửi. Bạn có thể sửa hoặc thu hồi trong trang chi tiết thông báo.'}
          </Text>
          {mutation.isError && (
            <Text accessibilityRole="alert" style={s.error}>
              {errorText(mutation.error, en)}
            </Text>
          )}
          <AppButton
            title={en ? 'Confirm and send' : 'Xác nhận gửi thông báo'}
            loading={mutation.isPending}
            disabled={!preview.isSuccess || preview.isFetching || !preview.data?.count}
            onPress={() => mutation.mutate()}
          />
          <AppButton
            title={en ? 'Back to editing' : 'Quay lại chỉnh sửa'}
            variant="outline"
            disabled={mutation.isPending}
            onPress={() => setPreviewing(false)}
          />
        </>
      ) : (
        <>
          <Text style={s.title}>{en ? 'Recipient group' : 'Nhóm nhận thông báo'}</Text>
          <View style={s.filters}>
            {(['customer', 'provider', 'admin', 'all'] as const).map((value) => (
              <AppButton
                key={value}
                title={audienceLabel(value, en)}
                fullWidth={false}
                variant={value === audience ? 'primary' : 'outline'}
                onPress={() => setAudience(value)}
              />
            ))}
          </View>
          <AppInput
            label={en ? 'Title (5–160 characters)' : 'Tiêu đề (5–160 ký tự)'}
            value={title}
            onChangeText={setTitle}
            maxLength={160}
          />
          <AppInput
            label={en ? 'Content (10–4000 characters)' : 'Nội dung (10–4000 ký tự)'}
            value={body}
            onChangeText={setBody}
            maxLength={4000}
            multiline
          />
          <AppButton
            title={en ? 'Review recipients and content' : 'Xem trước nội dung và người nhận'}
            disabled={title.trim().length < 5 || body.trim().length < 10}
            onPress={() => setPreviewing(true)}
          />
        </>
      )}
    </CommunicationPage>
  );
}
