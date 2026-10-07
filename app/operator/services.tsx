import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { AppButton } from '@/src/components/atoms/AppButton';
import { OperatorPage } from '@/src/features/operator/OperatorPage';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/spacing';
import { useCopy, useI18n } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Danh mục dịch vụ',
    hint: 'Chọn dịch vụ cần chỉnh sửa.',
    loading: 'Đang tải…',
    error: 'Không tải được dịch vụ.',
    retry: 'Thử lại',
    empty: 'Chưa có dịch vụ.',
    active: 'Đang hoạt động',
    inactive: 'Đang tắt',
  },
  en: {
    title: 'Service catalog',
    hint: 'Choose a service to edit.',
    loading: 'Loading…',
    error: 'Could not load services.',
    retry: 'Retry',
    empty: 'No services yet.',
    active: 'Active',
    inactive: 'Disabled',
  },
} as const;
export default function ServicesScreen() {
  const c = useCopy(COPY);
  const english = useI18n((state) => state.language === 'en');
  const catalog = useQuery({ queryKey: rescueKeys.adminServices, queryFn: rescueApi.adminServiceTypes });
  return (
    <OperatorPage title={c.title}>
      <Text style={styles.text}>{c.hint}</Text>
      {catalog.isLoading ? <Text style={styles.text}>{c.loading}</Text> : null}
      {catalog.isError ? (
        <>
          <Text accessibilityRole="alert" style={styles.error}>
            {catalog.error instanceof ApiClientError ? catalog.error.message : c.error}
          </Text>
          <AppButton title={c.retry} onPress={() => void catalog.refetch()} />
        </>
      ) : null}
      {catalog.isSuccess && catalog.data.length === 0 ? <Text style={styles.text}>{c.empty}</Text> : null}
      {(catalog.data ?? []).map((service) => (
        <NavigationCard
          key={service.code}
          title={english ? service.labelEn : service.labelVi}
          description={service.active ? c.active : c.inactive}
          icon="construct-outline"
          onPress={() =>
            router.push({ pathname: '/operator/service/[code]', params: { code: service.code } })
          }
        />
      ))}
    </OperatorPage>
  );
}
const styles = StyleSheet.create({
  text: { ...Typography.body, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.error },
});
