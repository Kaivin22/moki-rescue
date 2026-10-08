import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { ScreenHeader } from '@/src/components/atoms/ScreenHeader';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { normalizeVietnamesePhone } from '@/src/features/auth/phone';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { RatingBadge } from '@/src/features/rescue/components/RatingBadge';
import { PartnerVerificationEditor } from '@/src/features/rescue/components/PartnerVerificationEditor';
import { rescueKeys } from '@/src/features/rescue/hooks/useRescueQueries';
import { useCopy, useI18n } from '@/src/i18n';
import { useAuthStore } from '@/src/stores/authStore';
import type { AccountLookup } from '@/src/types/rescue';
import { ShopLocationEditor } from './ShopLocationEditor';

const COPY = {
  vi: {
    roster: 'Danh sách cứu hộ viên',
    noProviders: 'Đội chưa có cứu hộ viên.',
    providerActive: 'Đang hoạt động',
    providerSuspended: 'Đã đình chỉ',
    providerLeft: 'Đã rời đơn vị',
    providerAvailable: 'Đang sẵn sàng nhận ca',
    activateProvider: 'Kích hoạt lại',
    suspendProvider: 'Đình chỉ cứu hộ viên',
    markProviderLeft: 'Đánh dấu đã rời đơn vị',
    providerStatusWarning: 'Ca đang xử lý sẽ được chuyển về hàng đợi điều phối.',
    qualityTitle: 'Giám sát chất lượng',
    qualitySignal: 'Tín hiệu điểm thấp cần xác minh',
    qualityWarning: 'Cảnh báo đã gửi',
    qualityAverage: 'Điểm tại thời điểm phát hiện',
    qualityReviews: 'lượt đánh giá',
    warningCount: 'Số cảnh báo đã gửi',
    reviewSuspension: 'Đã đến ngưỡng xem xét đình chỉ; admin vẫn phải kiểm tra ca và phản hồi liên quan.',
    qualityNote: 'Lý do và hướng khắc phục',
    qualityNotePlaceholder: 'Nêu vấn đề đã kiểm tra và thời hạn khắc phục',
    sendWarning: 'Gửi cảnh báo cho đội',
    resolveSignal: 'Đóng tín hiệu',
    invalidQualityNote: 'Hãy nhập lý do cụ thể từ 5 ký tự.',
    recentReviews: 'Đánh giá gần đây của đội',
    noReviews: 'Đội chưa có đánh giá.',
    hiddenReview: 'Đã ẩn khỏi điểm uy tín',
    hideReview: 'Ẩn đánh giá',
    restoreReview: 'Khôi phục đánh giá',
    moderationNote: 'Lý do kiểm duyệt',
    moderationPlaceholder: 'Ví dụ: spam, xúc phạm hoặc đã xác minh là gian lận',
    reviewBy: 'Cứu hộ viên',
    actionError: 'Không thể thực hiện thao tác.',
    invalidTeam: 'Nhập tên đội, mã hồ sơ nội bộ, hotline Việt Nam và bán kính phục vụ hợp lệ.',
    invalidProvider: 'Chọn đội, xác minh tài khoản và nhập đúng tên cùng số liên hệ công việc.',
    invalidAccountPhone: 'Nhập đúng số điện thoại đăng nhập để tìm tài khoản.',
    header: 'Đội và phân quyền',
    notice:
      'Đây là mạng lưới đối tác khép kín. Người dùng thường tự đăng ký OTP; chỉ admin cấp quyền cứu hộ sau khi hợp tác và xác minh ngoại tuyến.',
    testAccountNote:
      'Tài khoản mẫu dùng email được thiết lập bằng script, không tìm bằng ô số điện thoại bên dưới. Nếu đã được cấp quyền và đội đã xác minh thì không cần duyệt lại; chọn đội [TEST] để xem cứu hộ viên.',
    createSection: 'Tạo đội đối tác',
    teamName: 'Tên đội',
    partnerReference: 'Mã hồ sơ đối tác nội bộ',
    partnerPlaceholder: 'Ví dụ: MR-DN-2026-0001',
    hotline: 'Hotline vận hành',
    radius: 'Bán kính phục vụ (km)',
    create: 'Tạo đội ở trạng thái chờ',
    teamList: 'Danh sách đội',
    providers: 'cứu hộ viên',
    suspendTitle: 'Đình chỉ đội?',
    suspendBody: 'Cứu hộ viên của đội sẽ ngừng nhận ca mới.',
    no: 'Không',
    suspend: 'Đình chỉ đội',
    addSection: 'Thêm cứu hộ viên vào đội đã chọn',
    loginPhone: 'Số điện thoại đăng nhập',
    lookup: 'Tìm tài khoản',
    accountFound: 'Đã tìm thấy',
    accountRole: 'Quyền hiện tại',
    workName: 'Tên nghiệp vụ',
    workPhone: 'Số liên hệ công việc',
    phonePlaceholder: 'Ví dụ: 0901234567',
    phoneNote: 'Chỉ dùng số đã được đơn vị xác minh và cho phép khách gọi khi ca đang hoạt động.',
    accountNote:
      'Cứu hộ viên phải tự đăng nhập OTP 1 lần bằng số của họ. Admin chỉ tìm tài khoản đó để cấp quyền, không tạo mật khẩu hoặc dùng tài khoản chung.',
    vehicle: 'Phương tiện cứu hộ',
    vehiclePlaceholder: 'Ví dụ: xe máy kéo rơ-moóc',
    capabilities: 'Năng lực của đội đã chọn',
    saveCapabilities: 'Lưu năng lực đội',
    grantProvider: 'Thêm hồ sơ cứu hộ viên chờ duyệt',
    adminSection: 'Phân quyền quản trị viên vận hành',
    grantAdmin: 'Cấp quyền admin',
    grantAdminTitle: 'Cấp toàn quyền quản trị?',
    grantAdminBody: 'Tài khoản này có thể quản lý đội, phân quyền, danh mục và các quyết định vận hành.',
    revokeAdmin: 'Thu hồi quyền admin',
    revokeTitle: 'Thu hồi quyền admin?',
    revokeBody: 'Tài khoản sẽ trở lại quyền khách hàng.',
    pending: 'Chờ xác minh',
    verified: 'Đã xác minh',
    suspended: 'Đình chỉ',
  },
  en: {
    testAccountNote:
      'Email test accounts are provisioned by the setup script, not the phone lookup below. An assigned account in a verified team needs no further approval; select the [TEST] team to view its provider.',
    roster: 'Provider roster',
    noProviders: 'This team has no providers.',
    providerActive: 'Active',
    providerSuspended: 'Suspended',
    providerLeft: 'Left the organization',
    providerAvailable: 'Available for requests',
    activateProvider: 'Reactivate',
    suspendProvider: 'Suspend provider',
    markProviderLeft: 'Mark as left',
    providerStatusWarning: 'Any active request will return to the dispatch queue.',
    qualityTitle: 'Quality monitoring',
    qualitySignal: 'Low-rating signal requires review',
    qualityWarning: 'Warning sent',
    qualityAverage: 'Rating when detected',
    qualityReviews: 'reviews',
    warningCount: 'Warnings issued',
    reviewSuspension:
      'Suspension review threshold reached; an admin must still inspect related requests and feedback.',
    qualityNote: 'Reason and corrective action',
    qualityNotePlaceholder: 'Describe the verified issue and correction deadline',
    sendWarning: 'Send team warning',
    resolveSignal: 'Close signal',
    invalidQualityNote: 'Enter a specific reason of at least 5 characters.',
    recentReviews: 'Recent team reviews',
    noReviews: 'This team has no reviews yet.',
    hiddenReview: 'Excluded from reputation score',
    hideReview: 'Hide review',
    restoreReview: 'Restore review',
    moderationNote: 'Moderation reason',
    moderationPlaceholder: 'For example: spam, abuse, or verified fraud',
    reviewBy: 'Provider',
    actionError: 'Could not complete the action.',
    invalidTeam: 'Enter a valid team name, internal file code, Vietnamese hotline, and service radius.',
    invalidProvider: 'Select a team, verify the account, and enter a valid work name and phone.',
    invalidAccountPhone: 'Enter the valid login phone number used by the account.',
    header: 'Teams and access',
    notice:
      'This is a closed partner network. Customers self-register with OTP; only an admin grants provider access after offline partnership and verification.',
    createSection: 'Create partner team',
    teamName: 'Team name',
    partnerReference: 'Internal partner file code',
    partnerPlaceholder: 'Example: MR-DN-2026-0001',
    hotline: 'Operations hotline',
    radius: 'Service radius (km)',
    create: 'Create as pending team',
    teamList: 'Teams',
    providers: 'providers',
    suspendTitle: 'Suspend team?',
    suspendBody: "This team's providers will stop receiving new requests.",
    no: 'No',
    suspend: 'Suspend team',
    addSection: 'Add a provider to the selected team',
    loginPhone: 'Login phone number',
    lookup: 'Find account',
    accountFound: 'Account found',
    accountRole: 'Current role',
    workName: 'Operations name',
    workPhone: 'Work contact number',
    phonePlaceholder: 'Example: 0901234567',
    phoneNote: 'Only use an operator-verified work number approved for calls during an active request.',
    accountNote:
      'Each provider must sign in once with their own OTP number. The admin only finds that account to grant access; no password or shared account is created.',
    vehicle: 'Rescue vehicle',
    vehiclePlaceholder: 'Example: motorcycle with rescue trailer',
    capabilities: 'Selected team capabilities',
    saveCapabilities: 'Save team capabilities',
    grantProvider: 'Submit provider for approval',
    adminSection: 'Operations administrator access',
    grantAdmin: 'Grant admin access',
    grantAdminTitle: 'Grant full administrator access?',
    grantAdminBody: 'This account will be able to manage teams, access, catalog, and operational decisions.',
    revokeAdmin: 'Remove admin access',
    revokeTitle: 'Remove admin access?',
    revokeBody: 'This account will return to customer access.',
    pending: 'Pending verification',
    verified: 'Verified',
    suspended: 'Suspended',
  },
} as const;

