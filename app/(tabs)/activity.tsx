import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { RequestSummaryCard } from '@/src/features/rescue/components/RequestSummaryCard';
import { useRequests } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Hoạt động',
    subtitle: 'Mỗi ca có lịch sử trạng thái và người tham gia được kiểm soát.',
    open: 'Đang mở',
    closed: 'Đã kết thúc',
    error: 'Không thể tải danh sách. Kéo xuống để thử lại.',
    noClosed: 'Chưa có ca đã kết thúc.',
    noOpen: 'Không có ca đang hoạt động.',
  },
  en: {
    title: 'Activity',
    subtitle: 'Each request has controlled status history and participant access.',
    open: 'Active',
    closed: 'Closed',
    error: 'Could not load requests. Pull down to try again.',
    noClosed: 'There are no closed requests.',
    noOpen: 'There are no active requests.',
  },
} as const;

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState(false);
  const requests = useRequests(history);
  const c = useCopy(COPY);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.subtitle}>{c.subtitle}</Text>
      </View>
      <View style={styles.switcher}>
        <Pressable
          onPress={() => setHistory(false)}
          style={[styles.switchItem, !history && styles.switchActive]}
        >
          <Text style={[styles.switchText, !history && styles.switchTextActive]}>{c.open}</Text>
        </Pressable>
        <Pressable
          onPress={() => setHistory(true)}
          style={[styles.switchItem, history && styles.switchActive]}
        >
          <Text style={[styles.switchText, history && styles.switchTextActive]}>{c.closed}</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 86 + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={requests.isRefetching}
            onRefresh={() => void requests.refetch()}
            tintColor={Colors.primary}
          />
        }
      >
        {requests.isError ? <Text style={styles.error}>{c.error}</Text> : null}
        {(requests.data ?? []).map((request) => (
          <RequestSummaryCard
            key={request.id}
            request={request}
            onPress={() => router.push(`/rescue/${request.id}`)}
          />
        ))}
        {!requests.isLoading && !requests.isError && requests.data?.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{history ? c.noClosed : c.noOpen}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingBottom: Spacing.md },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  switcher: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    padding: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
  },
  switchItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm },
  switchActive: { backgroundColor: Colors.cardBg },
  switchText: { ...Typography.bodyBold, color: Colors.textMuted },
  switchTextActive: { color: Colors.primary },
  content: { padding: Spacing.lg, gap: Spacing.md },
  error: { ...Typography.body, color: Colors.error },
  empty: {
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
  },
  emptyText: { ...Typography.body, color: Colors.textMuted },
});
