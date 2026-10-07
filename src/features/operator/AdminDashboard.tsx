import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { useI18n } from '@/src/i18n';
import { AdminCharts } from './AdminCharts';

export function AdminDashboard() {
  const english = useI18n((state) => state.language === 'en');
  const statistics = useQuery({
    queryKey: ['rescue', 'operator-statistics'],
    queryFn: rescueApi.statistics,
    refetchInterval: 30_000,
  });
  const error = statistics.error;
  const refresh = () => {
    void statistics.refetch();
  };
  const summary = statistics.data?.summary;
  const stats = [
    { label: english ? 'Open cases' : 'Ca đang mở', value: summary?.openCases },
    { label: english ? 'Awaiting a provider' : 'Chờ đội tiếp nhận', value: summary?.waitingCases },
    {
      label: english ? 'Verified teams' : 'Đội đã xác minh',
      value: summary?.verifiedTeams,
    },
    { label: english ? 'Open alerts' : 'Cảnh báo cần xử lý', value: summary?.openAlerts },
  ];
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={statistics.isRefetching} onRefresh={refresh} />}
      >
        <Text style={styles.title}>{english ? 'Operations overview' : 'Tổng quan vận hành'}</Text>
        <Text style={styles.subtitle}>
          {english
            ? 'Monitor the network and handle exceptions. This account does not receive rescue offers.'
            : 'Theo dõi mạng lưới và xử lý ca ngoại lệ. Tài khoản này không trực tiếp nhận ca cứu hộ.'}
        </Text>
        {error ? (
          <View style={styles.errorPanel}>
            <Text style={styles.error} accessibilityRole="alert">
              {error instanceof ApiClientError
                ? error.message
                : english
                  ? 'Could not load the overview.'
                  : 'Không tải được tổng quan.'}
            </Text>
            <AppButton
              title={english ? 'Retry connection' : 'Thử kết nối lại'}
              variant="outline"
              onPress={refresh}
            />
          </View>
        ) : null}
        <View style={styles.grid}>
          {stats.map((stat) => (
            <View style={styles.stat} key={stat.label}>
              <Text style={styles.number}>{stat.value == null ? '—' : stat.value}</Text>
              <Text style={styles.subtitle}>{stat.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.caption}>
          {english
            ? 'Live totals from the database. Charts cover the last 7 calendar days.'
            : 'Tổng hợp trực tiếp từ cơ sở dữ liệu. Biểu đồ tính trong 7 ngày gần nhất.'}
        </Text>
        {statistics.data ? (
          <AdminCharts data={statistics.data} english={english} />
        ) : (
          <Text style={styles.caption}>
            {english ? 'Charts are awaiting data.' : 'Biểu đồ đang chờ dữ liệu.'}
          </Text>
        )}
        <NavigationCard
          title={english ? 'Dispatch queue' : 'Hàng đợi điều phối'}
          description={
            english
              ? 'Inspect open cases and retry or reassign.'
              : 'Theo dõi ca đang mở, tìm lại đội và điều phối lại.'
          }
          icon="radio-outline"
          onPress={() => router.push('/(tabs)/operations')}
        />
        <NavigationCard
          title={english ? 'Cases needing attention' : 'Ca cần can thiệp'}
          description={english ? 'Resolve operational alerts.' : 'Xử lý cảnh báo và ghi kết quả can thiệp.'}
          icon="warning-outline"
          onPress={() => router.push('/operator/attention')}
        />
        <NavigationCard
          title={english ? 'Manage partner network' : 'Quản lý mạng lưới'}
          description={
            english
              ? 'Teams, providers, verification, services and permissions.'
              : 'Đội, cứu hộ viên, xác minh, dịch vụ và phân quyền.'
          }
          icon="people-outline"
          onPress={() => router.push('/operator')}
        />
        <NavigationCard
          title={english ? 'Audit log' : 'Nhật ký quản trị'}
          icon="document-text-outline"
          onPress={() => router.push('/operator/audit')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.md },
  title: { ...Typography.h1, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary },
  caption: { ...Typography.caption, color: Colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    gap: Spacing.sm,
  },
  number: { ...Typography.h1, color: Colors.primary },
  errorPanel: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorSoft,
  },
  error: { ...Typography.body, color: Colors.error },
});
