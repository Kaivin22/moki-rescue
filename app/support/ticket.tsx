import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { useAuthStore } from '@/src/stores/authStore';
import { createSupportTicket, TicketCategory } from '@/src/features/support/api/tickets';

const TICKET_CATEGORIES = [
  { value: 'app_bug', label: 'Lỗi ứng dụng' },
  { value: 'data_error', label: 'Dữ liệu sai' },
  { value: 'place_wrong_info', label: 'Thông tin địa điểm' },
  { value: 'payment_error', label: 'Thanh toán' },
  { value: 'suggestion', label: 'Góp ý' },
  { value: 'other', label: 'Khác' },
] as const;

export default function SupportTicketScreen() {
  const { user } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<TicketCategory>('suggestion');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để gửi yêu cầu hỗ trợ');
      return;
    }

    if (!subject || !message) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tiêu đề và nội dung');
      return;
    }

    setLoading(true);
    
    try {
      await createSupportTicket({ userId: user.id, category, title: subject, description: message });
      Alert.alert('Thành công', 'Yêu cầu của bạn đã được gửi. Chúng tôi sẽ phản hồi sớm nhất có thể.', [
        { text: 'Xem yêu cầu', onPress: () => router.replace('/support') }
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={[Typography.h2, styles.headerTitle]}>Hỗ trợ & Góp ý</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={Colors.primary} />
            <Text style={[Typography.body, styles.infoText]}>
              Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện ứng dụng tốt hơn.
            </Text>
          </View>
          <Text style={[Typography.bodyBold, { color: Colors.textPrimary, marginBottom: Spacing.sm }]}>Loại yêu cầu</Text>
          <View style={styles.categoryList}>
            {TICKET_CATEGORIES.map(item => (
              <TouchableOpacity key={item.value} style={[styles.categoryChip, category === item.value && styles.categoryChipActive]} onPress={() => setCategory(item.value)}>
                <Text style={[Typography.caption, styles.categoryText, category === item.value && styles.categoryTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Tiêu đề"
            placeholder="Ví dụ: Báo lỗi chức năng bản đồ"
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={[Typography.label, styles.inputLabel]}>Nội dung chi tiết</Text>
          <View style={styles.textAreaContainer}>
            <AppInput
              placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              style={styles.textArea}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Gửi yêu cầu"
          onPress={handleSubmit}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    color: Colors.primary,
  },
  content: {
    padding: Spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
  },
  infoText: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.primary,
  },
  inputLabel: {
    color: Colors.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  categoryChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.divider, backgroundColor: Colors.surface },
  categoryChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { color: Colors.secondary },
  categoryTextActive: { color: Colors.white, fontWeight: '700' },
  textAreaContainer: {
    // AppInput will render its own container, we just ensure proper height
  },
  textArea: {
    height: 150,
    alignItems: 'flex-start',
    paddingTop: Spacing.md,
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
});
