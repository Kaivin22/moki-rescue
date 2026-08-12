import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro';
import { Literata_500Medium, Literata_700Bold } from '@expo-google-fonts/literata';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '@/src/constants/colors';
import { useAuthStore } from '@/src/stores/authStore';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { supabase } from '@/src/services/supabase';
import { handleAuthDeepLink } from '@/src/features/auth/authDeepLink';
import { ReduceMotionProvider } from '@/src/hooks/useReduceMotion';

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
  const syncUser = useAuthStore((s) => s.syncUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    void initialize();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null);
    });

    const openUrl = async (url: string) => {
      try {
        const result = await handleAuthDeepLink(url);
        if (result.recovery) router.replace('/(auth)/reset-password');
      } catch {
        router.replace({ pathname: '/(auth)/forgot-password', params: { linkError: '1' } });
      }
    };
    const linkSubscription = Linking.addEventListener('url', ({ url }) => void openUrl(url));
    void Linking.getInitialURL().then((url) => { if (url) void openUrl(url); });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [initialize, syncUser]);

  if (!isHydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

function RouteStatusBar() {
  const pathname = usePathname();
  const usesDarkSurface =
    pathname === '/' ||
    pathname === '/create' ||
    pathname === '/profile' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/profile-setup' ||
    pathname === '/ai/chat' ||
    pathname.startsWith('/place/') ||
    (pathname.startsWith('/itinerary/') && !pathname.startsWith('/itinerary/share/'));

  return <StatusBar style={usesDarkSurface ? 'light' : 'dark'} translucent backgroundColor="transparent" />;
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ReduceMotionProvider>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.cardBg },
              headerTintColor: Colors.primary,
              headerTitleStyle: { fontFamily: 'BeVietnamPro_600SemiBold' },
              contentStyle: { backgroundColor: Colors.background },
              animation: 'slide_from_right',
              animationDuration: 240,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="place/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="itinerary/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="itinerary/share/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="ai/chat" options={{ headerShown: false }} />
            <Stack.Screen name="ai/history" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="vip/upgrade" options={{ headerShown: false }} />
            <Stack.Screen name="support/index" options={{ headerShown: false }} />
            <Stack.Screen name="support/ticket" options={{ headerShown: false }} />
            <Stack.Screen name="support/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="legal/terms" options={{ title: 'Điều khoản sử dụng' }} />
            <Stack.Screen name="legal/privacy" options={{ title: 'Quyền riêng tư' }} />
          </Stack>
          <RouteStatusBar />
        </AuthBootstrap>
      </QueryClientProvider>
      </ReduceMotionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
