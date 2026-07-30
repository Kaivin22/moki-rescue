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
import { supabase } from '@/src/services/supabase';

export default function SupportTicketScreen() {
  const { user } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
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
    
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject,
      message,
      status: 'open',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu: ' + error.message);
    } else {
      Alert.alert('Thành công', 'Yêu cầu của bạn đã được gửi. Chúng tôi sẽ phản hồi sớm nhất có thể.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
