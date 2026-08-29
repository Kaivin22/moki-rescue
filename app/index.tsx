import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { hasCompletedOnboarding } from '@/src/features/onboarding/onboardingStorage';
import { useAuthStore } from '@/src/stores/authStore';
import { hasCurrentConsent } from '@/src/features/auth/access';

export default function IndexScreen() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasConsent = useAuthStore((state) => hasCurrentConsent(state.profile));
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    void hasCompletedOnboarding().then(setOnboarded);
  }, []);

  if (isLoading || onboarded === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href={user && hasConsent ? '/(tabs)' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
});
