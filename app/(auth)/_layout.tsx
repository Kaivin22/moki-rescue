import { Redirect, Stack } from 'expo-router';
import { useHasAppAccess } from '@/src/features/auth/access';

export default function AuthLayout() {
  const hasAccess = useHasAppAccess();
  if (hasAccess) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="sms-login" />
      <Stack.Screen name="test-login" />
    </Stack>
  );
}
