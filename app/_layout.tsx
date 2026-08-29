import { useFonts } from 'expo-font';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack, usePathname } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '@/src/constants/colors';
import { ReduceMotionProvider, useReduceMotion } from '@/src/hooks/useReduceMotion';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import { startPushNotificationSync } from '@/src/features/notifications/pushNotifications';
import { AssistantBubble } from '@/src/features/assistant/components/AssistantBubble';
import { AppErrorBoundary } from '@/src/components/AppErrorBoundary';
import { hasCurrentConsent } from '@/src/features/auth/access';
import { useI18n } from '@/src/i18n';
import '@/src/features/rescue/services/backgroundLocation';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
    mutations: { retry: 0 },
  },
});

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const syncUser = useAuthStore((state) => state.syncUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const profileLocale = useAuthStore((state) => state.profile?.locale ?? null);
  const hasConsent = useAuthStore((state) => hasCurrentConsent(state.profile));
  const setLanguage = useI18n((state) => state.setLanguage);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    void initialize();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null;
      if (lastUserId.current && lastUserId.current !== nextUserId) queryClient.clear();
      lastUserId.current = nextUserId;
      void syncUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [initialize, syncUser]);

  useEffect(() => {
    if (!profileLocale) return undefined;

    // The authenticated profile is authoritative across installations. Run
    // once now and once after AsyncStorage hydration so an older local value
    // cannot overwrite the account preference during a cold start.
    const synchronizeLanguage = () => setLanguage(profileLocale);
    synchronizeLanguage();
    return useI18n.persist.onFinishHydration(synchronizeLanguage);
  }, [profileLocale, setLanguage]);

  useEffect(() => {
    if (userId && hasConsent) {
      // Register silently only when permission was already granted. The first
      // system prompt is initiated by the user from Settings.
      return startPushNotificationSync();
    }
    return undefined;
  }, [hasConsent, userId]);

  useEffect(() => {
    const openRequest = (response: Notifications.NotificationResponse | null) => {
      const requestId = response?.notification.request.content.data?.requestId;
      if (typeof requestId === 'string' && /^[0-9a-f-]{36}$/i.test(requestId)) {
        router.push(`/rescue/${requestId}`);
      }
    };
    const listener = Notifications.addNotificationResponseReceivedListener(openRequest);
    void Notifications.getLastNotificationResponseAsync()
      .then(openRequest)
      .catch(() => undefined);
    return () => listener.remove();
  }, []);

  if (!isHydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }
  return children;
}

function RouteStatusBar() {
  return <StatusBar style="dark" translucent backgroundColor="transparent" />;
}

function GlobalAssistant() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const hasConsent = useAuthStore((state) => hasCurrentConsent(state.profile));
  const hidden =
    !user ||
    !hasConsent ||
    pathname === '/onboarding' ||
    pathname === '/login' ||
    pathname === '/request' ||
    /^\/rescue\/[^/]+(?:\/map)?$/.test(pathname);
  const aboveTabs = ['/', '/request', '/activity', '/operations', '/profile'].includes(pathname);
  return <AssistantBubble hidden={hidden} aboveTabs={aboveTabs} />;
}

function AppNavigator() {
  const reduceMotion = useReduceMotion();
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: reduceMotion ? 'none' : 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'none', gestureEnabled: false }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="rescue/[id]" />
        <Stack.Screen name="rescue/[id]/map" />
        <Stack.Screen name="service" />
        <Stack.Screen name="help" />
        <Stack.Screen name="operator/teams" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="legal/terms" />
        <Stack.Screen name="legal/privacy" />
      </Stack>
      <GlobalAssistant />
      <RouteStatusBar />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BeVietnamPro_400Regular: require('../assets/fonts/BeVietnamPro-Regular.ttf'),
    BeVietnamPro_500Medium: require('../assets/fonts/BeVietnamPro-Medium.ttf'),
    BeVietnamPro_600SemiBold: require('../assets/fonts/BeVietnamPro-SemiBold.ttf'),
    BeVietnamPro_700Bold: require('../assets/fonts/BeVietnamPro-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded)
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ReduceMotionProvider>
          <QueryClientProvider client={queryClient}>
            <AuthBootstrap>
              <AppErrorBoundary>
                <AppNavigator />
              </AppErrorBoundary>
            </AuthBootstrap>
          </QueryClientProvider>
        </ReduceMotionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
});
