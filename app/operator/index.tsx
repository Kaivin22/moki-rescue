import { router, type Href } from 'expo-router';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { OperatorPage } from '@/src/features/operator/OperatorPage';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    title: 'Quản lý',
    providerApprovals: 'Tài khoản và duyệt cứu hộ viên',
    teams: 'Đội cứu hộ',
    teamsHint: 'Danh sách đội, cứu hộ viên, năng lực và xác minh.',
    services: 'Danh mục dịch vụ',
    servicesHint: 'Chọn một dịch vụ để chỉnh nội dung và trạng thái.',
    admins: 'Phân quyền quản trị',
    adminsHint: 'Tra cứu tài khoản, cấp hoặc thu hồi quyền admin.',
    attention: 'Ca cần chú ý',
    audit: 'Nhật ký vận hành',
    reviews: 'Đánh giá của khách hàng',
    incidents: 'Khiếu nại và báo sự cố',
    quality: 'Cảnh báo chất lượng',
  },
  en: {
    title: 'Management',
    providerApprovals: 'Provider accounts and approvals',
    teams: 'Rescue teams',
    teamsHint: 'Teams, providers, capabilities and verification.',
    services: 'Service catalog',
    servicesHint: 'Choose a service to edit its details and availability.',
    admins: 'Administrator access',
    adminsHint: 'Look up accounts and grant or revoke administrator access.',
    attention: 'Cases needing attention',
    audit: 'Operations audit log',
    reviews: 'Customer reviews',
    incidents: 'Complaints and incidents',
    quality: 'Quality alerts',
  },
} as const;
export default function ManagementScreen() {
  const c = useCopy(COPY);
  return (
    <OperatorPage title={c.title} fallback="/(tabs)/operations">
      <NavigationCard
        title={c.providerApprovals}
        icon="person-add-outline"
        onPress={() => router.push('/operator/providers' as Href)}
      />
      <NavigationCard
        title={c.incidents}
        icon="flag-outline"
        onPress={() => router.push('/operator/incidents' as Href)}
      />
      <NavigationCard
        title={c.reviews}
        icon="star-outline"
        onPress={() => router.push('/operator/reviews' as Href)}
      />
      <NavigationCard
        title={c.quality}
        icon="warning-outline"
        onPress={() => router.push('/operator/quality-alerts' as Href)}
      />
      <NavigationCard
        title={c.teams}
        description={c.teamsHint}
        icon="people-outline"
        onPress={() => router.push('/operator/teams')}
      />
      <NavigationCard
        title={c.services}
        description={c.servicesHint}
        icon="construct-outline"
        onPress={() => router.push('/operator/services')}
      />
      <NavigationCard
        title={c.admins}
        description={c.adminsHint}
        icon="shield-checkmark-outline"
        onPress={() => router.push('/operator/admins')}
      />
      <NavigationCard
        title={c.attention}
        icon="warning-outline"
        onPress={() => router.push('/operator/attention')}
      />
      <NavigationCard
        title={c.audit}
        icon="document-text-outline"
        onPress={() => router.push('/operator/audit')}
      />
    </OperatorPage>
  );
}
