import { Redirect, Stack } from 'expo-router';
import { useHasAppAccess } from '@/src/features/auth/access';
export default function SupportLayout() {
  const access = useHasAppAccess();
  return access ? <Stack screenOptions={{ headerShown: false }} /> : <Redirect href="/(auth)/login" />;
}
