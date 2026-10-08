import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

// Keep the old task name only to retire tasks installed before shop-based dispatch.
export const AVAILABILITY_TASK = 'moki-provider-availability-v1';
const OWNER_KEY = 'moki:provider-availability:owner:v1';
let transition: Promise<void> = Promise.resolve();

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(AVAILABILITY_TASK)) {
  TaskManager.defineTask(AVAILABILITY_TASK, async () => {
    await stopAvailabilityBackgroundTracking().catch(() => undefined);
  });
}

export function stopAvailabilityBackgroundTracking(): Promise<void> {
  const next = transition
    .catch(() => undefined)
    .then(async () => {
      await AsyncStorage.removeItem(OWNER_KEY);
      if (
        Platform.OS !== 'web' &&
        Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
        (await Location.hasStartedLocationUpdatesAsync(AVAILABILITY_TASK))
      ) {
        await Location.stopLocationUpdatesAsync(AVAILABILITY_TASK);
      }
    });
  transition = next;
  return next;
}
