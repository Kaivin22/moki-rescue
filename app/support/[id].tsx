import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import { getSupportTicket, replyToSupportTicket } from '@/src/features/support/api/tickets';

export default function SupportTicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const query = useQuery({ queryKey: ['support-ticket', id], queryFn: () => getSupportTicket(id), enabled: Boolean(id && user) });
  const mutation = useMutation({
    mutationFn: () => replyToSupportTicket(id, user!.id, reply),
    onSuccess: async () => { setReply(''); await queryClient.invalidateQueries({ queryKey: ['support-ticket', id] }); },
    onError: (error) => Alert.alert('Không thể gửi phản hồi', error instanceof Error ? error.message : 'Đã xảy ra lỗi.'),
  });

  if (!user) return <SafeAreaView style={styles.center}><AppButton title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></SafeAreaView>;
  if (query.isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color={Colors.primary} /></SafeAreaView>;
  if (query.isError) return <SafeAreaView style={styles.center}><Text style={{ color: Colors.error }}>Không thể tải yêu cầu hỗ trợ.</Text><AppButton title="Thử lại" onPress={() => query.refetch()} /><AppButton title="Quay lại" variant="ghost" onPress={() => router.back()} /></SafeAreaView>;
  if (!query.data) return <SafeAreaView style={styles.center}><Text>Không tìm thấy yêu cầu.</Text><AppButton title="Quay lại" onPress={() => router.back()} /></SafeAreaView>;

  const { ticket, replies } = query.data;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.primary} /></TouchableOpacity><Text style={styles.headerTitle}>Chi tiết hỗ trợ</Text><View style={{ width: 24 }} /></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.ticketCard}><Text style={styles.title}>{ticket.title}</Text><Text style={styles.meta}>{ticket.status} · {new Date(ticket.created_at).toLocaleString('vi-VN')}</Text><Text style={styles.body}>{ticket.description}</Text></View>
        <Text style={styles.section}>Trao đổi</Text>
        {replies.map((item) => <View key={item.id} style={[styles.replyCard, item.is_admin ? styles.adminReply : styles.userReply]}><Text style={styles.replyAuthor}>{item.is_admin ? 'Hỗ trợ viên' : 'Bạn'}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.meta}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text></View>)}
        {replies.length === 0 && <Text style={styles.empty}>Chưa có phản hồi.</Text>}
        {['open', 'in_progress'].includes(ticket.status) && <View style={styles.composer}><TextInput value={reply} onChangeText={setReply} maxLength={5000} placeholder="Nhập phản hồi…" placeholderTextColor={Colors.textMuted} multiline style={styles.input} /><AppButton title="Gửi phản hồi" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!reply.trim() || mutation.isPending} /></View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider }, headerTitle: { ...Typography.h2, color: Colors.primary },
  content: { padding: Spacing.md, gap: Spacing.sm }, ticketCard: { padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.white, gap: Spacing.xs },
  title: { ...Typography.h3, color: Colors.textPrimary }, section: { ...Typography.bodyBold, color: Colors.primary, marginTop: Spacing.sm }, body: { ...Typography.body, color: Colors.textPrimary }, meta: { ...Typography.caption, color: Colors.textMuted },
  replyCard: { padding: Spacing.md, borderRadius: Radius.md, gap: Spacing.xs, maxWidth: '92%' }, adminReply: { backgroundColor: Colors.surface, alignSelf: 'flex-start' }, userReply: { backgroundColor: Colors.accentSoft, alignSelf: 'flex-end' }, replyAuthor: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
  composer: { marginTop: Spacing.md, gap: Spacing.sm }, input: { minHeight: 100, textAlignVertical: 'top', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.white, color: Colors.textPrimary }, empty: { ...Typography.body, color: Colors.secondary, textAlign: 'center' },
});
