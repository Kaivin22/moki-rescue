import { Redirect, Stack, useSegments } from 'expo-router';
import { useHasAppAccess } from '@/src/features/auth/access';
import { useAuthStore } from '@/src/stores/authStore';

export default function AuthLayout() {
  const hasAccess = useHasAppAccess();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const segments = useSegments();
  if (hasAccess) return <Redirect href="/(tabs)" />;
  if (user && profile?.is_active && !segments.includes('complete-profile'))
    return <Redirect href="/(auth)/complete-profile" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="sms-login" />
      <Stack.Screen name="test-login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="complete-profile" />
    </Stack>
  );
}
