import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/src/stores/authStore';
import { hasCurrentConsent } from '@/src/features/auth/access';

export default function AuthLayout() {
  const user = useAuthStore((state) => state.user);
  const hasConsent = useAuthStore((state) => hasCurrentConsent(state.profile));
  if (user && hasConsent) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
