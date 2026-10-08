import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { useI18n } from '@/src/i18n';
import { OperatorPage } from './OperatorPage';

export function ProviderDirectoryScreen() {
  const english = useI18n((state) => state.language === 'en');
  const client = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');
  const [confirmation, setConfirmation] = useState<{ id: string; decision: 'active' | 'rejected' } | null>(
    null,
  );
  const directory = useQuery({
    queryKey: ['rescue', 'provider-directory'],
    queryFn: rescueApi.providerDirectory,
  });
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'active' | 'rejected' }) =>
      rescueApi.reviewProvider(id, decision),
    onSuccess: async () => {
      setConfirmation(null);
      await client.invalidateQueries({ queryKey: rescueKeys.all });
    },
    onError: () => {
      void directory.refetch();
    },
  });
  const labels = english
    ? {
        all: 'All',
        pending: 'Awaiting approval',
        active: 'Approved',
        rejected: 'Rejected',
        suspended: 'Suspended',
        left: 'Left',
        unassigned: 'No team assigned',
      }
    : {
        all: 'Tất cả',
        pending: 'Chờ duyệt',
        active: 'Đã duyệt',
        rejected: 'Đã từ chối',
        suspended: 'Đình chỉ',
        left: 'Đã rời đội',
        unassigned: 'Chưa gắn cửa hàng',
      };
  const visible = directory.data?.filter((provider) => filter === 'all' || provider.status === filter) ?? [];
  return (
    <OperatorPage title={english ? 'Provider accounts and approvals' : 'Tài khoản và duyệt cứu hộ viên'}>
      <Text style={styles.note}>
        {english
          ? 'This list contains provider accounts, not shops. A seeded shop without a member will not appear. Approving a provider does not verify their shop.'
          : 'Đây là danh sách tài khoản cứu hộ viên, không phải cửa hàng. Cửa hàng mẫu chưa có thành viên sẽ không xuất hiện. Duyệt cứu hộ viên không đồng nghĩa với xác minh cửa hàng.'}
      </Text>
      <View style={styles.filters}>
        {(['all', 'pending', 'active', 'rejected'] as const).map((value) => (
          <AppButton
            key={value}
            title={`${labels[value]} (${directory.data?.filter((p) => value === 'all' || p.status === value).length ?? 0})`}
            variant={filter === value ? 'primary' : 'outline'}
            onPress={() => {
              setFilter(value);
              setConfirmation(null);
            }}
          />
        ))}
      </View>
      <AppButton
        title={english ? 'Refresh list' : 'Tải lại danh sách'}
        variant="outline"
        loading={directory.isFetching}
        onPress={() => void directory.refetch()}
      />
      {directory.isPending ? (
        <Text style={styles.note}>{english ? 'Loading providers…' : 'Đang tải cứu hộ viên…'}</Text>
      ) : null}
      {directory.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {directory.error instanceof ApiClientError
            ? directory.error.message
            : english
              ? 'Could not load providers. Retry the connection.'
              : 'Không tải được cứu hộ viên. Hãy thử kết nối lại.'}
        </Text>
      ) : null}
      {review.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {review.error instanceof ApiClientError
            ? review.error.message
            : english
              ? 'Could not save decision.'
              : 'Không lưu được quyết định.'}
        </Text>
      ) : null}
      {directory.isSuccess && visible.length === 0 ? (
        <Text style={styles.note}>
          {english ? 'No accounts match this filter.' : 'Không có tài khoản thuộc bộ lọc này.'}
        </Text>
      ) : null}
      {visible.map((provider) => (
        <View key={provider.userId} style={styles.card}>
          <Text style={styles.title}>{provider.displayName}</Text>
          <Text style={styles.note}>{provider.teamName ?? labels.unassigned}</Text>
          <Text style={styles.note}>{labels[provider.status]}</Text>
          {!provider.accountActive ? (
            <Text style={styles.error}>{english ? 'Account disabled' : 'Tài khoản bị khóa'}</Text>
          ) : null}
          {provider.teamStatus && provider.teamStatus !== 'verified' ? (
            <Text style={styles.note}>
              {english
                ? 'The shop is not verified; this account cannot go available yet.'
                : 'Cửa hàng chưa được xác minh hoặc bị đình chỉ; tài khoản chưa thể bật nhận ca.'}
            </Text>
          ) : null}
          {provider.status === 'pending' && provider.accountActive ? (
            <>
              <AppButton
                title={english ? 'Approve' : 'Chấp nhận'}
                disabled={review.isPending || provider.teamStatus === 'suspended'}
                onPress={() => {
                  review.reset();
                  setConfirmation({ id: provider.userId, decision: 'active' });
                }}
              />
              <AppButton
                title={english ? 'Reject' : 'Từ chối'}
                variant="outline"
                disabled={review.isPending}
                onPress={() => {
                  review.reset();
                  setConfirmation({ id: provider.userId, decision: 'rejected' });
                }}
              />
            </>
          ) : null}
          {confirmation?.id === provider.userId && provider.status === 'pending' ? (
            <View style={styles.card}>
              <Text style={styles.note}>
                {english ? 'Confirm decision' : 'Xác nhận quyết định'}: {labels[confirmation.decision]}
              </Text>
              <AppButton
                title={english ? 'Confirm' : 'Xác nhận'}
                loading={review.isPending}
                onPress={() => review.mutate(confirmation)}
              />
              <AppButton
                title={english ? 'Cancel' : 'Hủy'}
                variant="ghost"
                disabled={review.isPending}
                onPress={() => setConfirmation(null)}
              />
            </View>
          ) : null}
          <AppButton
            title={english ? 'Open shop management' : 'Mở quản lý cửa hàng'}
            variant="outline"
            onPress={() =>
              router.push((provider.teamId ? `/operator/team/${provider.teamId}` : '/operator/teams') as Href)
            }
          />
        </View>
      ))}
    </OperatorPage>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { ...Typography.h3, color: Colors.textPrimary },
  note: { ...Typography.body, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.error },
});
