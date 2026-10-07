import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { useI18n } from '@/src/i18n';
import { OperatorPage } from './OperatorPage';
import { moderationApi, type ModerationCursor, type ModerationKind } from './moderationApi';

const TITLES = {
  reviews: ['Đánh giá của khách hàng', 'Customer reviews'],
  incidents: ['Khiếu nại và báo sự cố', 'Complaints and incidents'],
  'quality-alerts': ['Cảnh báo chất lượng', 'Quality alerts'],
} as const;
const FILTERS = {
  reviews: ['all', 'visible', 'hidden'],
  incidents: ['all', 'open', 'resolved', 'dismissed'],
  'quality-alerts': ['all', 'open', 'warned', 'resolved'],
} as const;
const LABELS: Record<string, [string, string]> = {
  all: ['Tất cả', 'All'],
  visible: ['Đang hiển thị', 'Visible'],
  hidden: ['Đã ẩn', 'Hidden'],
  open: ['Chưa xử lý', 'Open'],
  resolved: ['Đã xử lý', 'Resolved'],
  dismissed: ['Đã bác bỏ', 'Dismissed'],
  warned: ['Đã cảnh báo', 'Warned'],
  warning: ['Cần xác minh', 'Needs investigation'],
  critical: ['Mức nghiêm trọng', 'Critical'],
  provider_conduct: ['Thái độ cứu hộ viên', 'Provider conduct'],
  service_quality: ['Chất lượng dịch vụ', 'Service quality'],
  safety: ['An toàn', 'Safety'],
  property_damage: ['Thiệt hại tài sản', 'Property damage'],
  other: ['Vấn đề khác', 'Other'],
};
const label = (value: string, en: boolean) => LABELS[value]?.[en ? 1 : 0] ?? value;

