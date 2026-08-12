import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { supabase } from '@/src/services/supabase';
import { authErrorMessage } from '@/src/features/auth/authErrors';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  const updatePassword = async () => {
    if (password.length < 8) {
      Alert.alert('Mật khẩu chưa hợp lệ', 'Hãy dùng ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Mật khẩu chưa khớp', 'Hai ô mật khẩu phải giống nhau.');
      return;
    }
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      router.replace({ pathname: '/(auth)/forgot-password', params: { linkError: '1' } });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      Alert.alert('Không thể đổi mật khẩu', authErrorMessage(error, 'Liên kết có thể đã hết hạn. Hãy yêu cầu lại email.'));
      return;
    }
    Alert.alert('Đã đổi mật khẩu', 'Bạn có thể tiếp tục sử dụng ứng dụng.', [
      { text: 'Tiếp tục', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Tạo mật khẩu mới</Text>
        <Text style={styles.description}>Mật khẩu nên dài, riêng biệt và không dùng lại ở dịch vụ khác.</Text>
        <AppInput placeholder="Mật khẩu mới" leftIcon="lock-closed" isPassword value={password} onChangeText={setPassword} />
        <AppInput placeholder="Nhập lại mật khẩu" leftIcon="shield-checkmark" isPassword value={confirmation} onChangeText={setConfirmation} />
        <AppButton title="Cập nhật mật khẩu" onPress={updatePassword} loading={loading} style={{ marginTop: Spacing.md }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  keyboardArea: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  title: { ...Typography.h1, color: Colors.primary, marginBottom: Spacing.sm },
  description: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xl },
});
