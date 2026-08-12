import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/stores/authStore';
import { Colors } from '@/src/constants/colors';
import { Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';

/**
 * Admin Layout — Role-based Tab Navigator
 *
 * Admin: thấy tất cả tab (dashboard, places, users, tickets, reports)
 * Editor: chỉ thấy tab (places) — công cụ quản lý nội dung
 * Khác: bị đá ra màn hình báo lỗi
 */
export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const role = profile?.role;

  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';

  if (!isAdmin && !isEditor) {
    return (
      <SafeAreaView style={styles.denied}>
        <Ionicons name="lock-closed-outline" size={72} color={Colors.error} />
        <Text style={[Typography.h2, { color: Colors.primaryDark, marginTop: Spacing.md, textAlign: 'center' }]}>
          Không có quyền truy cập
        </Text>
        <Text style={[Typography.body, { color: Colors.secondary, textAlign: 'center', marginTop: Spacing.sm }]}>
          Chức năng này yêu cầu quyền Admin hoặc Editor.
        </Text>
        <AppButton
          title="Về Trang chủ"
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: Spacing.xl, minWidth: 180 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.primaryDark,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          elevation: 16,
          shadowColor: Colors.primaryDark,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: 'rgba(201,233,241,0.5)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 8,
        },
        tabBarIconStyle: { marginTop: 6 },
      }}
    >
      {/* Tab: Dashboard - Chỉ Admin */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Tổng quan',
          href: isAdmin ? undefined : null, // Ẩn tab nếu không phải admin
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />

      {/* Tab: Places - Admin & Editor */}
      <Tabs.Screen
        name="places"
        options={{
          title: 'Địa điểm',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location" size={size} color={color} />
          ),
        }}
      />

      {/* Tab: Users - Chỉ Admin */}
      <Tabs.Screen
        name="users"
        options={{
          title: 'Người dùng',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="vip"
        options={{
          title: 'VIP',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size} color={color} />
          ),
        }}
      />

      {/* Tab: Tickets - Chỉ Admin */}
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Hỗ trợ',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      {/* Tab: Reports - Chỉ Admin */}
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Báo cáo',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  denied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
});
