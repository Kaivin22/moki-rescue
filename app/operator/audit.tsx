import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Nhật ký quản trị',
    intro:
      'Nhật ký chỉ lưu ai làm gì, với đối tượng nào và thời điểm; không ghi token, tọa độ hay nội dung nhạy cảm.',
    actor: 'Người thực hiện',
    system: 'Hệ thống',
    entity: 'Đối tượng',
    empty: 'Chưa có sự kiện quản trị.',
    error: 'Không tải được nhật ký.',
    loadMore: 'Tải thêm',
  },
  en: {
    title: 'Administration audit log',
    intro:
      'The log records who did what, to which entity, and when. It excludes tokens, coordinates, and sensitive content.',
    actor: 'Actor',
    system: 'System',
    entity: 'Entity',
    empty: 'There are no administration events.',
    error: 'Could not load the audit log.',
    loadMore: 'Load more',
  },
} as const;

export default function AuditLogScreen() {
  const c = useCopy(COPY);
  const pageSize = 30;
  const logs = useInfiniteQuery({
    queryKey: ['rescue', 'audit-logs'],
    initialPageParam: undefined as { before: string; beforeId: number } | undefined,
    queryFn: ({ pageParam }) => rescueApi.auditLogs(pageParam, pageSize),
    getNextPageParam: (lastPage) =>
      lastPage.length < pageSize
        ? undefined
        : lastPage[lastPage.length - 1]
          ? {
              before: lastPage[lastPage.length - 1].createdAt,
              beforeId: lastPage[lastPage.length - 1].id,
            }
          : undefined,
  });
  const entries = logs.data?.pages.flatMap((page) => page) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.title} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={logs.isRefetching} onRefresh={() => void logs.refetch()} />
        }
      >
        <Text style={styles.intro}>{c.intro}</Text>
        {logs.isError ? <Text style={styles.error}>{c.error}</Text> : null}
        {!logs.isLoading && entries.length === 0 ? <Text style={styles.intro}>{c.empty}</Text> : null}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.heading}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <Text style={styles.action}>{entry.action}</Text>
            </View>
            <Text style={styles.meta}>
              {c.actor}: {entry.actorDisplayName ?? c.system}
            </Text>
            <Text style={styles.meta}>
              {c.entity}: {entry.entityType}
              {entry.entityId ? ` / ${entry.entityId}` : ''}
            </Text>
            <Text style={styles.time}>{new Date(entry.createdAt).toLocaleString()}</Text>
          </View>
        ))}
        {logs.hasNextPage ? (
          <AppButton
            title={c.loadMore}
            variant="outline"
            loading={logs.isFetchingNextPage}
            onPress={() => void logs.fetchNextPage()}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  intro: { ...Typography.body, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.error },
  card: {
    padding: Spacing.md,
    gap: Spacing.xs,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  action: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },
  meta: { ...Typography.caption, color: Colors.textSecondary },
  time: { ...Typography.caption, color: Colors.textMuted },
});
