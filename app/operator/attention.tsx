import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy } from '@/src/i18n';
import type { AttentionFlag } from '@/src/types/rescue';

const COPY = {
  vi: {
    title: 'Ca cần chú ý',
    body: 'Chỉ cảnh báo chưa xử lý được hiển thị. Mở ca để kiểm tra diễn biến trước khi đóng cảnh báo.',
    loadingError: 'Không tải được hàng đợi cảnh báo.',
    empty: 'Không có ca nào đang cần xử lý.',
    openRequest: 'Mở chi tiết ca',
    resolution: 'Kết quả xử lý',
    resolutionPlaceholder: 'Ví dụ: đã gọi hai bên và điều phối đội thay thế',
    resolve: 'Đánh dấu đã xử lý',
    noteRequired: 'Kết quả xử lý cần ít nhất 5 ký tự.',
    resolveError: 'Không thể đóng cảnh báo.',
    codes: {
      provider_start_timeout: 'Cứu hộ viên không xuất phát đúng hạn',
      provider_gps_stale: 'GPS cứu hộ viên đã cũ',
      arrival_confirmation_overdue: 'Khách chậm xác nhận cứu hộ viên đến',
      quote_decision_overdue: 'Khách chậm phản hồi báo giá',
      completion_confirmation_overdue: 'Khách chậm xác nhận hoàn tất',
      work_progress_overdue: 'Công việc kéo dài bất thường',
      provider_withdrew: 'Cứu hộ viên không thể tiếp tục',
      arrival_dispute: 'Lặp lại tranh chấp đã đến nơi',
      completion_dispute: 'Lặp lại tranh chấp hoàn tất',
      customer_support_requested: 'Khách yêu cầu điều phối hỗ trợ',
      customer_incident_reported: 'Khách gửi khiếu nại hoặc báo sự cố',
      approved_work_start_overdue: 'Đã duyệt nhưng công việc chưa bắt đầu',
    },
  },
  en: {
    title: 'Requests needing attention',
    body: 'Only unresolved alerts are shown. Review the request timeline before resolving an alert.',
    loadingError: 'Could not load the attention queue.',
    empty: 'There are no requests requiring action.',
    openRequest: 'Open request details',
    resolution: 'Resolution result',
    resolutionPlaceholder: 'Example: contacted both parties and assigned a replacement team',
    resolve: 'Mark as resolved',
    noteRequired: 'Resolution result must contain at least 5 characters.',
    resolveError: 'Could not resolve the alert.',
    codes: {
      provider_start_timeout: 'Provider did not depart on time',
      provider_gps_stale: 'Provider GPS is stale',
      arrival_confirmation_overdue: 'Customer arrival confirmation is overdue',
      quote_decision_overdue: 'Customer quote response is overdue',
      completion_confirmation_overdue: 'Customer completion confirmation is overdue',
      work_progress_overdue: 'Work is taking unusually long',
      provider_withdrew: 'Provider cannot continue',
      arrival_dispute: 'Repeated arrival dispute',
      completion_dispute: 'Repeated completion dispute',
      customer_support_requested: 'Customer requested dispatch support',
      customer_incident_reported: 'Customer submitted a complaint or incident report',
      approved_work_start_overdue: 'Approved work has not started',
    },
  },
} as const;

export default function AttentionQueueScreen() {
  const c = useCopy(COPY);
  const client = useQueryClient();
  const flags = useQuery({
    queryKey: rescueKeys.attention(true),
    queryFn: () => rescueApi.attentionFlags(true),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const resolve = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      rescueApi.resolveAttention(id, resolution),
    onSuccess: async () => {
      setSelected(null);
      setNote('');
      await Promise.all([
        client.invalidateQueries({ queryKey: rescueKeys.attention(true) }),
        client.invalidateQueries({ queryKey: rescueKeys.requests(false) }),
      ]);
    },
  });

  const submit = async (flag: AttentionFlag) => {
    if (note.trim().length < 5) {
      setMessage(c.noteRequired);
      return;
    }
    setMessage(null);
    try {
      await resolve.mutateAsync({ id: flag.id, resolution: note.trim() });
    } catch (error) {
      setMessage(error instanceof ApiClientError ? error.message : c.resolveError);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={c.title} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={flags.isRefetching} onRefresh={() => void flags.refetch()} />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.body}>{c.body}</Text>
        {flags.isError ? <Text style={styles.error}>{c.loadingError}</Text> : null}
        {!flags.isLoading && flags.data?.length === 0 ? <Text style={styles.body}>{c.empty}</Text> : null}
        {(flags.data ?? []).map((flag) => (
          <View key={flag.id} style={styles.card}>
            <View style={styles.titleRow}>
              <Ionicons name="warning-outline" size={22} color={Colors.warning} />
              <View style={styles.flex}>
                <Text style={styles.title}>{flag.serviceLabel}</Text>
                <Text style={styles.warning}>{c.codes[flag.code as keyof typeof c.codes] ?? flag.code}</Text>
              </View>
            </View>
            {flag.contextNote ? <Text style={styles.body}>{flag.contextNote}</Text> : null}
            <Text style={styles.caption}>{new Date(flag.detectedAt).toLocaleString()}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.openRequest}
              style={styles.openButton}
              onPress={() => router.push(`/rescue/${flag.requestId}`)}
            >
              <Text style={styles.openText}>{c.openRequest}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </Pressable>
            {selected === flag.id ? (
              <View style={styles.resolveBox}>
                <AppInput
                  label={c.resolution}
                  value={note}
                  onChangeText={setNote}
                  placeholder={c.resolutionPlaceholder}
                  maxLength={500}
                  multiline
                />
                {message ? <Text style={styles.error}>{message}</Text> : null}
                <AppButton title={c.resolve} onPress={() => void submit(flag)} loading={resolve.isPending} />
              </View>
            ) : (
              <AppButton
                title={c.resolve}
                variant="outline"
                onPress={() => {
                  setMessage(null);
                  setNote('');
                  setSelected(flag.id);
                }}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  body: { ...Typography.body, color: Colors.textSecondary },
  caption: { ...Typography.caption, color: Colors.textMuted },
  error: { ...Typography.body, color: Colors.error },
  card: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.cardBg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  title: { ...Typography.bodyBold, color: Colors.textPrimary },
  warning: { ...Typography.caption, color: Colors.warning },
  flex: { flex: 1 },
  openButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  openText: { ...Typography.bodyBold, color: Colors.primary },
  resolveBox: { gap: Spacing.sm },
});
