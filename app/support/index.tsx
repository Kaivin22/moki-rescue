import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import { getMySupportTickets, type TicketStatus } from '@/src/features/support/api/tickets';

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Đã tiếp nhận', in_progress: 'Đang xử lý', resolved: 'Đã phản hồi', closed: 'Đã đóng',
};

export default function SupportHistoryScreen() {
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    queryKey: ['my-support-tickets', user?.id],
    queryFn: () => getMySupportTickets(user!.id),
    enabled: Boolean(user),
  });

  if (!user) {
    return <SafeAreaView style={styles.center}><Text style={styles.empty}>Vui lòng đăng nhập để xem hỗ trợ.</Text><AppButton title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.primary} /></TouchableOpacity>
        <Text style={styles.title}>Yêu cầu hỗ trợ</Text>
        <TouchableOpacity onPress={() => router.push('/support/ticket')}><Ionicons name="add-circle" size={28} color={Colors.primary} /></TouchableOpacity>
      </View>
      {query.isLoading ? <ActivityIndicator style={styles.loader} color={Colors.primary} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          {query.isError && <AppButton title="Thử tải lại" onPress={() => query.refetch()} />}
          {query.data?.map((ticket) => (
            <TouchableOpacity key={ticket.id} style={styles.card} onPress={() => router.push(`/support/${ticket.id}`)}>
              <View style={styles.row}>
                <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
                <Text style={styles.status}>{STATUS_LABEL[ticket.status]}</Text>
              </View>
              <Text style={styles.description} numberOfLines={2}>{ticket.description}</Text>
              <Text style={styles.date}>{new Date(ticket.updated_at).toLocaleString('vi-VN')}</Text>
            </TouchableOpacity>
          ))}
          {!query.isError && query.data?.length === 0 && <Text style={styles.empty}>Bạn chưa gửi yêu cầu hỗ trợ nào.</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  title: { ...Typography.h2, color: Colors.primary },
  loader: { marginTop: Spacing.xxl },
  content: { padding: Spacing.md, gap: Spacing.sm },
  card: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.white, gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ticketTitle: { ...Typography.bodyBold, color: Colors.textPrimary, flex: 1 },
  status: { ...Typography.caption, color: Colors.primary },
  description: { ...Typography.body, color: Colors.secondary },
  date: { ...Typography.caption, color: Colors.textMuted },
  empty: { ...Typography.body, color: Colors.secondary, textAlign: 'center' },
});
