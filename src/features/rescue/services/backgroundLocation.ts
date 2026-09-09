import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { stopAvailabilityBackgroundTracking } from './availabilityBackgroundLocation';

const TASK_NAME = 'motorescue-provider-location-v1';
const ACTIVE_REQUEST_KEY = 'motorescue:provider-location:active-request:v1';

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(TASK_NAME)) {
  // Retain the old task name only to stop registrations left by an older build.
  TaskManager.defineTask(TASK_NAME, () => stopProviderBackgroundTracking().catch(() => undefined));
}

export function isExpoGoRuntime() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function stopProviderBackgroundTracking() {
  const requestId = await AsyncStorage.getItem(ACTIVE_REQUEST_KEY);
  if (requestId) await AsyncStorage.removeItem(`motorescue:provider-location:v1:${requestId}`);
  await AsyncStorage.removeItem(ACTIVE_REQUEST_KEY);
  if (Platform.OS === 'web' || isExpoGoRuntime()) return;
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
}

export async function stopAllProviderBackgroundTracking() {
  await Promise.all([stopProviderBackgroundTracking(), stopAvailabilityBackgroundTracking()]);
}
