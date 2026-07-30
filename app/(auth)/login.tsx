import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ImageBackground } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AppButton } from '@/src/components/atoms/AppButton';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';
import { AnimatedBackground } from '@/src/components/atoms/AnimatedBackground';

export default function LoginScreen() {
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
      email,
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Đăng nhập thất bại', error.message);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Header 35% */}
        <AnimatedBackground 
          scene="beach"
          source={require('../../assets/images/beach_panorama.png')} 
          height={320}
          duration={35000}
        >
          <View style={styles.overlay}>
            <Ionicons name="compass" size={48} color={Colors.white} style={styles.headerIcon} />
            <Text style={[Typography.display, styles.headerTitle]}>Xin chào!</Text>
          </View>
        </AnimatedBackground>

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
          
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={[Typography.caption, styles.dividerText]}>hoặc</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <AppButton
            title="Tiếp tục với Google"
            variant="secondary"
            onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
            style={styles.googleBtn}
          />
          
          <View style={styles.registerContainer}>
            <Text style={[Typography.body, { color: Colors.secondary }]}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[Typography.bodyBold, { color: Colors.accent }]}>Đăng ký</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: Spacing.xl,
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
});
