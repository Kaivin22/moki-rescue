import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { ApiClientError } from '../api/client';
import { RescueDistance, RescueTiming } from '../config/operational';
import { flushProviderLocation, queueProviderLocation } from './providerLocationOutbox';
import { isValidProviderAccuracy } from './locationAccuracy';
import { Colors } from '@/src/constants/colors';
import { useI18n } from '@/src/i18n';

const TASK_NAME = 'motorescue-provider-location-v1';
const ACTIVE_REQUEST_KEY = 'motorescue:provider-location:active-request:v1';

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const requestId = await AsyncStorage.getItem(ACTIVE_REQUEST_KEY);
    if (!requestId) return;
    const latest = data.locations[data.locations.length - 1];
    if (!isValidProviderAccuracy(latest.coords.accuracy)) return;
    await queueProviderLocation(requestId, {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
      accuracyM: latest.coords.accuracy,
      recordedAt: new Date(latest.timestamp).toISOString(),
    });
    try {
      await flushProviderLocation(requestId);
    } catch (taskError) {
      if (
        taskError instanceof ApiClientError &&
        ['LOCATION_NOT_ALLOWED', 'AUTH_REQUIRED', 'ACCOUNT_INACTIVE', 'HTTP_401', 'HTTP_403'].includes(
          taskError.code,
        )
      ) {
        await stopProviderBackgroundTracking().catch(() => undefined);
      }
    }
  });
}

export function isExpoGoRuntime() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function startProviderBackgroundTracking(requestId: string): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGoRuntime()) return false;
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== Location.PermissionStatus.GRANTED) return false;
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== Location.PermissionStatus.GRANTED) return false;

  await AsyncStorage.setItem(ACTIVE_REQUEST_KEY, requestId);
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (!alreadyStarted) {
    const english = useI18n.getState().language === 'en';
    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.High,
      distanceInterval: RescueDistance.backgroundLocationMeters,
      timeInterval: RescueTiming.backgroundLocationIntervalMs,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: english
          ? 'MotoRescue is tracking an active request'
          : 'MotoRescue đang theo dõi ca cứu hộ',
        notificationBody: english
          ? 'Location is shared only with the customer and dispatch staff for the active request.'
          : 'Vị trí chỉ được chia sẻ với khách và điều phối viên của ca đang hoạt động.',
        notificationColor: Colors.accent,
      },
    });
  }
  return true;
}

export async function stopProviderBackgroundTracking() {
  await AsyncStorage.removeItem(ACTIVE_REQUEST_KEY);
  if (Platform.OS === 'web' || isExpoGoRuntime()) return;
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
}
