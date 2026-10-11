import { useFocusEffect, router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { AppButton } from '@/src/components/atoms/AppButton';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useI18n } from '@/src/i18n';

// Poll only while this screen is focused and the application is in the foreground.
export function useLiveScreen() {
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);
  return focused && foreground;
}
export function CommunicationPage({
  title,
  children,
  fallback = '/(tabs)/profile',
}: {
  title: string;
  children: React.ReactNode;
  fallback?: Href;
}) {
  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScreenHeader
        title={title}
        onBack={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      />
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function QueryState({
  query,
  empty = false,
}: {
  query: {
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    isFetching: boolean;
    refetch: () => unknown;
  };
  empty?: boolean;
}) {
  const en = useI18n((state) => state.language === 'en');
  return (
    <>
      {query.isLoading && <ActivityIndicator accessibilityLabel={en ? 'Loading' : 'Đang tải'} />}
      {query.isError && (
        <Text accessibilityRole="alert" style={s.error}>
          {errorText(query.error, en)}
        </Text>
      )}
      {!query.isError && !query.isLoading && empty && (
        <Text style={s.body}>{en ? 'No items yet.' : 'Chưa có nội dung.'}</Text>
      )}
      <AppButton
        title={en ? 'Refresh' : 'Tải lại'}
        variant="ghost"
        loading={query.isFetching}
        onPress={() => {
          void query.refetch();
        }}
      />
    </>
  );
}
export function More({
  query,
}: {
  query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
}) {
  const en = useI18n((state) => state.language === 'en');
  return query.hasNextPage ? (
    <AppButton
      title={en ? 'Load more' : 'Xem thêm'}
      variant="outline"
      loading={query.isFetchingNextPage}
      onPress={() => {
        void query.fetchNextPage();
      }}
    />
  ) : null;
}
export function errorText(error: unknown, en: boolean) {
  return error instanceof ApiClientError
    ? error.message
    : en
      ? 'Could not save. Check your connection and retry.'
      : 'Không thực hiện được. Kiểm tra kết nối rồi thử lại.';
}
export function dateText(value: string, en: boolean) {
  return new Date(value).toLocaleString(en ? 'en-US' : 'vi-VN');
}
export const statusLabel = (status: string, en: boolean) =>
  ({
    all: ['Tất cả', 'All'],
    open: ['Chờ quản trị viên', 'Waiting for admin'],
    waiting_user: ['Chờ người dùng', 'Waiting for user'],
    resolved: ['Đã xử lý', 'Resolved'],
    dismissed: ['Đã bác bỏ', 'Dismissed'],
  })[status]?.[en ? 1 : 0] ?? status;
export const audienceLabel = (role: string, en: boolean) =>
  ({
    all: ['Tất cả người dùng', 'All users'],
    customer: ['Khách hàng', 'Customers'],
    provider: ['Cứu hộ viên', 'Providers'],
    admin: ['Quản trị viên', 'Administrators'],
  })[role]?.[en ? 1 : 0] ?? role;
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },
  body: { ...Typography.body, color: Colors.textSecondary },
  title: { ...Typography.h3, color: Colors.textPrimary },
  error: { ...Typography.body, color: Colors.error },
  card: {
    padding: Spacing.md,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  unread: { borderColor: Colors.primary, borderWidth: 2 },
  private: { borderColor: Colors.error, borderWidth: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
