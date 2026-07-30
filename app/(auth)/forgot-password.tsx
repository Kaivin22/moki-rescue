import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AppButton } from '@/src/components/atoms/AppButton';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      Alert.alert('Lỗi', error.message);
    } else {
      setIsSent(true);
    }
  };

  if (isSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </View>
          
          <Text style={[Typography.display, styles.title, { textAlign: 'center' }]}>
            Email đã được gửi!
          </Text>
          <Text style={[Typography.body, styles.subtitle, { textAlign: 'center', marginBottom: Spacing.xl }]}>
            Vui lòng kiểm tra hộp thư đến của bạn để đặt lại mật khẩu.
          </Text>
          
          <View style={styles.emailPill}>
            <Text style={[Typography.bodyBold, { color: Colors.textPrimary }]}>{email}</Text>
          </View>

          <AppButton
            title="Quay lại đăng nhập"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.submitBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <Ionicons name="mail-unread" size={80} color={Colors.accent} />
        </View>

        <Text style={[Typography.h1, styles.title]}>Quên mật khẩu?</Text>
        <Text style={[Typography.body, styles.subtitle]}>
          Nhập email của bạn để nhận link đặt lại mật khẩu.
        </Text>

        <AppInput
          placeholder="Email của bạn"
          leftIcon="mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <AppButton
          title="Gửi link đặt lại"
          onPress={handleReset}
          loading={loading}
          style={styles.submitBtn}
        />

        <TouchableOpacity onPress={() => router.back()} style={styles.ghostLink}>
          <Text style={[Typography.body, { color: Colors.primary, textDecorationLine: 'underline' }]}>
            ← Quay lại đăng nhập
          </Text>
        </TouchableOpacity>
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
    padding: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.secondary,
    marginBottom: Spacing.xl,
  },
  submitBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  ghostLink: {
    alignItems: 'center',
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  emailPill: {
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.xxl,
  },
});