export function ModerationListScreen({ kind }: { kind: ModerationKind }) {
  const en = useI18n((s) => s.language === 'en');
  const [status, setStatus] = useState('all');
  const query = useInfiniteQuery({
    queryKey: ['moderation', kind, status],
    initialPageParam: undefined as ModerationCursor | undefined,
    queryFn: ({ pageParam }) => moderationApi.list(kind, status, pageParam),
    getNextPageParam: (page) =>
      page.nextBefore && page.nextBeforeId
        ? { before: page.nextBefore, beforeId: page.nextBeforeId }
        : undefined,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <OperatorPage title={TITLES[kind][en ? 1 : 0]}>
      <Text style={styles.body}>
        {en
          ? 'Select an item to inspect and handle it on its own page.'
          : 'Chọn một nội dung để xem và xử lý ở trang riêng.'}
      </Text>
      <View style={styles.filters}>
        {FILTERS[kind].map((value) => (
          <AppButton
            key={value}
            title={label(value, en)}
            fullWidth={false}
            variant={status === value ? 'primary' : 'outline'}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>
      {query.isLoading && <ActivityIndicator accessibilityLabel={en ? 'Loading' : 'Đang tải'} />}
      {query.isError && (
        <Text accessibilityRole="alert" style={styles.error}>
          {en ? 'Could not load this inbox. Try again.' : 'Không tải được danh sách. Hãy thử lại.'}
        </Text>
      )}
      <AppButton
        title={en ? 'Refresh' : 'Tải lại'}
        variant="ghost"
        loading={query.isRefetching}
        onPress={() => void query.refetch()}
      />
      {query.isSuccess && !items.length && (
        <Text style={styles.body}>{en ? 'No matching items.' : 'Không có nội dung phù hợp bộ lọc.'}</Text>
      )}
      {items.map((item) => (
        <NavigationCard
          key={item.id}
          icon={kind === 'reviews' ? 'star-outline' : 'warning-outline'}
          title={`${item.teamName} · ${kind === 'reviews' ? item.subject : label(item.subject, en)}`}
          description={`${label(item.status, en)}${item.rating != null ? ` · ${item.rating}/5` : ''}\n${new Date(item.createdAt).toLocaleString(en ? 'en-US' : 'vi-VN')}`}
          onPress={() => router.push(`/operator/${kind}/${item.id}` as Href)}
        />
      ))}
      {query.hasNextPage && (
        <AppButton
          title={en ? 'Load more' : 'Xem thêm'}
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      )}
    </OperatorPage>
  );
}

type Decision = 'hide' | 'restore' | 'resolved' | 'dismissed' | 'warn';
export function ModerationDetailScreen({ kind }: { kind: ModerationKind }) {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  return <ModerationDetailBody key={`${kind}:${id}`} kind={kind} id={id} />;
}

function ModerationDetailBody({ kind, id }: { kind: ModerationKind; id: string }) {
  const en = useI18n((s) => s.language === 'en');
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['moderation', kind, 'detail', id],
    queryFn: () => moderationApi.detail(kind, id),
    enabled: Boolean(id),
  });
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const item = query.data;
  const mutation = useMutation({
    mutationFn: async (decision: Decision) => {
      if (kind === 'reviews') return rescueApi.setReviewVisibility(id, decision === 'hide', note.trim());
      if (kind === 'incidents')
        return rescueApi.resolveIncident(
          id,
          decision === 'dismissed' ? 'dismissed' : 'resolved',
          note.trim(),
        );
      return decision === 'warn'
        ? rescueApi.warnQualityAlert(id, note.trim())
        : rescueApi.resolveQualityAlert(id, note.trim());
    },
    onSuccess: async () => {
      setNote('');
      setMessage(en ? 'Decision saved.' : 'Đã lưu kết quả xử lý.');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['moderation'] }),
        client.invalidateQueries({ queryKey: ['rescue'] }),
      ]);
    },
  });
  const submit = async (decision: Decision) => {
    if (mutation.isPending) return;
    if (note.trim().length < 5) {
      setMessage(en ? 'Enter a reason of at least 5 characters.' : 'Nhập lý do xử lý ít nhất 5 ký tự.');
      return;
    }
    setMessage(null);
    try {
      await mutation.mutateAsync(decision);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : en
            ? 'Could not save. Refresh and retry.'
            : 'Không lưu được. Hãy tải lại và thử lại.',
      );
    }
  };
  const actionable =
    item &&
    (kind === 'reviews' || item.status === 'open' || (kind === 'quality-alerts' && item.status === 'warned'));
  return (
    <OperatorPage title={TITLES[kind][en ? 1 : 0]} fallback={`/operator/${kind}` as Href}>
      {query.isLoading && <ActivityIndicator />}
      {(query.isError || !id) && (
        <Text style={styles.error}>
          {en ? 'Item not found or unavailable.' : 'Không tìm thấy hoặc không tải được nội dung.'}
        </Text>
      )}
      <AppButton
        title={en ? 'Refresh' : 'Tải lại'}
        variant="ghost"
        loading={query.isFetching}
        onPress={() => void query.refetch()}
      />
      {item && (
        <>
          <Text style={styles.heading}>{item.teamName}</Text>
          <Text style={styles.body}>{kind === 'reviews' ? item.subject : label(item.subject, en)}</Text>
          <Text style={styles.body}>
            {label(item.status, en)} · {new Date(item.createdAt).toLocaleString(en ? 'en-US' : 'vi-VN')}
          </Text>
          {item.rating != null && (
            <Text style={styles.heading}>
              {item.rating}/5
              {item.ratingCount != null ? ` · ${item.ratingCount} ${en ? 'reviews' : 'đánh giá'}` : ''}
            </Text>
          )}
          <Text selectable style={styles.body}>
            {item.body || (en ? 'No written comment.' : 'Không có nhận xét bằng văn bản.')}
          </Text>
          {item.resolutionNote && (
            <View style={styles.card}>
              <Text style={styles.heading}>{en ? 'Previous decision' : 'Kết quả xử lý trước đó'}</Text>
              <Text selectable style={styles.body}>
                {item.resolutionNote}
              </Text>
            </View>
          )}
          {item.requestId && (
            <NavigationCard
              title={en ? 'Related rescue case' : 'Ca cứu hộ liên quan'}
              icon="document-text-outline"
              onPress={() => router.push(`/rescue/${item.requestId}`)}
            />
          )}
          <NavigationCard
            title={en ? 'Team profile' : 'Hồ sơ đội cứu hộ'}
            icon="people-outline"
            onPress={() => router.push(`/operator/team/${item.teamId}`)}
          />
          {kind === 'reviews' && (
            <Text style={styles.body}>
              {en
                ? 'Do not hide a review just because it is negative. Record a verifiable moderation reason; the original rating and comment are not edited.'
                : 'Không ẩn chỉ vì đánh giá thấp. Cần lý do kiểm duyệt có thể kiểm chứng; không sửa số sao hoặc lời nhận xét của khách.'}
            </Text>
          )}
          {kind === 'quality-alerts' && (
            <Text style={styles.body}>
              {en
                ? 'This is a signal for investigation, not an automatic suspension.'
                : 'Đây là tín hiệu cần xác minh, không tự động đình chỉ đội.'}
            </Text>
          )}
          {actionable && (
            <View style={styles.card}>
              <AppInput
                label={en ? 'Decision and reason' : 'Kết quả xác minh và lý do xử lý'}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={500}
              />
              {kind === 'reviews' ? (
                <AppButton
                  title={
                    item.status === 'hidden'
                      ? en
                        ? 'Restore review'
                        : 'Hiển thị lại đánh giá'
                      : en
                        ? 'Hide review'
                        : 'Ẩn đánh giá'
                  }
                  loading={mutation.isPending}
                  onPress={() => void submit(item.status === 'hidden' ? 'restore' : 'hide')}
                />
              ) : (
                <>
                  <AppButton
                    title={en ? 'Mark resolved' : 'Xác nhận đã xử lý'}
                    loading={mutation.isPending}
                    onPress={() => void submit('resolved')}
                  />
                  {kind === 'incidents' && (
                    <AppButton
                      title={en ? 'Dismiss with reason' : 'Bác bỏ có lý do'}
                      variant="outline"
                      disabled={mutation.isPending}
                      onPress={() => void submit('dismissed')}
                    />
                  )}
                  {kind === 'quality-alerts' && item.status === 'open' && (
                    <AppButton
                      title={en ? 'Issue warning' : 'Gửi cảnh báo cho đội'}
                      variant="outline"
                      disabled={mutation.isPending}
                      onPress={() => void submit('warn')}
                    />
                  )}
                </>
              )}
            </View>
          )}
        </>
      )}
      {message && (
        <Text accessibilityRole="alert" style={styles.body}>
          {message}
        </Text>
      )}
    </OperatorPage>
  );
}
const styles = StyleSheet.create({
  body: { ...Typography.body, color: Colors.textSecondary },
  heading: { ...Typography.h3, color: Colors.textPrimary },
  error: { ...Typography.body, color: Colors.error },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: { padding: Spacing.md, borderRadius: 16, backgroundColor: Colors.cardBg, gap: Spacing.md },
});
