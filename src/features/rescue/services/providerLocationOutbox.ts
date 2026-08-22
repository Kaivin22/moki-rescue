import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClientError } from '../api/client';
import { rescueApi } from '../api/rescueApi';
import { broadcastProviderLocation } from './liveLocation';
import type { LocationPoint } from '@/src/types/rescue';
import { isLocationFresh } from './locationPolicy';
import { isValidProviderLocation } from './locationAccuracy';

const PREFIX = 'motorescue:provider-location:v1:';
export async function queueProviderLocation(requestId: string, point: LocationPoint) {
  await AsyncStorage.setItem(`${PREFIX}${requestId}`, JSON.stringify(point));
}

export async function flushProviderLocation(requestId: string): Promise<'sent' | 'queued' | 'discarded'> {
  const key = `${PREFIX}${requestId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return 'discarded';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await AsyncStorage.removeItem(key);
    return 'discarded';
  }
  if (!isValidProviderLocation(parsed)) {
    await AsyncStorage.removeItem(key);
    return 'discarded';
  }
  const point: LocationPoint = parsed;
  if (!isLocationFresh(point.recordedAt)) {
    await AsyncStorage.removeItem(key);
    return 'discarded';
  }
  try {
    await rescueApi.saveProviderLocation(requestId, point.latitude, point.longitude, point.accuracyM);
    await AsyncStorage.removeItem(key);
    await broadcastProviderLocation(requestId, point).catch(() => undefined);
    return 'sent';
  } catch (error) {
    if (error instanceof ApiClientError && ['NETWORK_ERROR', 'REQUEST_TIMEOUT'].includes(error.code)) {
      return 'queued';
    }
    await AsyncStorage.removeItem(key);
    throw error;
  }
}
