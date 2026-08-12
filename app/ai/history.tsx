import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { useAuthStore } from '@/src/stores/authStore';
import { deleteChatSession, listChatSessions } from '@/src/features/ai/api/chatHistory';

export default function AiChatHistoryScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['ai-chat-sessions', user?.id], queryFn: () => listChatSessions(user!.id), enabled: Boolean(user) });
  const remove = useMutation({
    mutationFn: (id: string) => deleteChatSession(id, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-chat-sessions', user?.id] }),
    onError: (error) => Alert.alert('Không thể xóa', error instanceof Error ? error.message : 'Đã xảy ra lỗi.'),
  });

  if (!user) return <SafeAreaView style={styles.center}><AppButton title="Đăng nhập" onPress={() => router.push('/(auth)/login')} /></SafeAreaView>;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.primary} /></TouchableOpacity><Text style={styles.headerTitle}>Lịch sử trò chuyện</Text><TouchableOpacity onPress={() => router.push('/ai/chat')}><Ionicons name="add-circle" size={28} color={Colors.primary} /></TouchableOpacity></View>
      {query.isLoading ? <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={Colors.primary} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          {query.isError && <AppButton title="Thử tải lại" onPress={() => query.refetch()} />}
          {query.data?.map((session) => (
            <TouchableOpacity key={session.id} style={styles.card} onPress={() => router.push({ pathname: '/ai/chat', params: { sessionId: session.id } })}>
              <View style={styles.icon}><Ionicons name="sparkles" size={18} color={Colors.white} /></View>
              <View style={styles.info}><Text style={styles.title} numberOfLines={1}>{session.title}</Text><Text style={styles.preview} numberOfLines={2}>{session.messages.at(-1)?.text || 'Chưa có tin nhắn'}</Text><Text style={styles.date}>{new Date(session.updated_at).toLocaleString('vi-VN')} · {session.messages.length} tin</Text></View>
              <TouchableOpacity onPress={() => Alert.alert('Xóa cuộc trò chuyện?', session.title, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => remove.mutate(session.id) }])}><Ionicons name="trash-outline" size={20} color={Colors.error} /></TouchableOpacity>
            </TouchableOpacity>
          ))}
          {!query.isError && query.data?.length === 0 && <Text style={styles.empty}>Chưa có cuộc trò chuyện nào.</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, center: { flex: 1, justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.background }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.divider }, headerTitle: { ...Typography.h2, color: Colors.primary }, content: { padding: Spacing.md, gap: Spacing.sm },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.white }, icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }, info: { flex: 1, gap: 2 }, title: { ...Typography.bodyBold, color: Colors.textPrimary }, preview: { ...Typography.body, color: Colors.secondary }, date: { ...Typography.caption, color: Colors.textMuted }, empty: { ...Typography.body, color: Colors.secondary, textAlign: 'center', padding: Spacing.xl },
});
