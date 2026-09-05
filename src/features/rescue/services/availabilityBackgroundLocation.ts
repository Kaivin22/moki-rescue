import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { supabase } from '@/src/services/supabase';
import { useI18n } from '@/src/i18n';
import { ApiClientError } from '../api/client';
import { rescueApi } from '../api/rescueApi';
import { RescueTiming } from '../config/operational';
import { isValidProviderAccuracy } from './locationAccuracy';
import { isLocationFresh } from './locationPolicy';

export const AVAILABILITY_TASK = 'moki-provider-availability-v1';
const OWNER_KEY = 'moki:provider-availability:owner:v1';
let generation = 0;
let transition: Promise<unknown> = Promise.resolve();

function nativeRuntime() {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = transition.catch(() => undefined).then(operation);
  transition = next;
  return next;
}

export async function publishAvailabilityPosition(position: Location.LocationObject) {
  if (
    !isValidProviderAccuracy(position.coords.accuracy) ||
    !Number.isFinite(position.timestamp) ||
    !isLocationFresh(new Date(position.timestamp).toISOString())
  )
    return false;
  await rescueApi.saveProviderAvailabilityLocation(
    position.coords.latitude,
    position.coords.longitude,
    position.coords.accuracy,
  );
  return true;
}

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(AVAILABILITY_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    AVAILABILITY_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      try {
        const owner = await AsyncStorage.getItem(OWNER_KEY);
        const { data: auth } = await supabase.auth.getSession();
        if (!owner || auth.session?.user.id !== owner) {
          await stopAvailabilityBackgroundTracking();
          return;
        }
        await publishAvailabilityPosition(data.locations[data.locations.length - 1]);
      } catch (taskError) {
        if (
          taskError instanceof ApiClientError &&
          [
            'AUTH_REQUIRED',
            'ACCOUNT_INACTIVE',
            'PROVIDER_NOT_AVAILABLE',
            'PROVIDER_ROLE_REQUIRED',
            'PROVIDER_NOT_READY',
            'CONSENT_REQUIRED',
            'HTTP_401',
            'HTTP_403',
          ].includes(taskError.code)
        ) {
          await stopAvailabilityBackgroundTracking().catch(() => undefined);
        }
        // Never replay old availability GPS. The server excludes stale locations.
      }
    },
  );
}

export async function startAvailabilityBackgroundTracking(): Promise<boolean> {
  const ticket = ++generation;
  if (!nativeRuntime()) return false;
  if ((await Location.getForegroundPermissionsAsync()).status !== Location.PermissionStatus.GRANTED)
    return false;
  if ((await Location.requestBackgroundPermissionsAsync()).status !== Location.PermissionStatus.GRANTED)
    return false;
  const { data } = await supabase.auth.getSession();
  const owner = data.session?.user.id;
  if (!owner) return false;
  return serialize(async () => {
    if (ticket !== generation) return false;
    await AsyncStorage.setItem(OWNER_KEY, owner);
    try {
      if (!(await Location.hasStartedLocationUpdatesAsync(AVAILABILITY_TASK))) {
        const english = useI18n.getState().language === 'en';
        await Location.startLocationUpdatesAsync(AVAILABILITY_TASK, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 0,
          timeInterval: RescueTiming.availabilityLocationIntervalMs,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: english
              ? 'Available for Moki Rescue requests'
              : 'Đang sẵn sàng nhận ca Moki Rescue',
            notificationBody: english
              ? 'Location is used for matching while availability is on. Turn availability off to stop.'
              : 'Vị trí dùng để ghép ca khi bật sẵn sàng. Tắt sẵn sàng để dừng.',
          },
        });
      }
      return ticket === generation;
    } catch (error) {
      await AsyncStorage.removeItem(OWNER_KEY);
      throw error;
    }
  });
}

export function stopAvailabilityBackgroundTracking(): Promise<void> {
  generation++;
  return serialize(async () => {
    await AsyncStorage.removeItem(OWNER_KEY);
    if (nativeRuntime() && (await Location.hasStartedLocationUpdatesAsync(AVAILABILITY_TASK))) {
      await Location.stopLocationUpdatesAsync(AVAILABILITY_TASK);
    }
  });
}
