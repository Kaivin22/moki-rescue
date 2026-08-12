import { Redirect, Stack, usePathname } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { Colors } from '@/src/constants/colors';
import { Typography } from '@/src/constants/spacing';

export default function ProfileRoutesLayout() {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  if (!user) return <Redirect href={{ pathname: '/(auth)/login', params: { returnTo: pathname } }} />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.cardBg },
        headerTintColor: Colors.primary,
        headerTitleStyle: Typography.h3,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="history" options={{ title: 'Lịch trình của bạn' }} />
      <Stack.Screen name="saved" options={{ title: 'Đã lưu' }} />
      <Stack.Screen name="edit" options={{ title: 'Chỉnh sửa hồ sơ' }} />
      <Stack.Screen name="settings" options={{ title: 'Cài đặt' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Xóa tài khoản' }} />
      <Stack.Screen name="reviews" options={{ headerShown: false }} />
    </Stack>
  );
}
