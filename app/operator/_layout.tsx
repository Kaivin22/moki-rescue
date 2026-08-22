import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { useHasAppAccess } from '@/src/features/auth/access';

export default function OperatorLayout() {
  const profile = useAuthStore((state) => state.profile);
  const hasAccess = useHasAppAccess();
  if (!hasAccess) return <Redirect href="/(auth)/login" />;
  if (!profile || profile.role !== 'admin') return <Redirect href="/(tabs)/operations" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
