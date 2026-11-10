import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { NavigationCard } from '@/src/components/atoms/NavigationCard';
import { MapView, Marker } from '@/src/components/MapWrapper';
import { normalizeVietnamesePhone } from '@/src/features/auth/phone';
import {
  CommunicationPage,
  QueryState,
  errorText,
  s,
  useLiveScreen,
} from '@/src/features/communications/shared';
import { rescueApi } from '@/src/features/rescue/api/rescueApi';
import { useAuthStore } from '@/src/stores/authStore';
import { useI18n } from '@/src/i18n';
import { partnerApi as api } from './api';

function usePartnerQuery<T>(key: string, fn: () => Promise<T>) {
  const user = useAuthStore((state) => state.user?.id);
  const live = useLiveScreen();
  return useQuery({
    queryKey: ['partners', user, key],
    queryFn: fn,
    enabled: !!user,
    refetchInterval: live ? 15000 : false,
  });
}
function useChange<T = void>(fn: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await useAuthStore.getState().refreshProfile();
      await Promise.all([
        client.invalidateQueries({ queryKey: ['partners'] }),
        client.invalidateQueries({ queryKey: ['communication'] }),
        client.invalidateQueries({ queryKey: ['rescue'] }),
      ]);
    },
  });
}
function Feedback({ error, success }: { error: unknown; success?: boolean }) {
  const en = useI18n((state) => state.language === 'en');
  return (
    <>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {errorText(error, en)}
        </Text>
      ) : null}
      {success ? <Text style={s.body}>{en ? 'Saved.' : 'Đã lưu.'}</Text> : null}
    </>
  );
}
function Choice({ checked, title, onPress }: { checked: boolean; title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={s.card}
    >
      <Text style={s.body}>
        {checked ? '☑' : '☐'} {title}
      </Text>
    </Pressable>
  );
}
function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}
function statusLabel(value: string, en: boolean) {
  const labels: Record<string, string> = {
    pending: 'Chờ phản hồi',
    approved: 'Đã duyệt',
    rejected: 'Đã từ chối',
    verified: 'Đã xác minh',
    suspended: 'Đình chỉ',
    active: 'Đang hoạt động',
    left: 'Đã rời cửa hàng',
    accepted: 'Đã tham gia',
    declined: 'Đã từ chối',
    revoked: 'Đã thu hồi',
    expired: 'Hết hạn',
  };
  return en ? value : (labels[value] ?? value);
}

export function PartnerHomeScreen() {
  const en = useI18n((state) => state.language === 'en');
  const role = useAuthStore((state) => state.profile?.role);
  const shops = usePartnerQuery('shops', api.shops);
  const applications = usePartnerQuery('applications', api.applications);
  return (
    <CommunicationPage title={en ? 'Shop partnership' : 'Hợp tác cửa hàng'}>
      <Text style={s.body}>
        {en
          ? 'Shop representation is separate from permission to receive rescue jobs.'
          : 'Quyền đại diện cửa hàng tách biệt với quyền trực tiếp nhận ca cứu hộ.'}
      </Text>
      <NavigationCard
        icon="mail-outline"
        title={en ? 'Membership invitations' : 'Lời mời tham gia cửa hàng'}
        onPress={() => router.push('/partnership/invitations' as Href)}
      />
      <QueryState query={shops} />
      {shops.data?.map((shop) => (
        <NavigationCard
          key={shop.id}
          icon="storefront-outline"
          title={shop.name}
          description={`${shop.address} • ${statusLabel(shop.status, en)}`}
          onPress={() => router.push(`/partnership/shop/${shop.id}` as Href)}
        />
      ))}
      <NavigationCard
        icon="document-text-outline"
        title={en ? 'Shop applications' : 'Hồ sơ đăng ký cửa hàng'}
        onPress={() => router.push('/partnership/applications' as Href)}
      />
      {role === 'customer' &&
      shops.isSuccess &&
      !shops.data.length &&
      applications.isSuccess &&
      !applications.data.some((a) => a.status !== 'rejected') ? (
        <NavigationCard
          icon="add-circle-outline"
          title={en ? 'Register a partner shop' : 'Đăng ký cửa hàng hợp tác'}
          description={
            en
              ? 'An admin verifies the shop and your authority before approval.'
              : 'Admin xác minh cửa hàng và quyền đại diện trước khi duyệt.'
          }
          onPress={() => router.push('/partnership/apply' as Href)}
        />
      ) : null}
    </CommunicationPage>
  );
}

