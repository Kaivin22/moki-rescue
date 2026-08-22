import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useHasAppAccess } from '@/src/features/auth/access';

export default function RescueLayout() {
  const user = useAuthStore((state) => state.user);
  const hasAccess = useHasAppAccess();
  if (!user || !hasAccess) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
