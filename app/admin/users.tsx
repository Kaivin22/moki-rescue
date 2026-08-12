import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { supabase } from '@/src/services/supabase';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { AppButton } from '@/src/components/atoms/AppButton';

const ROLE_LABELS: Record<string, string> = {
  anonymous: 'Ẩn danh', user: 'Người dùng',
  editor: 'Biên tập viên', admin: 'Quản trị viên',
};
const ROLE_COLORS: Record<string, string> = {
  anonymous: Colors.textMuted, user: Colors.sky,
  editor: Colors.accentSoft, admin: Colors.primary,
};

interface AdminUserRow {
  id: string;
  display_name: string | null;
  role: 'user' | 'editor' | 'admin';
  vip_status: 'free' | 'vip';
  vip_expires_at: string | null;
  is_banned: boolean;
  created_at: string;
}

const PAGE_SIZE = 40;

interface DonutSlice { label: string; value: number; color: string; }

function DonutChart({ slices, size = 120, strokeWidth = 22 }: { slices: DonutSlice[]; size?: number; strokeWidth?: number }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  if (total === 0) return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={Colors.divider} strokeWidth={strokeWidth} fill="none" />
      </Svg>
    </View>
  );
  let offset = 0;
  const segments = slices.map(s => {
    const dash = (s.value / total) * circumference;
    const seg = { ...s, dash, gap: circumference - dash, offset };
    offset += dash;
    return seg;
  });
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={Colors.divider} strokeWidth={strokeWidth} fill="none" />
        {segments.map((seg, i) => (
          <Circle key={i} cx={cx} cy={cy} r={r} stroke={seg.color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={circumference / 4 - seg.offset} strokeLinecap="round" />
        ))}
        <SvgText x={cx} y={cy - 6} textAnchor="middle" fill={Colors.textPrimary} fontSize="20" fontWeight="bold">{total}</SvgText>
        <SvgText x={cx} y={cy + 12} textAnchor="middle" fill={Colors.textMuted} fontSize="10">người dùng</SvgText>
      </Svg>
    </View>
  );
}

export default function AdminUsersScreen() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const usersQuery = useInfiniteQuery({
    queryKey: ['admin', 'users', debouncedSearch],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let request = supabase
        .from('profiles')
        .select('id, display_name, role, vip_status, vip_expires_at, is_banned, created_at')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      const safeSearch = debouncedSearch.replace(/[%_*,()]/g, ' ').replace(/\s+/g, ' ').trim();
      if (safeSearch) request = request.ilike('display_name', `%${safeSearch}%`);
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    enabled: profile?.role === 'admin',
  });
  const users = useMemo(() => usersQuery.data?.pages.flat() ?? [], [usersQuery.data]);

  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.denied}>
        <Ionicons name="lock-closed-outline" size={64} color={Colors.error} />
        <Text style={[Typography.h3, { color: Colors.primary, marginTop: 16 }]}>Không có quyền truy cập</Text>
        <AppButton title="Về Trang chủ" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.rpc('admin_set_user_access', { p_user_id: userId, p_role: newRole, p_is_banned: null });
    if (!error) await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    else Alert.alert('Không thể đổi quyền', error.message);
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    const { error } = await supabase.rpc('admin_set_user_access', { p_user_id: userId, p_role: null, p_is_banned: !isBanned });
    if (!error) await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    else Alert.alert('Không thể cập nhật tài khoản', error.message);
  };

  const roleCounts: Record<string, number> = {};
  users.forEach((u) => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
  const roleSlices: DonutSlice[] = Object.entries(roleCounts).map(([role, count]) => ({
    label: ROLE_LABELS[role] ?? role, value: count, color: ROLE_COLORS[role] ?? Colors.textMuted,
  }));

  const bannedCount = users.filter((u) => u.is_banned).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản lý Người dùng</Text>
          <Text style={styles.headerSub}>Đã tải {users.length} người dùng · {bannedCount} bị khóa</Text>
        </View>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="exit-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {usersQuery.isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : usersQuery.isError ? (
        <View style={styles.denied}><Text style={{ color: Colors.error }}>Không thể tải người dùng.</Text><AppButton title="Thử lại" onPress={() => usersQuery.refetch()} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Role Distribution */}
          {roleSlices.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>👥 Phân bổ trong dữ liệu đã tải</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md }}>
                <DonutChart slices={roleSlices} />
                <View style={{ flex: 1, gap: 8 }}>
                  {roleSlices.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                      <Text style={{ flex: 1, fontSize: 12, color: Colors.secondary }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={Colors.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm người dùng..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* User List */}
          {users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[user.role] ?? Colors.primary }]}>
                <Text style={styles.avatarText}>{(user.display_name || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{user.display_name || 'Không có tên'}</Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                  <View style={[styles.badge, { backgroundColor: (ROLE_COLORS[user.role] ?? Colors.textMuted) + '22' }]}>
                    <Text style={[styles.badgeText, { color: ROLE_COLORS[user.role] ?? Colors.textMuted }]}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Text>
                  </View>
                  {user.vip_status === 'vip' && (
                    <View style={[styles.badge, { backgroundColor: Colors.warning + '22' }]}>
                      <Text style={[styles.badgeText, { color: Colors.warning }]}>VIP</Text>
                    </View>
                  )}
                  {user.is_banned && (
                    <View style={[styles.badge, { backgroundColor: Colors.error + '22' }]}>
                      <Text style={[styles.badgeText, { color: Colors.error }]}>Bị khóa</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/admin/vip', params: { userId: user.id, userName: user.display_name || 'Người dùng' } })}
                >
                  <Ionicons name="star-outline" size={16} color={Colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, user.is_banned && { backgroundColor: Colors.error + '15' }]}
                  onPress={() => Alert.alert(
                    user.is_banned ? 'Bỏ khóa?' : 'Khóa tài khoản?',
                    user.display_name ?? 'Người dùng này',
                    [{ text: 'Hủy', style: 'cancel' }, { text: 'Xác nhận', onPress: () => toggleBan(user.id, user.is_banned) }]
                  )}
                >
                  <Ionicons name={user.is_banned ? 'lock-closed' : 'lock-open-outline'} size={16} color={user.is_banned ? Colors.error : Colors.secondary} />
                </TouchableOpacity>
                {(user.role === 'user' || user.role === 'editor') && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => Alert.alert(
                      `Đổi role → ${user.role === 'user' ? 'Editor' : 'User'}?`,
                      user.display_name ?? '',
                      [{ text: 'Hủy', style: 'cancel' }, { text: 'Xác nhận', onPress: () => updateRole(user.id, user.role === 'user' ? 'editor' : 'user') }]
                    )}
                  >
                    <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
                    <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '700' }}>
                      {user.role === 'user' ? 'Editor' : 'User'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          {users.length === 0 && <Text style={styles.empty}>Không tìm thấy người dùng phù hợp.</Text>}
          {usersQuery.hasNextPage && (
            <AppButton
              title={usersQuery.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}
              onPress={() => usersQuery.fetchNextPage()}
              loading={usersQuery.isFetchingNextPage}
              disabled={usersQuery.isFetchingNextPage}
              variant="outline"
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  header: {
    backgroundColor: Colors.primaryDark,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.h3, color: Colors.white },
  headerSub: { ...Typography.caption, color: Colors.accentSoft, marginTop: 2 },
  exitBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  content: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 40 },
  chartCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.divider,
    shadowColor: Colors.primaryDark, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  chartTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.divider,
  },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.divider,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  userName: { ...Typography.bodyBold, color: Colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.surface + '60',
  },
  empty: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', padding: Spacing.xl },
});