export type ManagementSection =
  | 'teams'
  | 'create'
  | 'team'
  | 'quality'
  | 'capabilities'
  | 'add-provider'
  | 'providers'
  | 'verification'
  | 'admins';

export function TeamRouteScreen({ section }: { section: ManagementSection }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const teamId =
    typeof id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ? id
      : '';
  if (!teamId) return <Redirect href="/operator/teams" />;
  return <TeamManagementScreen key={section + ':' + teamId} section={section} teamId={teamId} />;
}

export function TeamManagementScreen({
  section,
  teamId = '',
}: {
  section: ManagementSection;
  teamId?: string;
}) {
  const profile = useAuthStore((state) => state.profile);
  const client = useQueryClient();
  const teams = useQuery({
    queryKey: rescueKeys.teams,
    queryFn: rescueApi.teams,
    enabled: section !== 'admins' && section !== 'create',
  });
  const services = useQuery({
    queryKey: rescueKeys.services,
    queryFn: rescueApi.serviceTypes,
    enabled: section === 'capabilities',
  });
  const [teamName, setTeamName] = useState('');
  const [partnerReference, setPartnerReference] = useState('');
  const [hotline, setHotline] = useState('');
  const [radius, setRadius] = useState('');
  const selectedTeam = teamId;
  const [capabilityDraft, setCapabilities] = useState<string[] | null>(null);
  const [providerLoginPhone, setProviderLoginPhone] = useState('');
  const [providerAccount, setProviderAccount] = useState<AccountLookup | null>(null);
  const [providerName, setProviderName] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [adminLoginPhone, setAdminLoginPhone] = useState('');
  const [adminAccount, setAdminAccount] = useState<AccountLookup | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const c = useCopy(COPY);
  const english = useI18n((state) => state.language === 'en');
  const qualityReviews = useQuery({
    queryKey: rescueKeys.qualityReviews(selectedTeam),
    queryFn: () => rescueApi.qualityReviews(selectedTeam),
    enabled: Boolean(selectedTeam) && section === 'quality',
  });
  const providers = useQuery({
    queryKey: rescueKeys.providers(selectedTeam),
    queryFn: () => rescueApi.providers(selectedTeam),
    enabled: Boolean(selectedTeam) && section === 'providers',
  });

  const refreshTeams = (teamId?: string) => {
    void client.invalidateQueries({ queryKey: rescueKeys.teams });
    void client.invalidateQueries({ queryKey: ['rescue', 'provider-directory'] });
    if (teamId) {
      void client.invalidateQueries({ queryKey: rescueKeys.teamVerification(teamId) });
      void client.invalidateQueries({ queryKey: rescueKeys.providers(teamId) });
    }
  };
  const create = useMutation({
    mutationFn: rescueApi.createTeam,
    onSuccess: ({ teamId }) => {
      router.replace({ pathname: '/operator/team/[id]', params: { id: teamId } });
      setCapabilities([]);
      setTeamName('');
      setPartnerReference('');
      setHotline('');
      setRadius('');
      refreshTeams(teamId);
    },
  });
  const saveCapabilities = useMutation({
    mutationFn: ({ teamId, codes }: { teamId: string; codes: string[] }) =>
      rescueApi.setTeamCapabilities(teamId, codes),
    onSuccess: () => refreshTeams(selectedTeam),
  });
  const addProvider = useMutation({
    mutationFn: ({ teamId, input }: { teamId: string; input: Parameters<typeof rescueApi.addProvider>[1] }) =>
      rescueApi.addProvider(teamId, input),
    onSuccess: () => {
      setProviderLoginPhone('');
      setProviderAccount(null);
      setProviderName('');
      setProviderPhone('');
      setVehicle('');
      refreshTeams(selectedTeam);
      router.replace({ pathname: '/operator/team/[id]/providers', params: { id: selectedTeam } });
    },
  });
  const adminRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'customer' }) =>
      rescueApi.setAdminRole(userId, role),
    onSuccess: () => {
      setAdminLoginPhone('');
      setAdminAccount(null);
    },
  });
  const providerStatus = useMutation({
    mutationFn: ({ providerId, status }: { providerId: string; status: 'active' | 'suspended' | 'left' }) =>
      rescueApi.setProviderStatus(selectedTeam, providerId, status),
    onSuccess: () => refreshTeams(selectedTeam),
  });

  if (!profile || profile.role !== 'admin') return <Redirect href="/(tabs)/operations" />;

  const report = (error: unknown) =>
    setMessage(error instanceof ApiClientError ? error.message : c.actionError);
  const lookupAccount = async (rawPhone: string, onFound: (account: AccountLookup) => void) => {
    const phone = normalizeVietnamesePhone(rawPhone);
    if (!phone) return setMessage(c.invalidAccountPhone);
    setMessage(null);
    try {
      onFound(await rescueApi.lookupAccount(phone));
    } catch (error) {
      report(error);
    }
  };
  const createTeam = async () => {
    const radiusValue = Number(radius);
    const normalizedHotline = normalizeVietnamesePhone(hotline);
    const normalizedReference = partnerReference.trim().toUpperCase();
    if (
      teamName.trim().length < 2 ||
      !/^[A-Z0-9][A-Z0-9._/-]{3,79}$/.test(normalizedReference) ||
      !normalizedHotline ||
      !radius.trim() ||
      !Number.isFinite(radiusValue) ||
      radiusValue < 1 ||
      radiusValue > 100
    )
      return setMessage(c.invalidTeam);
    setMessage(null);
    try {
      await create.mutateAsync({
        name: teamName.trim(),
        partnerReference: normalizedReference,
        hotline: normalizedHotline,
        serviceRadiusKm: radiusValue,
      });
    } catch (error) {
      report(error);
    }
  };
  const assign = async () => {
    const contactPhone = normalizeVietnamesePhone(providerPhone);
    if (!selectedTeam || !providerAccount || providerName.trim().length < 2 || !contactPhone)
      return setMessage(c.invalidProvider);
    setMessage(null);
    try {
      await addProvider.mutateAsync({
        teamId: selectedTeam,
        input: {
          userId: providerAccount.id,
          displayName: providerName.trim(),
          contactPhone,
          rescueVehicleLabel: vehicle.trim() || undefined,
        },
      });
    } catch (error) {
      report(error);
    }
  };
  const suspendTeam = async (teamId: string) => {
    try {
      await rescueApi.setTeamStatus(teamId, 'suspended');
      refreshTeams(teamId);
    } catch (error) {
      report(error);
    }
  };
  const selectedTeamData = (teams.data ?? []).find((team) => team.id === selectedTeam);
  const capabilities = capabilityDraft ?? selectedTeamData?.capabilityCodes ?? [];
  const titles: Record<ManagementSection, string> = {
    teams: c.teamList,
    create: c.createSection,
    team: selectedTeamData?.name ?? c.teamList,
    quality: c.qualityTitle,
    capabilities: c.capabilities,
    'add-provider': c.addSection,
    providers: c.roster,
    verification: english ? 'Partner verification' : 'Xác minh đội',
    admins: c.adminSection,
  };
  const parent = () => {
    if (section === 'teams' || section === 'admins') router.replace('/operator');
    else if (section === 'create' || section === 'team') router.replace('/operator/teams');
    else if (section === 'add-provider')
      router.replace({ pathname: '/operator/team/[id]/providers', params: { id: selectedTeam } });
    else router.replace({ pathname: '/operator/team/[id]', params: { id: selectedTeam } });
  };
  const ready = !selectedTeam || Boolean(selectedTeamData);
  const updateProviderStatus = (providerId: string, status: 'active' | 'suspended' | 'left') => {
    const perform = () => void providerStatus.mutateAsync({ providerId, status }).catch(report);
    if (status === 'active') {
      perform();
      return;
    }
    Alert.alert(status === 'suspended' ? c.suspendProvider : c.markProviderLeft, c.providerStatusWarning, [
      { text: c.no, style: 'cancel' },
      {
        text: status === 'suspended' ? c.suspendProvider : c.markProviderLeft,
        style: 'destructive',
        onPress: perform,
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title={titles[section]} onBack={() => (router.canGoBack() ? router.back() : parent())} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {section === 'teams' || section === 'admins' ? <Text style={styles.notice}>{c.notice}</Text> : null}
        {teams.isLoading && section !== 'admins' && section !== 'create' ? (
          <Text style={styles.muted}>{english ? 'Loading teams…' : 'Đang tải đội…'}</Text>
        ) : null}
        {selectedTeam && teams.isSuccess && !selectedTeamData ? (
          <Text accessibilityRole="alert" style={styles.errorBox}>
            {english ? 'Team not found.' : 'Không tìm thấy đội.'}
          </Text>
        ) : null}
        {section === 'teams' ? (
          <AppButton title={c.createSection} onPress={() => router.push('/operator/team-new')} />
        ) : null}
        {section === 'teams' && teams.isSuccess && teams.data.length === 0 ? (
          <Text style={styles.muted}>
            {english
              ? 'No teams yet. Create a team to get started.'
              : 'Chưa có đội. Chọn Tạo đội đối tác để bắt đầu.'}
          </Text>
        ) : null}
        {ready && section === 'team' ? (
          <>
            <Text style={styles.section}>{selectedTeamData?.name}</Text>
            <Text style={styles.muted}>{selectedTeamData ? c[selectedTeamData.status] : ''}</Text>
            {selectedTeamData ? (
              <ShopLocationEditor key={selectedTeamData.id} team={selectedTeamData} />
            ) : null}
            <NavigationCard
              title={c.roster}
              icon="people-outline"
              onPress={() =>
                router.push({ pathname: '/operator/team/[id]/providers', params: { id: selectedTeam } })
              }
            />
            <NavigationCard
              title={c.capabilities}
              icon="construct-outline"
              onPress={() =>
                router.push({ pathname: '/operator/team/[id]/capabilities', params: { id: selectedTeam } })
              }
            />
            <NavigationCard
              title={titles.verification}
              icon="shield-checkmark-outline"
              onPress={() =>
                router.push({ pathname: '/operator/team/[id]/verification', params: { id: selectedTeam } })
              }
            />
            <NavigationCard
              title={c.qualityTitle}
              icon="star-outline"
              onPress={() =>
                router.push({ pathname: '/operator/team/[id]/quality', params: { id: selectedTeam } })
              }
            />
          </>
        ) : null}
        {ready && section === 'providers' ? (
          <AppButton
            title={c.addSection}
            onPress={() =>
              router.push({ pathname: '/operator/team/[id]/provider-new', params: { id: selectedTeam } })
            }
          />
        ) : null}
        {section === 'providers' && providers.isLoading ? (
          <Text style={styles.muted}>{english ? 'Loading providers…' : 'Đang tải cứu hộ viên…'}</Text>
        ) : null}
        {section === 'providers' && providers.isError ? (
          <Text accessibilityRole="alert" style={styles.errorBox}>
            {providers.error instanceof ApiClientError ? providers.error.message : c.actionError}
          </Text>
        ) : null}
        {section === 'quality' && qualityReviews.isError ? (
          <Text accessibilityRole="alert" style={styles.errorBox}>
            {qualityReviews.error instanceof ApiClientError ? qualityReviews.error.message : c.actionError}
          </Text>
        ) : null}
        {__DEV__ && ['teams', 'admins', 'add-provider'].includes(section) ? (
          <Text style={styles.notice}>{c.testAccountNote}</Text>
        ) : null}
        {teams.isError ? (
          <Text style={styles.errorBox} accessibilityRole="alert">
            {teams.error instanceof ApiClientError ? teams.error.message : c.actionError}
          </Text>
        ) : null}
        {message ? (
          <Text style={styles.errorBox} accessibilityRole="alert">
            {message}
          </Text>
        ) : null}
        {ready && section === 'create' ? (
          <>
            <Text style={styles.section}>{c.createSection}</Text>
            <View style={styles.card}>
              <AppInput label={c.teamName} value={teamName} onChangeText={setTeamName} maxLength={120} />
              <AppInput
                label={c.partnerReference}
                value={partnerReference}
                onChangeText={(value) => setPartnerReference(value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={80}
                placeholder={c.partnerPlaceholder}
              />
              <AppInput
                label={c.hotline}
                value={hotline}
                onChangeText={setHotline}
                keyboardType="phone-pad"
                maxLength={20}
              />
              <AppInput label={c.radius} value={radius} onChangeText={setRadius} keyboardType="decimal-pad" />
              <AppButton title={c.create} onPress={() => void createTeam()} loading={create.isPending} />
            </View>
          </>
        ) : null}

        {ready && section === 'teams' ? (
          <>
            <Text style={styles.section}>{c.teamList}</Text>
            {(teams.data ?? []).map((team) => (
              <View key={team.id} style={[styles.team, selectedTeam === team.id && styles.selected]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${team.name}. ${c[team.status]}`}
                  accessibilityState={{ selected: selectedTeam === team.id }}
                  onPress={() => router.push({ pathname: '/operator/team/[id]', params: { id: team.id } })}
                  style={styles.teamSelection}
                >
                  <View style={styles.flex}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.muted}>
                      {team.activeProviders} {c.providers} • {c[team.status]}
                    </Text>
                    <RatingBadge rating={team.rating} label={team.name} compact />
                    <Text style={team.suspensionReviewRecommended ? styles.qualityDanger : styles.muted}>
                      {c.warningCount}: {team.qualityWarningCount}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </Pressable>
                {team.status === 'verified' ? (
                  <Pressable
                    style={styles.inlineDanger}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.suspend}: ${team.name}`}
                    onPress={() =>
                      Alert.alert(c.suspendTitle, c.suspendBody, [
                        { text: c.no, style: 'cancel' },
                        {
                          text: c.suspend,
                          style: 'destructive',
                          onPress: () => void suspendTeam(team.id),
                        },
                      ])
                    }
                  >
                    <Text style={styles.inlineDangerText}>{c.suspend}</Text>
                  </Pressable>
                ) : null}
                {team.activeQualityAlert ? (
                  <Text
                    style={
                      team.activeQualityAlert.severity === 'critical'
                        ? styles.qualityDanger
                        : styles.qualityWarning
                    }
                  >
                    {team.activeQualityAlert.status === 'open' ? c.qualitySignal : c.qualityWarning}
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {ready && section === 'quality' ? (
          <>
            {selectedTeamData?.activeQualityAlert ? (
              <View style={styles.qualityCard}>
                <Text style={styles.section}>{c.qualityTitle}</Text>
                <Text style={styles.teamName}>
                  {selectedTeamData.activeQualityAlert.status === 'open' ? c.qualitySignal : c.qualityWarning}
                </Text>
                <Text style={styles.muted}>
                  {c.qualityAverage}: {selectedTeamData.activeQualityAlert.averageRating.toFixed(2)} •{' '}
                  {selectedTeamData.activeQualityAlert.ratingCount} {c.qualityReviews}
                </Text>
                {selectedTeamData.suspensionReviewRecommended ? (
                  <Text style={styles.qualityDanger}>{c.reviewSuspension}</Text>
                ) : null}
                <NavigationCard
                  title={english ? 'Inspect quality alert' : 'Xem và xử lý cảnh báo'}
                  icon="warning-outline"
                  onPress={() =>
                    router.push(`/operator/quality-alerts/${selectedTeamData.activeQualityAlert!.id}` as Href)
                  }
                />
              </View>
            ) : null}

            {selectedTeamData ? (
              <View style={styles.card}>
                <Text style={styles.section}>{c.recentReviews}</Text>
                <NavigationCard
                  title={english ? 'All customer reviews' : 'Danh sách đánh giá toàn hệ thống'}
                  icon="star-outline"
                  onPress={() => router.push('/operator/reviews' as Href)}
                />
                {qualityReviews.isLoading ? (
                  <Text style={styles.muted}>{english ? 'Loading reviews…' : 'Đang tải đánh giá…'}</Text>
                ) : null}
                {qualityReviews.isError ? (
                  <AppButton
                    title={english ? 'Could not load reviews — Retry' : 'Không tải được đánh giá — Thử lại'}
                    onPress={() => void qualityReviews.refetch()}
                  />
                ) : null}
                {(qualityReviews.data ?? []).map((review) => (
                  <View key={review.id} style={[styles.reviewRow, review.hidden && styles.reviewHidden]}>
                    <View style={styles.reviewHeading}>
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Ionicons
                            key={value}
                            name={value <= review.rating ? 'star' : 'star-outline'}
                            size={17}
                            color={Colors.accentDark}
                          />
                        ))}
                      </View>
                      <Text style={styles.muted}>
                        {c.reviewBy}: {review.providerName}
                      </Text>
                    </View>
                    {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    {review.hidden ? <Text style={styles.qualityDanger}>{c.hiddenReview}</Text> : null}
                    <AppButton
                      title={english ? 'Review details / moderation' : 'Chi tiết / kiểm duyệt đánh giá'}
                      variant="ghost"
                      onPress={() => router.push(`/operator/reviews/${review.id}` as Href)}
                    />
                  </View>
                ))}
                {qualityReviews.isSuccess && qualityReviews.data.length === 0 ? (
                  <Text style={styles.muted}>{c.noReviews}</Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {ready && section === 'capabilities' ? (
          <>
            <Text style={styles.section}>{c.capabilities}</Text>
            {services.isLoading ? (
              <Text style={styles.muted}>{english ? 'Loading services…' : 'Đang tải dịch vụ…'}</Text>
            ) : null}
            {services.isError ? (
              <>
                <Text accessibilityRole="alert" style={styles.errorBox}>
                  {english ? 'Could not load services.' : 'Không tải được danh sách dịch vụ.'}
                </Text>
                <AppButton
                  title={english ? 'Try again' : 'Thử lại'}
                  variant="outline"
                  onPress={() => void services.refetch()}
                />
              </>
            ) : null}
            <View style={styles.card}>
              <View style={styles.chips}>
                {(services.data ?? []).map((service) => {
                  const active = capabilities.includes(service.code);
                  return (
                    <Pressable
                      key={service.code}
                      accessibilityRole="checkbox"
                      accessibilityLabel={service.label}
                      accessibilityState={{ checked: active }}
                      onPress={() =>
                        setCapabilities(
                          active
                            ? capabilities.filter((code) => code !== service.code)
                            : [...capabilities, service.code],
                        )
                      }
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Ionicons
                        name={active ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={Colors.primary}
                      />
                      <Text style={styles.chipText}>{service.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <AppButton
                title={c.saveCapabilities}
                disabled={!selectedTeam || !services.isSuccess || capabilities.length === 0}
                loading={saveCapabilities.isPending}
                onPress={() => {
                  setMessage(null);
                  void saveCapabilities
                    .mutateAsync({ teamId: selectedTeam, codes: capabilities })
                    .catch(report);
                }}
              />
            </View>
          </>
        ) : null}

        {ready && section === 'add-provider' ? (
          <>
            <Text style={styles.section}>{c.addSection}</Text>
            <View style={styles.card}>
              <Text style={styles.notice}>{c.accountNote}</Text>
              <AccountSearch
                label={c.loginPhone}
                button={c.lookup}
                value={providerLoginPhone}
                account={providerAccount}
                found={c.accountFound}
                role={c.accountRole}
                onChange={(value) => {
                  setProviderLoginPhone(value);
                  setProviderAccount(null);
                }}
                onSearch={() => void lookupAccount(providerLoginPhone, setProviderAccount)}
              />
              <AppInput
                label={c.workName}
                value={providerName}
                onChangeText={setProviderName}
                maxLength={80}
              />
              <AppInput
                label={c.workPhone}
                value={providerPhone}
                onChangeText={setProviderPhone}
                keyboardType="phone-pad"
                maxLength={20}
                placeholder={c.phonePlaceholder}
              />
              <Text style={styles.muted}>{c.phoneNote}</Text>
              <AppInput
                label={c.vehicle}
                value={vehicle}
                onChangeText={setVehicle}
                maxLength={80}
                placeholder={c.vehiclePlaceholder}
              />
              <AppButton
                title={c.grantProvider}
                onPress={() => void assign()}
                loading={addProvider.isPending}
              />
            </View>
          </>
        ) : null}

        {ready && section === 'providers' ? (
          <>
            {selectedTeam ? (
              <View style={styles.card}>
                <Text style={styles.section}>{c.roster}</Text>
                <AppButton
                  title={english ? 'Open provider approvals' : 'Mở danh sách duyệt cứu hộ viên'}
                  variant="outline"
                  onPress={() => router.push('/operator/providers' as Href)}
                />
                {(providers.data ?? []).map((provider) => (
                  <View key={provider.userId} style={styles.reviewRow}>
                    <Text style={styles.teamName}>{provider.displayName}</Text>
                    <Text style={styles.muted}>{provider.contactPhone}</Text>
                    {provider.rescueVehicleLabel ? (
                      <Text style={styles.muted}>{provider.rescueVehicleLabel}</Text>
                    ) : null}
                    <Text style={provider.status === 'active' ? styles.providerActive : styles.qualityDanger}>
                      {provider.status === 'active'
                        ? c.providerActive
                        : provider.status === 'pending'
                          ? english
                            ? 'Awaiting approval'
                            : 'Chờ duyệt'
                          : provider.status === 'rejected'
                            ? english
                              ? 'Rejected'
                              : 'Đã từ chối'
                            : provider.status === 'suspended'
                              ? c.providerSuspended
                              : c.providerLeft}
                      {provider.available ? ` • ${c.providerAvailable}` : ''}
                    </Text>
                    {provider.status === 'pending' ? null : provider.status !== 'active' ? (
                      <AppButton
                        title={c.activateProvider}
                        variant="outline"
                        loading={providerStatus.isPending}
                        onPress={() => updateProviderStatus(provider.userId, 'active')}
                      />
                    ) : (
                      <AppButton
                        title={c.suspendProvider}
                        variant="outline"
                        loading={providerStatus.isPending}
                        onPress={() => updateProviderStatus(provider.userId, 'suspended')}
                      />
                    )}
                    {provider.status !== 'left' && provider.status !== 'pending' ? (
                      <AppButton
                        title={c.markProviderLeft}
                        variant="ghost"
                        disabled={providerStatus.isPending}
                        onPress={() => updateProviderStatus(provider.userId, 'left')}
                      />
                    ) : null}
                  </View>
                ))}
                {providers.isSuccess && providers.data.length === 0 ? (
                  <Text style={styles.muted}>{c.noProviders}</Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {ready && section === 'verification' ? (
          <>
            {selectedTeam ? (
              <PartnerVerificationEditor
                teamId={selectedTeam}
                onChanged={() => refreshTeams(selectedTeam)}
                onError={setMessage}
              />
            ) : null}
          </>
        ) : null}

        {ready && section === 'admins' ? (
          <>
            <Text style={styles.section}>{c.adminSection}</Text>
            <View style={styles.card}>
              <AccountSearch
                label={c.loginPhone}
                button={c.lookup}
                value={adminLoginPhone}
                account={adminAccount}
                found={c.accountFound}
                role={c.accountRole}
                onChange={(value) => {
                  setAdminLoginPhone(value);
                  setAdminAccount(null);
                }}
                onSearch={() => void lookupAccount(adminLoginPhone, setAdminAccount)}
              />
              <AppButton
                title={c.grantAdmin}
                variant="outline"
                disabled={!adminAccount}
                loading={adminRole.isPending}
                onPress={() =>
                  Alert.alert(c.grantAdminTitle, c.grantAdminBody, [
                    { text: c.no, style: 'cancel' },
                    {
                      text: c.grantAdmin,
                      onPress: () =>
                        adminAccount
                          ? void adminRole
                              .mutateAsync({ userId: adminAccount.id, role: 'admin' })
                              .catch(report)
                          : undefined,
                    },
                  ])
                }
              />
              <AppButton
                title={c.revokeAdmin}
                variant="outline"
                disabled={!adminAccount}
                loading={adminRole.isPending}
                onPress={() =>
                  Alert.alert(c.revokeTitle, c.revokeBody, [
                    { text: c.no, style: 'cancel' },
                    {
                      text: c.revokeAdmin,
                      style: 'destructive',
                      onPress: () =>
                        adminAccount
                          ? void adminRole
                              .mutateAsync({ userId: adminAccount.id, role: 'customer' })
                              .catch(report)
                          : undefined,
                    },
                  ])
                }
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AccountSearch({
  label,
  button,
  value,
  account,
  found,
  role,
  onChange,
  onSearch,
}: {
  label: string;
  button: string;
  value: string;
  account: AccountLookup | null;
  found: string;
  role: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}) {
  return (
    <>
      <AppInput label={label} value={value} onChangeText={onChange} keyboardType="phone-pad" maxLength={20} />
      <AppButton title={button} variant="outline" onPress={onSearch} />
      {account ? (
        <View style={styles.accountResult}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
          <View style={styles.flex}>
            <Text style={styles.teamName}>
              {found}: {account.displayName}
            </Text>
            <Text style={styles.muted}>
              {role}: {account.role}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  notice: {
    ...Typography.body,
    color: Colors.textSecondary,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.sky,
  },
  section: { ...Typography.h3, color: Colors.textPrimary, marginTop: Spacing.sm },
  card: { padding: Spacing.md, gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: Colors.cardBg },
  team: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamSelection: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.accentSoft },
  teamName: { ...Typography.bodyBold, color: Colors.textPrimary },
  muted: { ...Typography.caption, color: Colors.textMuted },
  inlineDanger: {
    minHeight: 44,
    alignSelf: 'flex-end',
    padding: Spacing.sm,
    justifyContent: 'center',
  },
  inlineDangerText: { ...Typography.caption, color: Colors.error },
  qualityCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: Colors.warningSoft,
  },
  qualityWarning: { ...Typography.caption, color: Colors.warning },
  qualityDanger: { ...Typography.caption, color: Colors.error },
  reviewRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  reviewHidden: { opacity: 0.62 },
  reviewHeading: { gap: Spacing.xs },
  stars: { flexDirection: 'row', gap: 2 },
  reviewComment: { ...Typography.body, color: Colors.textPrimary },
  chips: { gap: Spacing.sm, marginBottom: Spacing.md },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.accentSoft },
  chipText: { ...Typography.caption, color: Colors.textPrimary, flex: 1 },
  accountResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.successSoft,
  },
  errorBox: {
    ...Typography.body,
    color: Colors.error,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.errorSoft,
  },
  flex: { flex: 1 },
  providerActive: { ...Typography.caption, color: Colors.success },
});
