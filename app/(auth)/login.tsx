import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AppButton } from '@/src/components/atoms/AppButton';
import { supabase } from '@/src/services/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { SceneBackground } from '@/src/components/atoms/SceneBackground';
import { authErrorMessage } from '@/src/features/auth/authErrors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Đăng nhập thất bại', authErrorMessage(error, 'Không thể đăng nhập. Vui lòng thử lại.'));
    } else {
      const safeReturnTo = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
        ? returnTo
        : '/(tabs)';
      router.replace(safeReturnTo as never);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Header 35% */}
        <SceneBackground
          scene="beach"
          height={320}
        >
          <View style={[styles.overlay, { paddingTop: insets.top + Spacing.md }]}>
            <Ionicons name="compass" size={48} color={Colors.white} style={styles.headerIcon} />
            <Text style={[Typography.display, styles.headerTitle]}>Xin chào!</Text>
          </View>
        </SceneBackground>

        {/* White Card Rising */}
        <View style={styles.card}>
          <Text style={[Typography.h2, styles.cardTitle]}>Đăng nhập</Text>
          
          <AppInput
            placeholder="Email"
            leftIcon="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <AppInput
            placeholder="Mật khẩu"
            leftIcon="lock-closed"
            isPassword
            value={password}
            onChangeText={setPassword}
          />
          
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotPassword}>
            <Text style={[Typography.body, { color: Colors.secondary }]}>Quên mật khẩu?</Text>
          </TouchableOpacity>
          
          <AppButton
            title="Đăng nhập"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginBtn}
          />
          
          <View style={styles.registerContainer}>
            <Text style={[Typography.body, { color: Colors.secondary }]}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[Typography.bodyBold, { color: Colors.accent }]}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.guestButton}>
            <Ionicons name="compass-outline" size={20} color={Colors.primary} />
            <Text style={[Typography.bodyBold, { color: Colors.primary }]}>Tiếp tục với tư cách khách</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    height: '35%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 68, 37, 0.4)', // Colors.primary with opacity
  },
  headerIcon: {
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    color: Colors.white,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    padding: Spacing.xl,
  },
  cardTitle: {
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  loginBtn: {
    marginBottom: Spacing.lg,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerText: {
    color: Colors.secondary,
    marginHorizontal: Spacing.md,
  },
  googleBtn: {
    marginBottom: Spacing.xl,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: Spacing.xl,
  },
  guestButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.md,
  },
});
