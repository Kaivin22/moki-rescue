import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import {
  createVipPlan,
  adminExtendVip,
  adminGrantVip,
  adminRevokeVip,
  getAdminVipPlans,
  getUserVipSubscriptions,
  setVipPlanActive,
  type VipBillingPeriod,
  type VipPlan,
} from '@/src/features/vip/api/subscriptions';

const emptyForm = {
  code: '', name: '', description: '', billingPeriod: 'month' as VipBillingPeriod,
  billingInterval: '1', appleProductId: '', googleProductId: '',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

export default function AdminVipScreen() {
  const { userId, userName } = useLocalSearchParams<{ userId?: string; userName?: string }>();
  const adminId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [adminNote, setAdminNote] = useState('Hỗ trợ VIP bởi quản trị viên');
  const plansQuery = useQuery({ queryKey: ['admin-vip-plans'], queryFn: getAdminVipPlans });
  const subscriptionsQuery = useQuery({
    queryKey: ['admin-user-vip', userId],
    queryFn: () => getUserVipSubscriptions(userId as string),
    enabled: Boolean(userId),
  });

  const refreshUserVip = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-user-vip', userId] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    ]);
  };

  const grantMutation = useMutation({
    mutationFn: (planId: string) => adminGrantVip(userId as string, planId, adminNote),
    onSuccess: async () => { await refreshUserVip(); Alert.alert('Đã cấp VIP', 'Quyền lợi đã được đồng bộ vào hồ sơ người dùng.'); },
    onError: (error) => Alert.alert('Không thể cấp VIP', errorMessage(error)),
  });
  const extendMutation = useMutation({
    mutationFn: (subscriptionId: string) => adminExtendVip(subscriptionId, adminNote),
    onSuccess: async () => { await refreshUserVip(); Alert.alert('Đã gia hạn', 'Đã cộng thêm một chu kỳ của gói.'); },
    onError: (error) => Alert.alert('Không thể gia hạn', errorMessage(error)),
  });
  const revokeMutation = useMutation({
    mutationFn: (subscriptionId: string) => adminRevokeVip(subscriptionId, adminNote),
    onSuccess: async () => { await refreshUserVip(); Alert.alert('Đã thu hồi', 'Admin grant đã được thu hồi và ghi audit log.'); },
    onError: (error) => Alert.alert('Không thể thu hồi', errorMessage(error)),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!adminId) throw new Error('Phiên quản trị không hợp lệ.');
      await createVipPlan({
        ...form,
        billingInterval: Number(form.billingInterval),
      }, adminId);
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-vip-plans'] });
      Alert.alert('Đã tạo', 'Gói VIP được lưu ở trạng thái nháp.');
    },
    onError: (error) => Alert.alert('Không thể tạo gói', errorMessage(error)),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ plan, active }: { plan: VipPlan; active: boolean }) => setVipPlanActive(plan, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-vip-plans'] }),
    onError: (error) => Alert.alert('Không thể cập nhật gói', errorMessage(error)),
  });

  const setField = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => userId && router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel={userId ? 'Quay lại danh sách người dùng' : 'Quay lại hồ sơ'}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Gói VIP</Text>
            <Text style={styles.subtitle}>Giá bán được lấy trực tiếp từ App Store/Google Play.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowForm((value) => !value)}>
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {userId && (
          <View style={[styles.card, styles.userGrantCard]}>
            <Text style={styles.cardTitle}>Hỗ trợ VIP: {userName || userId}</Text>
            <Text style={styles.note}>Chỉ cấp quyền nội bộ. Thao tác này không hủy hay gia hạn subscription tại Apple/Google.</Text>
            <Field label="Ghi chú/lý do" value={adminNote} onChangeText={setAdminNote} placeholder="Lý do hỗ trợ" />
            <Text style={styles.label}>Cấp gói mới</Text>
            {plansQuery.data?.map((plan) => (
              <AppButton
                key={`grant-${plan.id}`}
                title={`Cấp ${plan.name} · ${plan.billing_interval} ${plan.billing_period === 'month' ? 'tháng' : 'năm'}`}
                variant="outline"
                onPress={() => grantMutation.mutate(plan.id)}
                loading={grantMutation.isPending && grantMutation.variables === plan.id}
              />
            ))}
            <Text style={styles.label}>Lịch sử quyền lợi</Text>
            {subscriptionsQuery.data?.map((subscription) => (
              <View key={subscription.id} style={styles.subscriptionRow}>
                <Text style={styles.meta}>{subscription.plan?.name || 'Gói đã xóa'} · {subscription.provider}</Text>
                <Text style={styles.meta}>{subscription.status} · đến {new Date(subscription.current_period_end).toLocaleDateString('vi-VN')}</Text>
                {subscription.provider === 'admin_grant' && !['revoked', 'refunded'].includes(subscription.status) && (
                  <View style={styles.actionRow}>
                    <AppButton title="Gia hạn 1 chu kỳ" variant="outline" onPress={() => extendMutation.mutate(subscription.id)} />
                    <AppButton
                      title="Thu hồi"
                      variant="destructive"
                      onPress={() => Alert.alert('Thu hồi VIP?', 'Thao tác được ghi vào audit log.', [
                        { text: 'Hủy', style: 'cancel' },
                        { text: 'Thu hồi', style: 'destructive', onPress: () => revokeMutation.mutate(subscription.id) },
                      ])}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {showForm && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tạo gói nháp</Text>
            <Field label="Mã gói" value={form.code} onChangeText={(value) => setField('code', value)} placeholder="vip_monthly" />
            <Field label="Tên gói" value={form.name} onChangeText={(value) => setField('name', value)} placeholder="VIP tháng" />
            <Field label="Mô tả" value={form.description} onChangeText={(value) => setField('description', value)} placeholder="Quyền lợi của gói" />
            <Text style={styles.label}>Đơn vị chu kỳ</Text>
            <View style={styles.segmentRow}>
              {(['month', 'year'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[styles.segment, form.billingPeriod === period && styles.segmentActive]}
                  onPress={() => setForm((current) => ({ ...current, billingPeriod: period }))}
                >
                  <Text style={form.billingPeriod === period ? styles.segmentTextActive : styles.segmentText}>
                    {period === 'month' ? 'Tháng' : 'Năm'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Số đơn vị mỗi chu kỳ" value={form.billingInterval} onChangeText={(value) => setField('billingInterval', value)} placeholder="1" keyboardType="number-pad" />
            <Field label="Apple Product ID" value={form.appleProductId} onChangeText={(value) => setField('appleProductId', value)} placeholder="com.danang.itinerary.vip.monthly" />
            <Field label="Google Product ID" value={form.googleProductId} onChangeText={(value) => setField('googleProductId', value)} placeholder="vip_monthly" />
            <Text style={styles.note}>Có thể để trống Product ID khi lưu nháp, nhưng không thể bật bán.</Text>
            <AppButton title="Lưu gói nháp" onPress={() => createMutation.mutate()} loading={createMutation.isPending} />
          </View>
        )}

        {plansQuery.isLoading && <Text style={styles.empty}>Đang tải danh sách gói…</Text>}
        {plansQuery.isError && <AppButton title="Thử tải lại" onPress={() => plansQuery.refetch()} />}
        {plansQuery.data?.map((plan) => (
          <View key={plan.id} style={styles.card}>
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.cardTitle}>{plan.name}</Text>
                <Text style={styles.code}>{plan.code}</Text>
              </View>
              <View style={[styles.badge, plan.is_active ? styles.activeBadge : styles.draftBadge]}>
                <Text style={styles.badgeText}>{plan.is_active ? 'Đang bán' : 'Nháp'}</Text>
              </View>
            </View>
            {!!plan.description && <Text style={styles.description}>{plan.description}</Text>}
            <Text style={styles.meta}>Chu kỳ: {plan.billing_interval} {plan.billing_period === 'month' ? 'tháng' : 'năm'}</Text>
            <Text style={styles.meta}>Apple: {plan.apple_product_id || 'Chưa liên kết'}</Text>
            <Text style={styles.meta}>Google: {plan.google_product_id || 'Chưa liên kết'}</Text>
            <AppButton
              title={plan.is_active ? 'Ngừng bán' : 'Bật bán'}
              variant={plan.is_active ? 'outline' : 'primary'}
              onPress={() => toggleMutation.mutate({ plan, active: !plan.is_active })}
              loading={toggleMutation.isPending && toggleMutation.variables?.plan.id === plan.id}
            />
          </View>
        ))}
        {!plansQuery.isLoading && plansQuery.data?.length === 0 && <Text style={styles.empty}>Chưa có gói VIP nào.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} style={styles.input} placeholderTextColor={Colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.md },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.surface },
  headerCopy: { flex: 1 },
  title: { ...Typography.h1, color: Colors.primary },
  subtitle: { ...Typography.caption, color: Colors.secondary, maxWidth: 280 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  card: { padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.white, gap: Spacing.sm },
  cardTitle: { ...Typography.h3, color: Colors.primary },
  field: { gap: Spacing.xs },
  label: { ...Typography.label, color: Colors.textPrimary },
  input: { minHeight: 46, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md, paddingHorizontal: Spacing.md, color: Colors.textPrimary, backgroundColor: Colors.background },
  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segment: { flex: 1, padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.divider, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segmentText: { color: Colors.secondary },
  segmentTextActive: { color: Colors.white, fontWeight: '700' },
  note: { ...Typography.caption, color: Colors.secondary, marginBottom: Spacing.sm },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  planInfo: { flex: 1 },
  code: { ...Typography.caption, color: Colors.secondary },
  description: { ...Typography.body, color: Colors.textPrimary },
  meta: { ...Typography.caption, color: Colors.secondary },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  activeBadge: { backgroundColor: Colors.accent },
  draftBadge: { backgroundColor: Colors.divider },
  badgeText: { ...Typography.caption, color: Colors.primaryDark, fontWeight: '700' },
  empty: { ...Typography.body, color: Colors.secondary, textAlign: 'center', padding: Spacing.xl },
  userGrantCard: { borderWidth: 1, borderColor: Colors.accent },
  subscriptionRow: { gap: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  actionRow: { gap: Spacing.sm, marginTop: Spacing.xs },
});
