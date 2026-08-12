import { Redirect, Stack, usePathname } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';

export default function AiRoutesLayout() {
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  if (!user) return <Redirect href={{ pathname: '/(auth)/login', params: { returnTo: pathname } }} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
