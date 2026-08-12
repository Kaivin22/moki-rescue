import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';

export default function DeleteAccountScreen() {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const signOut = useAuthStore((state) => state.signOut);

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE') {
      Alert.alert('Chưa xác nhận', 'Nhập chính xác DELETE để tiếp tục.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('delete_my_account', { p_confirmation: confirmation });
    if (error) {
      setLoading(false);
      Alert.alert('Không thể xóa tài khoản', 'Dữ liệu chưa bị xóa. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
      return;
    }
    await signOut().catch(() => undefined);
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Xóa tài khoản</Text>
        <View style={styles.warning}>
          <Text style={styles.warningTitle}>Thao tác không thể hoàn tác</Text>
          <Text style={styles.warningBody}>Hồ sơ, lịch trình, đánh giá, hội thoại AI, ticket và dữ liệu cá nhân gắn với tài khoản sẽ bị xóa. Nội dung audit tối thiểu có thể được giữ khi pháp luật hoặc an toàn hệ thống yêu cầu.</Text>
        </View>
        <AppInput label="Nhập DELETE để xác nhận" placeholder="DELETE" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" />
        <AppButton title="Xóa vĩnh viễn" onPress={deleteAccount} loading={loading} disabled={confirmation !== 'DELETE'} style={styles.deleteButton} />
        <AppButton title="Hủy" variant="outline" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.xl },
  title: { ...Typography.h1, color: Colors.primary, marginBottom: Spacing.lg },
  warning: { backgroundColor: Colors.error + '12', borderWidth: 1, borderColor: Colors.error + '55', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xl },
  warningTitle: { ...Typography.h3, color: Colors.error, marginBottom: Spacing.sm },
  warningBody: { ...Typography.body, color: Colors.textSecondary },
  deleteButton: { backgroundColor: Colors.error, marginTop: Spacing.md, marginBottom: Spacing.md },
});
