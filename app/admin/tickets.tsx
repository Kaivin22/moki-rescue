import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { AppButton } from '@/src/components/atoms/AppButton';

const STATUS_COLORS: Record<string, string> = {
  open: Colors.error, in_progress: Colors.warning,
  pending: Colors.warning, resolved: '#427D71', closed: Colors.textMuted,
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Mở', in_progress: 'Đang xử lý',
  pending: 'Chờ xử lý', resolved: 'Đã giải quyết', closed: 'Đóng',
};

interface AdminTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  profiles?: { display_name?: string | null } | null;
}

const PAGE_SIZE = 30;

export default function AdminTicketsScreen() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [replying, setReplying] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'open' | 'all'>('open');

  const ticketsQuery = useInfiniteQuery({
    queryKey: ['admin', 'tickets', statusFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('support_tickets')
        .select('*, profiles:user_id(display_name)')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (statusFilter === 'open') {
        q = q.in('status', ['open', 'in_progress']);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AdminTicket[];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
    enabled: profile?.role === 'admin',
  });
  const tickets = useMemo(() => ticketsQuery.data?.pages.flat() ?? [], [ticketsQuery.data]);

  if (profile?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.denied}>
        <Ionicons name="lock-closed-outline" size={64} color={Colors.error} />
        <Text style={[Typography.h3, { color: Colors.primary, marginTop: 16 }]}>Không có quyền truy cập</Text>
        <AppButton title="Về Trang chủ" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 16 }} />
      </SafeAreaView>
    );
  }

  const replyTicket = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.rpc('admin_reply_and_resolve_ticket', {
      p_ticket_id: ticketId,
      p_body: replyText.trim(),
      p_status: 'resolved',
    });
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setReplying(null);
      setReplyText('');
    } else {
      Alert.alert('Không thể phản hồi ticket', error.message);
    }
    setIsSaving(false);
  };

  const openCount = tickets.filter((ticket) => ['open', 'in_progress'].includes(ticket.status)).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Hỗ trợ & Tickets</Text>
          <Text style={styles.headerSub}>{openCount} tickets cần xử lý · {tickets.length} tổng</Text>
        </View>
        <TouchableOpacity style={styles.exitBtn} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="exit-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={styles.filterBar}>
        {(['open', 'all'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
              {f === 'open' ? '🔴 Cần xử lý' : '📋 Tất cả'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {ticketsQuery.isLoading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      ) : ticketsQuery.isError ? (
        <View style={styles.empty}>
          <Text style={[Typography.body, { color: Colors.error, marginBottom: Spacing.md }]}>Không thể tải tickets.</Text>
          <AppButton title={ticketsQuery.isRefetching ? 'Đang thử lại…' : 'Thử lại'} onPress={() => ticketsQuery.refetch()} loading={ticketsQuery.isRefetching} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {tickets.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={56} color={Colors.accent} />
              <Text style={[Typography.h3, { color: Colors.primary, marginTop: 12 }]}>Hộp thư trống!</Text>
              <Text style={[Typography.body, { color: Colors.secondary, marginTop: 6 }]}>
                Không có tickets nào cần xử lý.
              </Text>
            </View>
          ) : (
            tickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                {/* Ticket Header */}
                <View style={styles.ticketHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View style={styles.avatarSmall}>
                      <Text style={styles.avatarText}>{(ticket.profiles?.display_name || 'U')[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.ticketUser} numberOfLines={1}>{ticket.profiles?.display_name || 'Người dùng'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[ticket.status] + '22' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[ticket.status] }]}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketSubject}>{ticket.title}</Text>
                <Text style={styles.ticketBody} numberOfLines={3}>{ticket.description}</Text>

                <Text style={styles.ticketDate}>
                  {new Date(ticket.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </Text>

                {replying === ticket.id ? (
                  <View style={styles.replyBox}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder="Nhập phản hồi cho khách hàng..."
                      value={replyText}
                      onChangeText={setReplyText}
                      multiline numberOfLines={4}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => { setReplying(null); setReplyText(''); }}>
                        <Text style={{ color: Colors.secondary }}>Hủy</Text>
                      </TouchableOpacity>
                      <AppButton
                        title="Gửi & Đóng ticket"
                        onPress={() => replyTicket(ticket.id)}
                        loading={isSaving}
                        disabled={isSaving || !replyText.trim()}
                        style={{ minHeight: 38 }}
                        fullWidth={false}
                      />
                    </View>
                  </View>
                ) : (
                  ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                      <TouchableOpacity style={styles.replyBtn} onPress={() => setReplying(ticket.id)}>
                        <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
                        <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600' }}>Phản hồi và đóng</Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>
            ))
          )}
          {ticketsQuery.hasNextPage && (
            <AppButton title={ticketsQuery.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'} onPress={() => ticketsQuery.fetchNextPage()} loading={ticketsQuery.isFetchingNextPage} variant="outline" />
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
  filterBar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.background,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { ...Typography.caption, color: Colors.secondary },
  filterChipTextActive: { color: Colors.white, fontWeight: '700' },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 60 },
  ticketCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.divider,
    shadowColor: Colors.primaryDark, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
  ticketUser: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  ticketSubject: { ...Typography.bodyBold, color: Colors.primary, marginBottom: 4 },
  ticketBody: { ...Typography.body, color: Colors.secondary, lineHeight: 20 },
  ticketDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 6 },
  replyBox: { marginTop: Spacing.md },
  replyInput: {
    borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md,
    padding: Spacing.md, ...Typography.body, color: Colors.textPrimary,
    minHeight: 100, textAlignVertical: 'top', backgroundColor: Colors.background,
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  replyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.white,
  },
});
