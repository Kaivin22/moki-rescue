import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from '@/src/features/rescue/api/client';
import { Colors } from '@/src/constants/colors';
import { useI18n } from '@/src/i18n';

const TOKEN_KEY = 'motorescue:expo-push-token:v1';
const INSTALLATION_KEY = 'motorescue:installation-id:v1';
const TOKEN_SYNC_RETRY_DELAYS_MS = [5_000, 30_000, 120_000] as const;
export type PushRegistrationStatus = 'registered' | 'expo-go' | 'unavailable' | 'denied' | 'unchecked';

async function getInstallationId() {
  const stored = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (stored) return stored;
  const generated = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALLATION_KEY, generated);
  return generated;
}

function hasPushPermission(permission: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS !== 'ios') return permission.status === 'granted';
  const iosStatus = permission.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

export async function getPushNotificationStatus(): Promise<PushRegistrationStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unavailable';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo-go';
  const permission = await Notifications.getPermissionsAsync();
  if (hasPushPermission(permission)) return 'registered';
  return permission.status === 'undetermined' ? 'unchecked' : 'denied';
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function registerPushNotifications(
  requestPermission = true,
): Promise<Exclude<PushRegistrationStatus, 'unchecked'>> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unavailable';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo-go';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return 'unavailable';

  if (Platform.OS === 'android') {
    const english = useI18n.getState().language === 'en';
    await Notifications.setNotificationChannelAsync('rescue-updates', {
      name: english ? 'Rescue request updates' : 'Cập nhật ca cứu hộ',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: Colors.accent,
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!hasPushPermission(permission) && requestPermission) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!hasPushPermission(permission)) return 'denied';

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const installationId = await getInstallationId();
  await apiRequest<void>('/api/me/push-device', {
    method: 'PUT',
    body: JSON.stringify({ token, installationId, platform: Platform.OS }),
  });
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return 'registered';
}

export function startPushNotificationSync() {
  if (
    Platform.OS === 'web' ||
    !Device.isDevice ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    return () => undefined;
  }

  let stopped = false;
  let inFlight = false;
  let queued = false;
  let retryAttempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const synchronize = async () => {
    if (stopped) return;
    if (inFlight) {
      queued = true;
      return;
    }
    inFlight = true;
    try {
      await registerPushNotifications(false);
      retryAttempt = 0;
    } catch {
      if (retryAttempt < TOKEN_SYNC_RETRY_DELAYS_MS.length && !stopped) {
        const delay = TOKEN_SYNC_RETRY_DELAYS_MS[retryAttempt++];
        retryTimer = setTimeout(() => void synchronize(), delay);
      }
    } finally {
      inFlight = false;
      if (queued && !stopped) {
        queued = false;
        void synchronize();
      }
    }
  };

  void synchronize();
  // The listener reports a native token rollover. Fetch a fresh Expo token
  // and atomically replace the installation binding on the backend.
  const tokenListener = Notifications.addPushTokenListener(() => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    retryAttempt = 0;
    void synchronize();
  });

  return () => {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
    tokenListener.remove();
  };
}

export async function unregisterPushNotifications() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  const installationId = await getInstallationId();
  await apiRequest<void>('/api/me/push-device', {
    method: 'DELETE',
    body: JSON.stringify({ token, installationId }),
  });
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function clearStoredPushToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
