import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { Ionicons } from '@expo/vector-icons';
import { AppInput } from '@/src/components/atoms/AppInput';
import { AppButton } from '@/src/components/atoms/AppButton';
import { supabase } from '@/src/services/supabase';
import { router } from 'expo-router';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (!agreeTerms) {
      Alert.alert('Lỗi', 'Vui lòng đồng ý với Điều khoản sử dụng');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });
    setLoading(false);

    if (error) {
      Alert.alert('Đăng ký thất bại', error.message);
    } else {
      if (data.session) {
        router.replace('/(auth)/profile-setup');
      } else {
        Alert.alert('Thành công', 'Vui lòng kiểm tra email để xác thực tài khoản');
        router.push('/(auth)/login');
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.header}>
          <Ionicons name="compass" size={48} color={Colors.white} style={styles.headerIcon} />
          <Text style={[Typography.display, styles.headerTitle]}>Xin chào!</Text>
        </View>

        <View style={styles.card}>
          <Text style={[Typography.h2, styles.cardTitle]}>Tạo tài khoản</Text>
          
          <AppInput
            placeholder="Họ và tên"
            leftIcon="person"
            value={name}
            onChangeText={setName}
          />
          
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

          <AppInput
            placeholder="Xác nhận mật khẩu"
            leftIcon="lock-closed"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          
          <TouchableOpacity 
            style={styles.checkboxContainer}
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <Ionicons 
              name={agreeTerms ? 'checkbox' : 'square-outline'} 
              size={24} 
              color={agreeTerms ? Colors.accent : Colors.secondary} 
            />
            <Text style={[Typography.caption, styles.checkboxText]}>
              Tôi đồng ý với <Text style={{ color: Colors.primary }}>Điều khoản sử dụng</Text>
            </Text>
          </TouchableOpacity>
          
          <AppButton
            title="Tạo tài khoản"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerBtn}
          />
          
          <View style={styles.loginContainer}>
            <Text style={[Typography.body, { color: Colors.secondary }]}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[Typography.bodyBold, { color: Colors.accent }]}>Đăng nhập</Text>
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
    height: '25%', // Ngắn hơn một chút so với Login
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xl,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },
  checkboxText: {
    color: Colors.secondary,
    marginLeft: Spacing.sm,
  },
  registerBtn: {
    marginBottom: Spacing.lg,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingBottom: Spacing.xl,
  },
});
