import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';
import { Colors } from '@/src/constants/colors';
import { Typography, Spacing, Radius } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';

const PAGE_SIZE = 30;
const REASON_LABELS: Record<string, string> = {
  wrong_hours: 'Giờ mở cửa không đúng', place_closed: 'Địa điểm đã đóng cửa',
  wrong_image: 'Hình ảnh không đúng', wrong_address: 'Địa chỉ không đúng', other: 'Vấn đề khác',
};

interface AdminReport {
  id: string;
  reason: string;
  note: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  resolution_note: string | null;
  created_at: string;
  place: { name?: string } | null;
  reporter: { display_name?: string | null } | null;
}

export default function AdminReportsScreen() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const query = useInfiniteQuery({
    queryKey: ['admin', 'reports', filter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let request = supabase
        .from('place_reports')
        .select('id, reason, note, status, resolution_note, created_at, place:places(name), reporter:profiles!place_reports_reporter_id_fkey(display_name)')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      if (filter === 'pending') request = request.eq('status', 'pending');
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []) as unknown as AdminReport[];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === PAGE_SIZE ? pages.length * PAGE_SIZE : undefined,
  });

  const reports = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const resolve = useMutation({
    mutationFn: async (input: { id: string; status: 'resolved' | 'dismissed'; note: string }) => {
      const note = input.note.trim();
      if (!note) throw new Error('Hãy nhập kết quả xác minh hoặc lý do bỏ qua.');
      const { error } = await supabase.rpc('admin_resolve_place_report', {
        p_report_id: input.id,
        p_status: input.status,
        p_resolution_note: note,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setActiveId(null);
      setResolutionNote('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
    onError: (error) => Alert.alert('Không thể xử lý báo cáo', error instanceof Error ? error.message : 'Vui lòng thử lại.'),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Báo cáo địa điểm</Text>
        <Text style={styles.headerHelp}>Mọi quyết định đều được ghi vào audit log.</Text>
      </View>
      <View style={styles.filters}>
        {(['pending', 'all'] as const).map((value) => (
          <TouchableOpacity key={value} style={[styles.filter, filter === value && styles.filterActive]} onPress={() => setFilter(value)}>
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value === 'pending' ? 'Chờ xử lý' : 'Tất cả'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {query.isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} /> : query.isError ? (
        <View style={styles.center}><Text style={styles.error}>Không thể tải danh sách báo cáo.</Text><AppButton title="Thử lại" onPress={() => query.refetch()} /></View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListEmptyComponent={<View style={styles.center}><Ionicons name="checkmark-circle-outline" size={52} color={Colors.accent} /><Text style={styles.empty}>Không có báo cáo phù hợp.</Text></View>}
          onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={styles.footer} /> : null}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.placeName}>{item.place?.name ?? 'Địa điểm đã xóa'}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
              </View>
              <Text style={styles.reporter}>Người báo: {item.reporter?.display_name || 'Người dùng'}</Text>
              <Text style={styles.reason}>{REASON_LABELS[item.reason] ?? item.reason}</Text>
              {!!item.note && <Text style={styles.note}>{item.note}</Text>}
              <Text style={styles.status}>Trạng thái: {item.status}</Text>
              {!!item.resolution_note && <Text style={styles.resolution}>Kết quả: {item.resolution_note}</Text>}
              {item.status === 'pending' && activeId !== item.id && (
                <AppButton title="Xử lý" variant="outline" onPress={() => { setActiveId(item.id); setResolutionNote(''); }} style={styles.action} />
              )}
              {item.status === 'pending' && activeId === item.id && (
                <View style={styles.resolver}>
                  <TextInput
                    value={resolutionNote}
                    onChangeText={setResolutionNote}
                    placeholder="Kết quả kiểm tra nguồn và thay đổi đã thực hiện…"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={2000}
                    multiline
                    textAlignVertical="top"
                    style={styles.input}
                  />
                  <View style={styles.actions}>
                    <AppButton title="Hủy" variant="ghost" onPress={() => setActiveId(null)} disabled={resolve.isPending} style={styles.flex} />
                    <AppButton title="Bỏ qua" variant="outline" onPress={() => resolve.mutate({ id: item.id, status: 'dismissed', note: resolutionNote })} loading={resolve.isPending} style={styles.flex} />
                    <AppButton title="Đã xử lý" onPress={() => resolve.mutate({ id: item.id, status: 'resolved', note: resolutionNote })} loading={resolve.isPending} style={styles.flex} />
                  </View>
                </View>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider, backgroundColor: Colors.white },
  headerTitle: { ...Typography.h2, color: Colors.primary },
  headerHelp: { ...Typography.caption, color: Colors.textSecondary, marginTop: 3 },
  filters: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.white },
  filter: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider },
  filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { ...Typography.caption, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white, fontWeight: '700' },
  loader: { marginTop: 40 },
  content: { padding: Spacing.md, flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  error: { ...Typography.body, color: Colors.error },
  empty: { ...Typography.body, color: Colors.textSecondary },
  card: { backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.divider },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  placeName: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },
  date: { ...Typography.caption, color: Colors.textSecondary },
  reporter: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
  reason: { ...Typography.bodyBold, color: Colors.error, marginTop: Spacing.sm },
  note: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  status: { ...Typography.caption, color: Colors.primary, marginTop: Spacing.sm },
  resolution: { ...Typography.body, color: Colors.primaryDark, backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.sm, marginTop: Spacing.sm },
  action: { marginTop: Spacing.md },
  resolver: { marginTop: Spacing.md, gap: Spacing.sm },
  input: { minHeight: 100, borderWidth: 1, borderColor: Colors.divider, borderRadius: Radius.md, padding: Spacing.md, color: Colors.textPrimary, backgroundColor: Colors.background },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  flex: { flex: 1 },
  footer: { padding: Spacing.lg },
});
