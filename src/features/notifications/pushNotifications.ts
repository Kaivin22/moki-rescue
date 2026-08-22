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

async function getInstallationId() {
  const stored = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (stored) return stored;
  const generated = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALLATION_KEY, generated);
  return generated;
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
): Promise<'registered' | 'expo-go' | 'unavailable' | 'denied'> {
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
  if (permission.status !== 'granted' && requestPermission) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (permission.status !== 'granted') return 'denied';

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const installationId = await getInstallationId();
  await apiRequest<void>('/api/me/push-device', {
    method: 'PUT',
    body: JSON.stringify({ token, installationId, platform: Platform.OS }),
  });
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return 'registered';
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
