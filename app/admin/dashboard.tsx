import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { useAdminStats } from '@/src/hooks/useAdmin';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';
import { AppButton } from '@/src/components/atoms/AppButton';

type Section = 'overview' | 'users' | 'content' | 'support' | 'operations';

const ROLE_LABELS: Record<string, string> = {
  anonymous: 'Ẩn danh',
  user: 'Người dùng',
  editor: 'Biên tập viên',
  admin: 'Quản trị viên',
};

const ROLE_COLORS: Record<string, string> = {
  anonymous: '#9CA3AF',
  user: '#3B82F6',
  editor: '#8B5CF6',
  admin: '#EF4444',
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, role, vip_status, created_at, is_banned')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useAdminTickets() {
  return useQuery({
    queryKey: ['admin', 'tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, profiles:user_id(display_name)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useAdminReviews() {
  return useQuery({
    queryKey: ['admin', 'reviews-flagged'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles:user_id(display_name), places:place_id(name)')
        .eq('is_flagged', true)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useAdminPendingPlaces() {
  return useQuery({
    queryKey: ['admin', 'pending-places'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('is_active', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const { profile } = useAuthStore();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const queryClient = useQueryClient();

  const { data: stats } = useAdminStats(
    profile?.role === 'admin' || profile?.role === 'editor'
  );

  if (profile?.role !== 'admin' && profile?.role !== 'editor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={72} color={Colors.error} />
          <Text style={[Typography.h2, { color: Colors.primary, marginTop: Spacing.md }]}>Không có quyền truy cập</Text>
          <AppButton title="Quay lại trang chủ" onPress={() => router.replace('/(tabs)')} style={{ marginTop: Spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  const displayStats = stats ?? { totalPlaces: 0, activeUsers: 0, totalItineraries: 0, vipUsers: 0, openTickets: 0 };

  const SECTIONS: { id: Section; title: string; icon: string; badge?: number }[] = [
    { id: 'overview', title: 'Tổng quan', icon: 'grid' },
    { id: 'users', title: 'Người dùng', icon: 'people' },
    { id: 'content', title: 'Nội dung', icon: 'document-text' },
    { id: 'support', title: 'Hỗ trợ', icon: 'chatbubbles', badge: displayStats.openTickets },
    { id: 'operations', title: 'Vận hành', icon: 'bar-chart' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>{profile?.display_name} · {ROLE_LABELS[profile?.role ?? 'admin']}</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.exitBtn}>
          <Ionicons name="exit-outline" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Section Tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabContent}>
        {SECTIONS.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[styles.tab, activeSection === s.id && styles.tabActive]}
            onPress={() => setActiveSection(s.id)}
          >
            <Ionicons name={s.icon as any} size={16} color={activeSection === s.id ? Colors.accent : Colors.surface + '99'} />
            <Text style={[styles.tabText, activeSection === s.id && styles.tabTextActive]}>{s.title}</Text>
            {s.badge != null && s.badge > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{s.badge}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView style={styles.content} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
        {activeSection === 'overview' && <OverviewSection stats={displayStats} />}
        {activeSection === 'users' && <UsersSection queryClient={queryClient} />}
        {activeSection === 'content' && <ContentSection queryClient={queryClient} />}
        {activeSection === 'support' && <SupportSection queryClient={queryClient} />}
        {activeSection === 'operations' && <OperationsSection stats={displayStats} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewSection({ stats }: { stats: any }) {
  const cards = [
    { label: 'Địa điểm', value: stats.totalPlaces, icon: 'location', color: '#3B82F6' },
    { label: 'Người dùng', value: stats.activeUsers, icon: 'people', color: '#10B981' },
    { label: 'Lịch trình', value: stats.totalItineraries, icon: 'map', color: '#8B5CF6' },
    { label: 'VIP', value: stats.vipUsers, icon: 'star', color: '#F59E0B' },
    { label: 'Tickets mở', value: stats.openTickets, icon: 'ticket', color: '#EF4444' },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Thống kê tổng quan</Text>
      <View style={styles.statGrid}>
        {cards.map(c => (
          <View key={c.label} style={[styles.statCard, { borderLeftColor: c.color }]}>
            <View style={[styles.statIcon, { backgroundColor: c.color + '20' }]}>
              <Ionicons name={c.icon as any} size={20} color={c.color} />
            </View>
            <Text style={[styles.statValue, { color: c.color }]}>{c.value}</Text>
            <Text style={styles.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Users Section ────────────────────────────────────────────────────────────
function UsersSection({ queryClient }: { queryClient: any }) {
  const { data: users = [], isLoading } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState('');

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const toggleBan = async (userId: string, isBanned: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !isBanned }).eq('id', userId);
    if (!error) queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  };

  const filtered = users.filter((u: any) =>
    searchQuery === '' || u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />;

  return (
    <View>
      <Text style={styles.sectionTitle}>Quản lý Người dùng</Text>
      <Text style={styles.sectionDesc}>Xem danh sách, khóa tài khoản vi phạm, nâng/hạ role (user ↔ editor)</Text>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={Colors.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm người dùng..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filtered.map((user: any) => (
        <View key={user.id} style={styles.userCard}>
          <View style={styles.userCardLeft}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{(user.display_name || 'U')[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user.display_name || 'Không có tên'}</Text>
              <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] + '22' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[user.role] }]}>{ROLE_LABELS[user.role] ?? user.role}</Text>
              </View>
            </View>
          </View>

          <View style={styles.userCardRight}>
            {/* Toggle ban */}
            <TouchableOpacity
              style={[styles.userActionBtn, user.is_banned && styles.userActionBtnActive]}
              onPress={() => Alert.alert(
                user.is_banned ? 'Bỏ khóa tài khoản?' : 'Khóa tài khoản?',
                `${user.display_name || 'người dùng này'}`,
                [{ text: 'Hủy', style: 'cancel' }, { text: 'Xác nhận', onPress: () => toggleBan(user.id, user.is_banned) }]
              )}
            >
              <Ionicons name={user.is_banned ? 'lock-closed' : 'lock-open'} size={14} color={user.is_banned ? Colors.error : Colors.secondary} />
            </TouchableOpacity>

            {/* Change role */}
            {(user.role === 'user' || user.role === 'editor') && (
              <TouchableOpacity
                style={styles.userActionBtn}
                onPress={() => updateRole(user.id, user.role === 'user' ? 'editor' : 'user')}
              >
                <Ionicons name="swap-horizontal" size={14} color={Colors.primary} />
                <Text style={styles.userActionText}>{user.role === 'user' ? '→ Editor' : '→ User'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Content Section ──────────────────────────────────────────────────────────
function ContentSection({ queryClient }: { queryClient: any }) {
  const { data: pendingPlaces = [], isLoading } = useAdminPendingPlaces();
  const { data: flaggedReviews = [], isLoading: reviewsLoading } = useAdminReviews();

  const approvePlace = async (placeId: string) => {
    await supabase.from('places').update({ is_active: true }).eq('id', placeId);
    queryClient.invalidateQueries({ queryKey: ['admin', 'pending-places'] });
  };

  const deleteReview = async (reviewId: string) => {
    await supabase.from('reviews').delete().eq('id', reviewId);
    queryClient.invalidateQueries({ queryKey: ['admin', 'reviews-flagged'] });
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Quản lý Nội dung</Text>
      <Text style={styles.sectionDesc}>Duyệt địa điểm mới, kiểm duyệt đánh giá vi phạm</Text>

      {/* Pending Places */}
      <View style={styles.subSection}>
        <Text style={styles.subTitle}>📍 Địa điểm chờ duyệt ({pendingPlaces.length})</Text>
        {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        {pendingPlaces.map((place: any) => (
          <View key={place.id} style={styles.contentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contentName}>{place.name}</Text>
              <Text style={styles.contentMeta}>{place.category} · {place.address}</Text>
            </View>
            <TouchableOpacity style={styles.approveBtn} onPress={() => approvePlace(place.id)}>
              <Ionicons name="checkmark" size={16} color={Colors.white} />
              <Text style={styles.approveBtnText}>Duyệt</Text>
            </TouchableOpacity>
          </View>
        ))}
        {!isLoading && pendingPlaces.length === 0 && (
          <Text style={styles.emptyText}>Không có địa điểm chờ duyệt</Text>
        )}
      </View>

      {/* Flagged Reviews */}
      <View style={styles.subSection}>
        <Text style={styles.subTitle}>🚩 Đánh giá vi phạm ({flaggedReviews.length})</Text>
        {reviewsLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        {flaggedReviews.map((review: any) => (
          <View key={review.id} style={styles.contentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contentName}>{review.profiles?.display_name || 'Ẩn danh'}</Text>
              <Text style={styles.contentMeta} numberOfLines={2}>{review.comment}</Text>
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() =>
              Alert.alert('Xóa đánh giá?', '', [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => deleteReview(review.id) }])
            }>
              <Ionicons name="trash" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ))}
        {!reviewsLoading && flaggedReviews.length === 0 && (
          <Text style={styles.emptyText}>Không có đánh giá vi phạm</Text>
        )}
      </View>
    </View>
  );
}

// ─── Support Section ──────────────────────────────────────────────────────────
function SupportSection({ queryClient }: { queryClient: any }) {
  const { data: tickets = [], isLoading } = useAdminTickets();
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const resolveTicket = async (ticketId: string) => {
    await supabase.from('support_tickets').update({ status: 'resolved' }).eq('id', ticketId);
    queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
  };

  const replyTicket = async (ticketId: string) => {
    await supabase.from('ticket_replies').insert({ ticket_id: ticketId, body: replyText, is_admin: true });
    await resolveTicket(ticketId);
    setReplying(null);
    setReplyText('');
  };

  const STATUS_COLORS: Record<string, string> = {
    open: '#EF4444',
    in_progress: '#F59E0B',
    resolved: '#10B981',
    closed: '#9CA3AF',
  };

  if (isLoading) return <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />;

  return (
    <View>
      <Text style={styles.sectionTitle}>Hỗ trợ & Tickets</Text>
      <Text style={styles.sectionDesc}>Xem và xử lý support tickets, phản hồi người dùng</Text>
      {tickets.map((ticket: any) => (
        <View key={ticket.id} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketUser}>{ticket.profiles?.display_name || 'Người dùng'}</Text>
            <View style={[styles.ticketStatus, { backgroundColor: STATUS_COLORS[ticket.status] + '22' }]}>
              <Text style={[styles.ticketStatusText, { color: STATUS_COLORS[ticket.status] }]}>{ticket.status}</Text>
            </View>
          </View>
          <Text style={styles.ticketSubject}>{ticket.subject}</Text>
          <Text style={styles.ticketBody} numberOfLines={3}>{ticket.body}</Text>

          {replying === ticket.id ? (
            <View style={styles.replyBox}>
              <TextInput
                style={styles.replyInput}
                placeholder="Nhập phản hồi..."
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={3}
              />
              <View style={styles.replyActions}>
                <TouchableOpacity style={styles.replyCancel} onPress={() => setReplying(null)}>
                  <Text style={{ color: Colors.secondary }}>Hủy</Text>
                </TouchableOpacity>
                <AppButton title="Gửi & Đóng" onPress={() => replyTicket(ticket.id)} style={styles.replySend} fullWidth={false} />
              </View>
            </View>
          ) : (
            <View style={styles.ticketActions}>
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <>
                  <TouchableOpacity style={styles.ticketActionBtn} onPress={() => setReplying(ticket.id)}>
                    <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
                    <Text style={styles.ticketActionText}>Phản hồi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ticketActionBtn, styles.resolveBtn]} onPress={() => resolveTicket(ticket.id)}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={Colors.white} />
                    <Text style={[styles.ticketActionText, { color: Colors.white }]}>Đóng ticket</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      ))}
      {tickets.length === 0 && <Text style={styles.emptyText}>Không có ticket nào</Text>}
    </View>
  );
}

// ─── Operations Section ───────────────────────────────────────────────────────
function OperationsSection({ stats }: { stats: any }) {
  const { data: opsStats } = useQuery({
    queryKey: ['admin', 'vip-stats'],
    queryFn: async (): Promise<{ vipCount: number; aiSessionsCount: number }> => {
      const [vipList, aiUsage] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('vip_status', 'vip'),
        supabase.from('ai_chat_sessions').select('id', { count: 'exact', head: true }),
      ]);
      return {
        vipCount: vipList.count ?? 0,
        aiSessionsCount: aiUsage.count ?? 0,
      };
    },
  });

  return (
    <View>
      <Text style={styles.sectionTitle}>Vận hành</Text>
      <Text style={styles.sectionDesc}>Thống kê doanh thu VIP, số liệu sử dụng AI, báo cáo hệ thống</Text>

      <View style={styles.opsCard}>
        <Ionicons name="star" size={24} color="#F59E0B" />
        <View style={{ flex: 1 }}>
          <Text style={styles.opsCardTitle}>Tài khoản VIP</Text>
          <Text style={styles.opsCardValue}>{stats.vipUsers} người dùng</Text>
          <Text style={styles.opsCardSub}>Tổng dự kiến: {(stats.vipUsers * 99000).toLocaleString('vi-VN')} đ/tháng</Text>
        </View>
      </View>

      <View style={styles.opsCard}>
        <Ionicons name="sparkles" size={24} color="#8B5CF6" />
        <View style={{ flex: 1 }}>
          <Text style={styles.opsCardTitle}>Sử dụng AI Chat</Text>
          <Text style={styles.opsCardValue}>{opsStats?.aiSessionsCount ?? '...'} phiên</Text>
          <Text style={styles.opsCardSub}>Tổng số phiên hội thoại AI</Text>
        </View>
      </View>

      <View style={styles.opsCard}>
        <Ionicons name="map" size={24} color="#3B82F6" />
        <View style={{ flex: 1 }}>
          <Text style={styles.opsCardTitle}>Lịch trình được tạo</Text>
          <Text style={styles.opsCardValue}>{stats.totalItineraries} lịch trình</Text>
          <Text style={styles.opsCardSub}>Tổng lịch trình trên hệ thống</Text>
        </View>
      </View>

      <View style={styles.opsCard}>
        <Ionicons name="location" size={24} color="#10B981" />
        <View style={{ flex: 1 }}>
          <Text style={styles.opsCardTitle}>Địa điểm đang hoạt động</Text>
          <Text style={styles.opsCardValue}>{stats.totalPlaces} địa điểm</Text>
          <Text style={styles.opsCardSub}>Đã được duyệt và công khai</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },

  // Header
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  headerTitle: { ...Typography.h3, color: Colors.white },
  headerSub: { ...Typography.caption, color: Colors.surface + 'cc' },
  exitBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Tabs
  tabBar: { backgroundColor: Colors.primary },
  tabContent: { paddingHorizontal: Spacing.sm, paddingBottom: 8, gap: 4 },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderRadius: Radius.md, gap: 5,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.accent, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabText: { ...Typography.caption, color: Colors.surface + '80', fontSize: 11 },
  tabTextActive: { color: Colors.accent, fontWeight: '700' },
  tabBadge: {
    backgroundColor: Colors.error,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  tabBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },

  content: { flex: 1 },
  sectionTitle: { ...Typography.h3, color: Colors.primary, marginBottom: Spacing.xs },
  sectionDesc: { ...Typography.caption, color: Colors.secondary, marginBottom: Spacing.md },

  // Stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  statValue: { ...Typography.display, fontSize: 28, fontWeight: '800' },
  statLabel: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.divider,
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, ...Typography.body, color: Colors.textPrimary },

  // User card
  userCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider,
    gap: Spacing.sm,
  },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  userInitial: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  userName: { ...Typography.bodyBold, color: Colors.textPrimary },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, marginTop: 2 },
  roleText: { fontSize: 11, fontWeight: '700' },
  userCardRight: { flexDirection: 'row', gap: Spacing.xs },
  userActionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    gap: 3,
  },
  userActionBtnActive: { backgroundColor: '#FFF0F0' },
  userActionText: { ...Typography.caption, color: Colors.primary, fontSize: 11 },

  // Content section
  subSection: { marginBottom: Spacing.xl },
  subTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  contentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider, gap: Spacing.sm,
  },
  contentName: { ...Typography.bodyBold, color: Colors.textPrimary },
  contentMeta: { ...Typography.caption, color: Colors.secondary },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10B981', paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.md, gap: 4,
  },
  approveBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    backgroundColor: Colors.error, width: 36, height: 36,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { ...Typography.caption, color: Colors.secondary, fontStyle: 'italic', marginTop: Spacing.sm },

  // Ticket card
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.divider,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  ticketUser: { ...Typography.bodyBold, color: Colors.textPrimary },
  ticketStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  ticketStatusText: { fontSize: 11, fontWeight: '700' },
  ticketSubject: { ...Typography.bodyBold, color: Colors.primary, marginBottom: Spacing.xs },
  ticketBody: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  ticketActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'flex-end' },
  ticketActionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.full, backgroundColor: Colors.surface, gap: 4,
  },
  ticketActionText: { ...Typography.caption, color: Colors.primary, fontSize: 12 },
  resolveBtn: { backgroundColor: Colors.primary },
  replyBox: { marginTop: Spacing.sm },
  replyInput: {
    borderWidth: 1, borderColor: Colors.divider,
    borderRadius: Radius.md, padding: Spacing.sm,
    ...Typography.body, color: Colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top',
  },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
  replyCancel: { padding: Spacing.sm },
  replySend: { minHeight: 38 },

  // Operations
  opsCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.white, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider, gap: Spacing.md,
  },
  opsCardTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  opsCardValue: { ...Typography.h3, color: Colors.primary, marginTop: 2 },
  opsCardSub: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
});
