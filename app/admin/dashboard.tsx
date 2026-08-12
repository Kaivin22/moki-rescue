import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { useAdminStats, type AdminStats } from '@/src/hooks/useAdmin';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';
import { AppButton } from '@/src/components/atoms/AppButton';
import { removePlaceImages, storagePathFromPublicUrl } from '@/src/features/places/api/placeImageStorage';
import {
  useAdminPendingPlaces,
  useAdminReviews,
  type PendingPlace,
} from '@/src/features/admin/api/dashboardQueries';
import { BarChart, ChartLegend, DonutChart, type ChartItem } from '@/src/features/admin/components/AdminCharts';

type Section = 'overview' | 'content' | 'operations';


const ROLE_LABELS: Record<string, string> = {
  anonymous: 'Ẩn danh',
  user: 'Người dùng',
  editor: 'Biên tập viên',
  admin: 'Quản trị viên',
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
// ─── Donut Chart ──────────────────────────────────────────────────────────────
// ─── Bar Chart ────────────────────────────────────────────────────────────────
// ─── Legend ───────────────────────────────────────────────────────────────────
// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminDashboardScreen() {
  const { profile } = useAuthStore();
  const [activeSection, setActiveSection] = useState<Section>('overview');
  const queryClient = useQueryClient();

  const { data: stats } = useAdminStats(
    profile?.role === 'admin'
  );

  if (profile?.role !== 'admin') {
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
    { id: 'content', title: 'Nội dung', icon: 'document-text' },
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
            <Ionicons name={s.icon as any} size={16} color={activeSection === s.id ? Colors.primary : Colors.textMuted} />
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
        {activeSection === 'content' && <ContentSection queryClient={queryClient} />}
        {activeSection === 'operations' && <OperationsSection stats={displayStats} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function OverviewSection({ stats }: { stats: AdminStats }) {
  const quickStats = [
    { label: 'Địa điểm', value: stats.totalPlaces, icon: 'location', color: Colors.primary },
    { label: 'Người dùng', value: stats.activeUsers, icon: 'people', color: Colors.chart2 },
    { label: 'Lịch trình', value: stats.totalItineraries, icon: 'map', color: Colors.chart4 },
    { label: 'VIP', value: stats.vipUsers, icon: 'star', color: Colors.warning },
    { label: 'Tickets mở', value: stats.openTickets, icon: 'ticket', color: Colors.error },
  ];

  const donutSlices: ChartItem[] = [
    { label: 'Địa điểm', value: stats.totalPlaces, color: Colors.chart1 },
    { label: 'Lịch trình', value: stats.totalItineraries, color: Colors.chart2 },
    { label: 'VIP users', value: stats.vipUsers, color: Colors.chart3 },
    { label: 'Tickets', value: stats.openTickets, color: Colors.chart4 },
  ];

  const bars: ChartItem[] = [
    { label: 'Địa điểm', value: stats.totalPlaces, color: Colors.chart1 },
    { label: 'Users', value: stats.activeUsers, color: Colors.chart2 },
    { label: 'Lịch trình', value: stats.totalItineraries, color: Colors.chart4 },
    { label: 'VIP', value: stats.vipUsers, color: Colors.warning },
    { label: 'Tickets', value: stats.openTickets, color: Colors.error },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Tổng quan hệ thống</Text>

      {/* Quick stats row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
        {quickStats.map(c => (
          <View key={c.label} style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: c.color + '22' }]}>
              <Ionicons name={c.icon as any} size={20} color={c.color} />
            </View>
            <Text style={[styles.quickStatValue, { color: c.color }]}>{c.value}</Text>
            <Text style={styles.quickStatLabel}>{c.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Donut chart card */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Phân bổ hệ thống</Text>
        <Text style={styles.chartSubtitle}>Tỉ lệ các thành phần chính</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md }}>
          <DonutChart slices={donutSlices} size={150} strokeWidth={26} />
          <View style={{ flex: 1 }}>
            <ChartLegend items={donutSlices} />
          </View>
        </View>
      </View>

      {/* Bar chart card */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📈 Số liệu theo danh mục</Text>
        <Text style={styles.chartSubtitle}>Biểu đồ cột so sánh</Text>
        <View style={{ marginTop: Spacing.md, alignItems: 'center' }}>
          <BarChart bars={bars} height={100} />
        </View>
      </View>
    </View>
  );
}



// ─── Content Section ──────────────────────────────────────────────────────────
function ContentSection({ queryClient }: { queryClient: QueryClient }) {
  const { data: pendingPlaces = [], isLoading } = useAdminPendingPlaces();
  const { data: reviews = [], isLoading: reviewsLoading } = useAdminReviews();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [isModerating, setIsModerating] = useState(false);
  const flaggedReviewCount = reviews.filter(review => review.is_flagged).length;

  const cleanStoredUrls = async (urls: string[]) => {
    const paths = urls.map(storagePathFromPublicUrl).filter((path): path is string => !!path);
    try {
      await removePlaceImages(paths);
    } catch (cleanupError) {
      console.warn('[admin] Content saved but obsolete image cleanup failed:', cleanupError);
    }
  };

  const approvePlace = async (place: PendingPlace) => {
    const { id: placeId, revisionId } = place;
    const { error } = revisionId
      ? await supabase.rpc('review_place_revision', { p_revision_id: revisionId, p_approve: true, p_note: null })
      : await supabase.rpc('admin_moderate_place', { p_place_id: placeId, p_action: 'publish', p_note: null });
    if (error) {
      Alert.alert('Không thể duyệt', error.message);
      return;
    }
    if (revisionId) {
      await cleanStoredUrls((place.currentImages ?? []).filter((url: string) => !(place.revisionImages ?? []).includes(url)));
    }
    queryClient.invalidateQueries({ queryKey: ['admin', 'pending-places'] });
  };

  const rejectPlace = async (place: PendingPlace) => {
    const { id: placeId, revisionId } = place;
    const { error } = revisionId
      ? await supabase.rpc('review_place_revision', { p_revision_id: revisionId, p_approve: false, p_note: 'Nội dung cần được chỉnh sửa trước khi xuất bản.' })
      : await supabase.rpc('admin_moderate_place', {
          p_place_id: placeId,
          p_action: 'reject',
          p_note: 'Nội dung cần được chỉnh sửa trước khi xuất bản.',
        });
    if (error) Alert.alert('Không thể từ chối', error.message);
    else {
      if (revisionId) {
        await cleanStoredUrls((place.revisionImages ?? []).filter((url: string) => !(place.currentImages ?? []).includes(url)));
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-places'] });
    }
  };

  const moderateReview = async (reviewId: string, flagged: boolean, reason?: string) => {
    const normalizedReason = reason?.trim() || null;
    if (flagged && !normalizedReason) {
      Alert.alert('Thiếu lý do', 'Hãy nhập lý do ẩn đánh giá để lưu vào nhật ký kiểm duyệt.');
      return;
    }
    setIsModerating(true);
    const { error } = await supabase.rpc('admin_moderate_review', {
      p_review_id: reviewId,
      p_flagged: flagged,
      p_reason: normalizedReason,
    });
    setIsModerating(false);
    if (error) {
      Alert.alert('Không thể kiểm duyệt đánh giá', error.message);
      return;
    }
    setSelectedReviewId(null);
    setModerationReason('');
    queryClient.invalidateQueries({ queryKey: ['admin', 'reviews-moderation'] });
  };

  const contentBars: ChartItem[] = [
    { label: 'Chờ duyệt', value: pendingPlaces.length, color: Colors.warning },
    { label: 'Đánh giá đã ẩn', value: flaggedReviewCount, color: Colors.error },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Quản lý Nội dung</Text>
      <Text style={styles.sectionDesc}>Duyệt địa điểm mới, kiểm duyệt đánh giá vi phạm</Text>

      {/* Mini bar chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📋 Nội dung cần xử lý</Text>
        <View style={{ marginTop: Spacing.md, alignItems: 'center' }}>
          <BarChart bars={contentBars} height={80} />
        </View>
      </View>

      {/* Pending Places */}
      <View style={styles.subSection}>
        <Text style={styles.subTitle}>📍 Địa điểm chờ duyệt ({pendingPlaces.length})</Text>
        {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        {pendingPlaces.map((place) => (
          <View key={place.id} style={styles.contentCard}>
            <View style={styles.contentCardIcon}>
              <Ionicons name="location" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contentName}>{place.name}</Text>
              <Text style={styles.contentMeta}>{place.category} · {place.address}</Text>
            </View>
            <View style={styles.reviewActions}>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectPlace(place)}>
                <Ionicons name="close" size={16} color={Colors.error} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.approveBtn} onPress={() => approvePlace(place)}>
                <Ionicons name="checkmark" size={16} color={Colors.white} />
                <Text style={styles.approveBtnText}>Duyệt</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {!isLoading && pendingPlaces.length === 0 && (
          <Text style={styles.emptyText}>✅ Không có địa điểm chờ duyệt</Text>
        )}
      </View>

      {/* Review moderation */}
      <View style={styles.subSection}>
        <Text style={styles.subTitle}>🚩 Kiểm duyệt đánh giá gần đây ({flaggedReviewCount} đã ẩn)</Text>
        {reviewsLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        {reviews.map((review) => (
          <View key={review.id} style={styles.contentCard}>
            <View style={styles.contentCardIcon}>
              <Ionicons name={review.is_flagged ? 'eye-off' : 'person'} size={18} color={review.is_flagged ? Colors.error : Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contentName}>{review.profiles?.display_name || 'Ẩn danh'}</Text>
              <Text style={styles.contentMeta}>{review.places?.name || 'Địa điểm không còn tồn tại'}</Text>
              <Text style={styles.contentMeta} numberOfLines={2}>{review.comment}</Text>
              {review.is_flagged && <Text style={styles.flagReason} numberOfLines={2}>Lý do: {review.flag_reason}</Text>}
            </View>
            <TouchableOpacity
              disabled={isModerating}
              style={[styles.moderateBtn, review.is_flagged && styles.restoreBtn]}
              onPress={() => review.is_flagged
                ? Alert.alert('Khôi phục đánh giá?', 'Đánh giá sẽ hiển thị lại công khai.', [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Khôi phục', onPress: () => moderateReview(review.id, false) },
                  ])
                : (setModerationReason(''), setSelectedReviewId(review.id))}
            >
              <Ionicons name={review.is_flagged ? 'eye' : 'eye-off'} size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
        ))}
        {!reviewsLoading && reviews.length === 0 && (
          <Text style={styles.emptyText}>Chưa có đánh giá để kiểm duyệt</Text>
        )}
      </View>

      <Modal visible={selectedReviewId != null} transparent animationType="fade" onRequestClose={() => setSelectedReviewId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.moderationModal}>
            <Text style={styles.modalTitle}>Ẩn đánh giá</Text>
            <Text style={styles.modalDescription}>Lý do sẽ được lưu trong audit log và chỉ dành cho quy trình kiểm duyệt.</Text>
            <TextInput
              value={moderationReason}
              onChangeText={setModerationReason}
              placeholder="Nhập lý do vi phạm..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={1000}
              style={styles.moderationInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity disabled={isModerating} onPress={() => setSelectedReviewId(null)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isModerating || !moderationReason.trim()}
                onPress={() => selectedReviewId && moderateReview(selectedReviewId, true, moderationReason)}
                style={[styles.modalConfirm, (!moderationReason.trim() || isModerating) && styles.disabledButton]}
              >
                {isModerating ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.modalConfirmText}>Ẩn đánh giá</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



// ─── Operations Section ───────────────────────────────────────────────────────
function OperationsSection({ stats }: { stats: AdminStats }) {
  const { data: opsStats } = useQuery({
    queryKey: ['admin', 'vip-stats'],
    queryFn: async (): Promise<{ vipCount: number; aiSessionsCount: number }> => {
      const [vipList, aiUsage] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('vip_status', 'vip'),
        // 'ai_chat_sessions' là view alias của 'ai_consultations' (xem migration 04)
        supabase.from('ai_consultations').select('id', { count: 'exact', head: true }),
      ]);
      return {
        vipCount: vipList.count ?? 0,
        aiSessionsCount: aiUsage.count ?? 0,
      };
    },
  });

  const kpiCards = [
    {
      title: 'Tài khoản VIP',
      value: `${stats.vipUsers} người dùng`,
      sub: 'Số tài khoản đang có quyền VIP',
      icon: 'star',
      color: Colors.warning,
    },
    {
      title: 'Sử dụng AI Chat',
      value: `${opsStats?.aiSessionsCount ?? '...'} phiên`,
      sub: 'Tổng số phiên hội thoại AI',
      icon: 'sparkles',
      color: Colors.primary,
    },
    {
      title: 'Lịch trình được tạo',
      value: `${stats.totalItineraries} lịch trình`,
      sub: 'Tổng lịch trình trên hệ thống',
      icon: 'map',
      color: Colors.chart4,
    },
    {
      title: 'Địa điểm hoạt động',
      value: `${stats.totalPlaces} địa điểm`,
      sub: 'Đã được duyệt và công khai',
      icon: 'location',
      color: Colors.success,
    },
  ];

  // Donut for ops distribution
  const opsSlices: ChartItem[] = [
    { label: 'Người dùng', value: stats.activeUsers, color: Colors.chart1 },
    { label: 'VIP', value: stats.vipUsers, color: Colors.warning },
    { label: 'Lịch trình', value: stats.totalItineraries, color: Colors.chart2 },
    { label: 'Địa điểm', value: stats.totalPlaces, color: Colors.chart4 },
  ];

  const opsBars: ChartItem[] = [
    { label: 'Users', value: stats.activeUsers, color: Colors.chart1 },
    { label: 'VIP', value: stats.vipUsers, color: Colors.warning },
    { label: 'AI', value: opsStats?.aiSessionsCount ?? 0, color: Colors.primary },
    { label: 'Lịch trình', value: stats.totalItineraries, color: Colors.chart2 },
    { label: 'Địa điểm', value: stats.totalPlaces, color: Colors.chart4 },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Vận hành</Text>
      <Text style={styles.sectionDesc}>Số liệu quyền VIP, mức sử dụng AI và báo cáo hệ thống</Text>

      {/* Revenue donut */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🥧 Phân bổ hoạt động</Text>
        <Text style={styles.chartSubtitle}>Tỉ lệ người dùng theo phân khúc</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md }}>
          <DonutChart slices={opsSlices} size={150} strokeWidth={26} />
          <View style={{ flex: 1 }}>
            <ChartLegend items={opsSlices} />
          </View>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 So sánh chỉ số vận hành</Text>
        <View style={{ marginTop: Spacing.md, alignItems: 'center' }}>
          <BarChart bars={opsBars} height={110} />
        </View>
      </View>

      {/* KPI cards */}
      {kpiCards.map((card, i) => (
        <View key={i} style={styles.opsCard}>
          <View style={[styles.opsCardIcon, { backgroundColor: card.color + '20' }]}>
            <Ionicons name={card.icon as any} size={24} color={card.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.opsCardTitle}>{card.title}</Text>
            <Text style={[styles.opsCardValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.opsCardSub}>{card.sub}</Text>
          </View>
        </View>
      ))}
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
  headerSub: { ...Typography.caption, color: 'rgba(255,255,255,0.7)' },
  exitBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Tabs
  tabBar: { backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.divider, maxHeight: 48, minHeight: 48 },
  tabContent: { paddingHorizontal: Spacing.sm, paddingVertical: 6, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.full, gap: 5,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: Colors.surfaceWarm,
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
  tabText: { ...Typography.caption, color: Colors.textMuted, fontSize: 12 },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabBadge: {
    backgroundColor: Colors.error,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  tabBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '800' },

  content: { flex: 1 },
  sectionTitle: { ...Typography.h3, color: Colors.primary, marginBottom: Spacing.xs },
  sectionDesc: { ...Typography.caption, color: Colors.secondary, marginBottom: Spacing.md },

  // Chart card
  chartCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  chartTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  chartSubtitle: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },

  // Quick stat cards (horizontal scroll)
  quickStatCard: {
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginRight: Spacing.sm,
    minWidth: 80,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  quickStatIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickStatValue: { ...Typography.h3, fontSize: 22, fontWeight: '800' },
  quickStatLabel: { ...Typography.caption, color: Colors.textMuted, fontSize: 10, marginTop: 2 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardBg,
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
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider,
    gap: Spacing.sm,
  },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  userAvatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  userInitial: { color: Colors.white, fontWeight: '800', fontSize: 16 },
  userName: { ...Typography.bodyBold, color: Colors.textPrimary },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  roleText: { fontSize: 11, fontWeight: '700' },
  userCardRight: { flexDirection: 'row', gap: Spacing.xs },
  userActionBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface + '60',
    gap: 3,
  },
  userActionText: { ...Typography.caption, color: Colors.primary, fontSize: 11 },

  // Content section
  subSection: { marginBottom: Spacing.xl },
  subTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  contentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider, gap: Spacing.sm,
  },
  contentCardIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  contentName: { ...Typography.bodyBold, color: Colors.textPrimary },
  contentMeta: { ...Typography.caption, color: Colors.secondary },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.success, paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: Radius.md, gap: 4,
  },
  reviewActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rejectBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.error + '12', borderWidth: 1, borderColor: Colors.error + '40' },
  approveBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  moderateBtn: {
    backgroundColor: Colors.error, width: 36, height: 36,
    borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },
  restoreBtn: { backgroundColor: Colors.success },
  flagReason: { ...Typography.caption, color: Colors.error, marginTop: 3 },
  emptyText: { ...Typography.caption, color: Colors.secondary, fontStyle: 'italic', marginTop: Spacing.sm },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.45)' },
  moderationModal: { backgroundColor: Colors.cardBg, borderRadius: Radius.lg, padding: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.textPrimary },
  modalDescription: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.md },
  moderationInput: {
    minHeight: 100, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md,
    padding: Spacing.sm, color: Colors.textPrimary, textAlignVertical: 'top', ...Typography.body,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalCancel: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, justifyContent: 'center' },
  modalCancelText: { ...Typography.bodyBold, color: Colors.textSecondary },
  modalConfirm: { backgroundColor: Colors.error, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, minWidth: 105, alignItems: 'center' },
  modalConfirmText: { ...Typography.bodyBold, color: Colors.white },
  disabledButton: { opacity: 0.5 },

  // Ticket card
  ticketCard: {
    backgroundColor: Colors.cardBg,
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
    backgroundColor: Colors.cardBg, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.divider, gap: Spacing.md,
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  opsCardIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  opsCardTitle: { ...Typography.bodyBold, color: Colors.textPrimary },
  opsCardValue: { ...Typography.h3, marginTop: 2 },
  opsCardSub: { ...Typography.caption, color: Colors.secondary, marginTop: 2 },
});