export function ShopApplyScreen() {
  const en = useI18n((state) => state.language === 'en');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [invalid, setInvalid] = useState(false);
  const services = usePartnerQuery('services', rescueApi.serviceTypes);
  const submit = useChange(async () => {
    const result = await api.apply({
      name: name.trim(),
      address: address.trim(),
      contactPhone: normalizeVietnamesePhone(phone)!,
      ...point!,
      serviceCodes: codes,
    });
    router.replace(`/partnership/application/${result.id}` as Href);
  });
  const center = point ?? { latitude: 16.0544, longitude: 108.2022 };
  return (
    <CommunicationPage title={en ? 'Register a shop' : 'Đăng ký cửa hàng'}>
      <Text style={s.body}>
        {en
          ? 'Provide the shop and representative contact. Submitting first does not establish ownership. Do not upload identity documents.'
          : 'Cung cấp thông tin cửa hàng và số liên hệ đại diện. Gửi trước không đồng nghĩa có quyền đại diện. Không gửi giấy tờ cá nhân tại đây.'}
      </Text>
      <AppInput
        label={en ? 'Shop name' : 'Tên cửa hàng'}
        value={name}
        onChangeText={setName}
        maxLength={120}
      />
      <AppInput
        label={en ? 'Shop address' : 'Địa chỉ cửa hàng'}
        value={address}
        onChangeText={setAddress}
        maxLength={300}
      />
      <AppInput
        label={en ? 'Representative contact' : 'Số điện thoại liên hệ đại diện'}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={16}
      />
      <Text style={s.body}>
        {en
          ? 'Tap the map to place the shop pin. The address text does not move the pin.'
          : 'Chạm bản đồ để đặt ghim cửa hàng. Nhập địa chỉ không tự di chuyển ghim.'}
      </Text>
      <MapView
        style={{ height: 300 }}
        region={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        onPress={(e) => setPoint(e.nativeEvent.coordinate)}
      >
        {point ? <Marker coordinate={point} title={name || (en ? 'Shop' : 'Cửa hàng')} /> : null}
      </MapView>
      <Text style={s.body}>
        {point
          ? en
            ? 'Shop pin selected.'
            : 'Đã chọn vị trí cửa hàng.'
          : en
            ? 'No pin selected.'
            : 'Chưa chọn vị trí.'}
      </Text>
      <Text style={s.title}>{en ? 'Supported services' : 'Dịch vụ cửa hàng cung cấp'}</Text>
      <QueryState query={services} />
      {services.data?.map((service) => (
        <Choice
          key={service.code}
          title={service.label}
          checked={codes.includes(service.code)}
          onPress={() => setCodes(toggle(codes, service.code))}
        />
      ))}
      {invalid ? (
        <Text style={s.error}>
          {en
            ? 'Complete the name, address, phone, map pin and services.'
            : 'Nhập đủ tên, địa chỉ, số điện thoại hợp lệ, ghim và dịch vụ.'}
        </Text>
      ) : null}
      <Feedback error={submit.error} />
      <AppButton
        title={en ? 'Submit for verification' : 'Gửi hồ sơ chờ xác minh'}
        loading={submit.isPending}
        onPress={() => {
          const valid =
            name.trim().length >= 2 &&
            address.trim().length >= 5 &&
            !!normalizeVietnamesePhone(phone) &&
            !!point &&
            codes.length > 0;
          setInvalid(!valid);
          if (valid) submit.mutate();
        }}
      />
    </CommunicationPage>
  );
}

export function ShopApplicationsScreen() {
  const en = useI18n((state) => state.language === 'en');
  const applications = usePartnerQuery('applications', api.applications);
  return (
    <CommunicationPage title={en ? 'Shop applications' : 'Hồ sơ đăng ký cửa hàng'}>
      <QueryState query={applications} empty={!applications.data?.length} />
      {applications.data?.map((item) => (
        <NavigationCard
          key={item.id}
          icon="document-text-outline"
          title={item.name}
          description={`${item.applicantName} • ${statusLabel(item.status, en)}`}
          onPress={() => router.push(`/partnership/application/${item.id}` as Href)}
        />
      ))}
    </CommunicationPage>
  );
}

export function ShopApplicationScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  return <ApplicationDetail key={id} id={id} />;
}
function ApplicationDetail({ id }: { id: string }) {
  const en = useI18n((state) => state.language === 'en');
  const admin = useAuthStore((state) => state.profile?.role === 'admin');
  const applications = usePartnerQuery('applications', api.applications);
  const services = usePartnerQuery('services', rescueApi.serviceTypes);
  const checks = useQuery({ queryKey: ['partners', 'checks'], queryFn: api.checks, enabled: admin });
  const [checked, setChecked] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState<'approved' | 'rejected' | null>(null);
  const review = useChange((decision: 'approved' | 'rejected') =>
    api.review(id, decision, note.trim(), checked),
  );
  const item = applications.data?.find((a) => a.id === id);
  return (
    <CommunicationPage title={en ? 'Shop application details' : 'Chi tiết hồ sơ cửa hàng'}>
      <QueryState query={applications} empty={applications.isSuccess && !item} />
      {item ? (
        <>
          <Text style={s.title}>{item.name}</Text>
          <Text style={s.body}>{item.address}</Text>
          <Text style={s.body}>
            {en ? 'Applicant' : 'Người đề nghị đại diện'}: {item.applicantName}
          </Text>
          <Text style={s.body}>
            {en ? 'Contact' : 'Liên hệ xác minh'}: {item.contactPhone}
          </Text>
          <Text style={s.body}>{statusLabel(item.status, en)}</Text>
          <Text style={s.body}>
            {en ? 'Services' : 'Dịch vụ'}:{' '}
            {item.serviceCodes
              .map((code) => services.data?.find((service) => service.code === code)?.label ?? code)
              .join(', ')}
          </Text>
          <MapView
            style={{ height: 260 }}
            region={{
              latitude: item.latitude,
              longitude: item.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
          >
            <Marker
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              title={item.name}
              description={item.address}
            />
          </MapView>
          {item.reviewNote ? <Text style={s.body}>{item.reviewNote}</Text> : null}
          {item.teamId ? (
            <NavigationCard
              icon="storefront-outline"
              title={en ? 'Open shop' : 'Mở cửa hàng'}
              onPress={() =>
                router.push(
                  (admin ? `/operator/team/${item.teamId}` : `/partnership/shop/${item.teamId}`) as Href,
                )
              }
            />
          ) : null}
          {admin && item.status === 'pending' ? (
            <>
              <Text style={s.body}>
                {en
                  ? 'Verify the actual shop, the representative’s authority and proposed personnel independently. Check for duplicate shops before approval. Approval grants management, not personal rescue eligibility.'
                  : 'Đối chiếu cửa hàng thực tế, quyền đại diện và danh sách nhân sự qua đầu mối độc lập. Kiểm tra trùng cửa hàng trước khi duyệt. Duyệt quyền đại diện không cấp quyền trực tiếp nhận ca.'}
              </Text>
              <QueryState query={checks} />
              {checks.data?.map((check) => (
                <Choice
                  key={check.code}
                  checked={checked.includes(check.code)}
                  title={`${check.label}: ${check.description}`}
                  onPress={() => {
                    setChecked(toggle(checked, check.code));
                    setConfirm(null);
                  }}
                />
              ))}
              <AppInput
                label={en ? 'Verification result / rejection reason' : 'Kết quả xác minh / lý do từ chối'}
                value={note}
                onChangeText={(value) => {
                  setNote(value);
                  setConfirm(null);
                }}
                maxLength={300}
                multiline
              />
              <AppButton
                title={en ? 'Approve shop and representative' : 'Duyệt cửa hàng và người đại diện'}
                disabled={
                  review.isPending ||
                  note.trim().length < 5 ||
                  !checks.data?.length ||
                  !checks.data.every((c) => checked.includes(c.code))
                }
                onPress={() => setConfirm('approved')}
              />
              <AppButton
                title={en ? 'Reject application' : 'Từ chối hồ sơ'}
                variant="outline"
                disabled={review.isPending || note.trim().length < 5}
                onPress={() => setConfirm('rejected')}
              />
              {confirm ? (
                <View style={s.card}>
                  <Text style={s.body}>
                    {en ? `Confirm: ${confirm}?` : `Xác nhận quyết định: ${statusLabel(confirm, false)}?`}
                  </Text>
                  <AppButton
                    title={en ? 'Confirm' : 'Xác nhận'}
                    loading={review.isPending}
                    onPress={() => review.mutate(confirm)}
                  />
                  <AppButton title={en ? 'Cancel' : 'Hủy'} variant="ghost" onPress={() => setConfirm(null)} />
                </View>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
      <Feedback error={review.error} success={review.isSuccess} />
    </CommunicationPage>
  );
}

export function ShopMembersScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  return <ShopMembers key={id} id={id} />;
}
function ShopMembers({ id }: { id: string }) {
  const en = useI18n((state) => state.language === 'en');
  const shops = usePartnerQuery('shops', api.shops);
  const shop = shops.data?.find((s) => s.id === id);
  const members = usePartnerQuery(`members:${id}`, () => api.members(id));
  const sent = usePartnerQuery(`sent:${id}`, () => api.sent(id));
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const invite = useChange(async () => {
    await api.invite(id, normalizeVietnamesePhone(phone)!, confirmed);
    setPhone('');
    setConfirmed(false);
  });
  const remove = useChange(async (userId: string) => {
    await api.remove(id, userId);
    setRemoveId(null);
  });
  const revoke = useChange((invitationId: string) => api.revoke(id, invitationId));
  return (
    <CommunicationPage title={shop?.name ?? (en ? 'Shop members' : 'Thành viên cửa hàng')}>
      <QueryState query={shops} />
      {shop ? (
        <>
          <Text style={s.body}>
            {shop.address} • {statusLabel(shop.status, en)}
          </Text>
          <Text style={s.body}>
            {en
              ? 'Admin configures service capabilities, shop location and working hours. Ask support to change these. Invitations do not make providers available automatically.'
              : 'Admin cấu hình dịch vụ, vị trí và giờ hoạt động. Liên hệ hỗ trợ khi cần đổi thông tin. Tham gia cửa hàng không tự bật sẵn sàng nhận ca.'}
          </Text>
          <NavigationCard
            icon="help-circle-outline"
            title={en ? 'Contact support' : 'Liên hệ hỗ trợ'}
            onPress={() => router.push('/support' as Href)}
          />
          {shop.status === 'verified' ? (
            <View style={s.card}>
              <Text style={s.title}>{en ? 'Invite a provider' : 'Mời cứu hộ viên'}</Text>
              <AppInput
                label={en ? 'Exact registered phone number' : 'Số điện thoại tài khoản đã đăng ký'}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={16}
              />
              <Choice
                checked={confirmed}
                title={
                  en
                    ? 'I confirm this person works for the shop, is qualified for its services, and may use this number for job contact.'
                    : 'Tôi xác nhận người này thuộc cửa hàng, đủ năng lực cho các dịch vụ đã khai báo và đồng ý dùng số này liên hệ trong ca.'
                }
                onPress={() => setConfirmed(!confirmed)}
              />
              <AppButton
                title={en ? 'Send invitation' : 'Gửi lời mời'}
                loading={invite.isPending}
                disabled={!confirmed || !normalizeVietnamesePhone(phone)}
                onPress={() => invite.mutate()}
              />
              <Feedback error={invite.error} success={invite.isSuccess} />
            </View>
          ) : null}
        </>
      ) : null}
      <Text style={s.title}>{en ? 'Members' : 'Thành viên'}</Text>
      <QueryState query={members} empty={!members.data?.length} />
      {members.data?.map((member) => (
        <View key={member.userId} style={s.card}>
          <Text style={s.title}>{member.name}</Text>
          <Text style={s.body}>{statusLabel(member.status, en)}</Text>
          {shop?.status === 'verified' && member.status === 'active' && !member.representative ? (
            <AppButton
              title={en ? 'Remove from shop' : 'Gỡ khỏi cửa hàng'}
              variant="outline"
              onPress={() => setRemoveId(member.userId)}
            />
          ) : null}
          {removeId === member.userId ? (
            <>
              <Text style={s.body}>
                {en
                  ? 'Stop membership? Account and job history are retained. Open jobs or offers prevent removal.'
                  : 'Chấm dứt thành viên? Tài khoản và lịch sử được giữ. Không thể gỡ khi còn ca hoặc lời mời nhận ca đang mở.'}
              </Text>
              <AppButton
                title={en ? 'Confirm removal' : 'Xác nhận gỡ'}
                loading={remove.isPending}
                onPress={() => remove.mutate(member.userId)}
              />
              <AppButton title={en ? 'Cancel' : 'Hủy'} variant="ghost" onPress={() => setRemoveId(null)} />
            </>
          ) : null}
        </View>
      ))}
      <Feedback error={remove.error} success={remove.isSuccess} />
      <Text style={s.title}>{en ? 'Sent invitations' : 'Lời mời đã gửi'}</Text>
      <QueryState query={sent} empty={!sent.data?.length} />
      {sent.data?.map((item) => (
        <View key={item.id} style={s.card}>
          <Text style={s.body}>
            {item.inviteeName} • {statusLabel(item.status, en)}
          </Text>
          {item.status === 'pending' && shop?.status === 'verified' ? (
            <AppButton
              title={en ? 'Revoke invitation' : 'Thu hồi lời mời'}
              variant="outline"
              loading={revoke.isPending}
              onPress={() => revoke.mutate(item.id)}
            />
          ) : null}
        </View>
      ))}
      <Feedback error={revoke.error} />
    </CommunicationPage>
  );
}

export function ShopInvitationsScreen() {
  const en = useI18n((state) => state.language === 'en');
  const query = usePartnerQuery('invitations', api.invitations);
  const [confirmation, setConfirmation] = useState<{ id: string; decision: 'accepted' | 'declined' } | null>(
    null,
  );
  const answer = useChange(async (input: { id: string; decision: 'accepted' | 'declined' }) => {
    await api.answer(input.id, input.decision);
    setConfirmation(null);
  });
  return (
    <CommunicationPage title={en ? 'Shop invitations' : 'Lời mời tham gia cửa hàng'}>
      <Text style={s.body}>
        {en
          ? 'Accept only if you work at this shop. Acceptance enables provider access and use of your invited phone number for active-job contact. You still need to turn availability on.'
          : 'Chỉ chấp nhận nếu bạn thực sự làm tại cửa hàng. Chấp nhận sẽ cấp quyền cứu hộ viên và dùng số điện thoại được mời để liên hệ trong ca. Bạn vẫn cần tự bật nhận ca.'}
      </Text>
      <QueryState query={query} empty={!query.data?.length} />
      {query.data?.map((item) => (
        <View key={item.id} style={s.card}>
          <Text style={s.title}>{item.teamName}</Text>
          <Text style={s.body}>
            {statusLabel(item.status, en)} • {en ? 'Expires' : 'Hết hạn'}:{' '}
            {new Date(item.expiresAt).toLocaleString(en ? 'en-US' : 'vi-VN')}
          </Text>
          {item.status === 'pending' ? (
            <>
              <AppButton
                title={en ? 'Accept invitation' : 'Chấp nhận tham gia'}
                disabled={answer.isPending}
                onPress={() => setConfirmation({ id: item.id, decision: 'accepted' })}
              />
              <AppButton
                title={en ? 'Decline invitation' : 'Từ chối lời mời'}
                variant="outline"
                disabled={answer.isPending}
                onPress={() => setConfirmation({ id: item.id, decision: 'declined' })}
              />
              {confirmation?.id === item.id ? (
                <>
                  <Text style={s.body}>
                    {en
                      ? `Confirm ${confirmation.decision}?`
                      : `Xác nhận ${confirmation.decision === 'accepted' ? 'tham gia' : 'từ chối'} cửa hàng này?`}
                  </Text>
                  <AppButton
                    title={en ? 'Confirm' : 'Xác nhận'}
                    loading={answer.isPending}
                    onPress={() => answer.mutate(confirmation)}
                  />
                  <AppButton
                    title={en ? 'Cancel' : 'Hủy'}
                    variant="ghost"
                    onPress={() => setConfirmation(null)}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </View>
      ))}
      <Feedback error={answer.error} success={answer.isSuccess} />
    </CommunicationPage>
  );
}
