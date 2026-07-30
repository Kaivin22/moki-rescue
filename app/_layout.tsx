import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro';
import { Literata_500Medium, Literata_700Bold } from '@expo-google-fonts/literata';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/src/constants/colors';
import { useAuthStore } from '@/src/stores/authStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isHydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    Literata_500Medium,
    Literata_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.primary },
            headerTintColor: Colors.white,
            headerTitleStyle: { fontFamily: 'BeVietnamPro_600SemiBold' },
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="place/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="itinerary/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="itinerary/share/[id]" options={{ title: 'Vote nhóm' }} />
          <Stack.Screen name="ai/chat" options={{ title: 'AI Du lịch' }} />
          <Stack.Screen name="admin/dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="vip/upgrade" options={{ title: 'Nâng cấp VIP' }} />
          <Stack.Screen name="support/ticket" options={{ title: 'Hỗ trợ' }} />
        </Stack>
        <StatusBar style="light" translucent backgroundColor="transparent" />
      </AuthBootstrap>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
