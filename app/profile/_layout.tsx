import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, Stack } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Fonts } from '@/src/constants/spacing';
import { useAuthStore } from '@/src/stores/authStore';
import { useHasAppAccess } from '@/src/features/auth/access';
import { useCopy } from '@/src/i18n';

const COPY = {
  vi: {
    edit: 'Chỉnh sửa hồ sơ',
    settings: 'Cài đặt',
    security: 'Bảo mật tài khoản',
    delete: 'Xóa tài khoản',
    back: 'Quay lại',
  },
  en: {
    edit: 'Edit profile',
    settings: 'Settings',
    security: 'Account security',
    delete: 'Delete account',
    back: 'Go back',
  },
} as const;

export default function ProfileLayout() {
  const user = useAuthStore((state) => state.user);
  const hasAccess = useHasAppAccess();
  const c = useCopy(COPY);
  if (!user || !hasAccess) return <Redirect href="/(auth)/login" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.cardBg },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: Fonts.bodySemi },
        contentStyle: { backgroundColor: Colors.background },
        headerLeft: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.back}
            hitSlop={10}
            style={styles.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="edit" options={{ title: c.edit }} />
      <Stack.Screen name="settings" options={{ title: c.settings }} />
      <Stack.Screen name="security" options={{ title: c.security }} />
      <Stack.Screen name="delete-account" options={{ title: c.delete }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
