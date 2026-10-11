import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  AVAILABILITY_TASK,
  stopAvailabilityBackgroundTracking,
} from '../src/features/rescue/services/availabilityBackgroundLocation';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { removeItem: jest.fn() },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('expo-task-manager', () => ({ isTaskDefined: () => false, defineTask: jest.fn() }));
jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
}));
const oldTask = jest.mocked(TaskManager.defineTask).mock.calls[0][1];

beforeEach(() => {
  jest.clearAllMocks();
  (Constants as { executionEnvironment: string }).executionEnvironment = 'bare';
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true);
});
it('retires an old task and clears its saved owner without requesting or starting GPS', async () => {
  await stopAvailabilityBackgroundTracking();
  expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(AVAILABILITY_TASK);
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('moki:provider-availability:owner:v1');
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});
it('old background callbacks only stop themselves, even if they carry a location', async () => {
  await oldTask({
    data: { locations: [{ coords: { latitude: 16.06, longitude: 108.22 } }] },
    error: null,
    executionInfo: { eventId: 'test', taskName: AVAILABILITY_TASK },
  });
  expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(AVAILABILITY_TASK);
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});
it('does not invoke unsupported native background APIs in Expo Go', async () => {
  (Constants as { executionEnvironment: string }).executionEnvironment = 'storeClient';
  await stopAvailabilityBackgroundTracking();
  expect(Location.hasStartedLocationUpdatesAsync).not.toHaveBeenCalled();
  expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});
it('recovers after a previous native cleanup error', async () => {
  jest
    .mocked(Location.stopLocationUpdatesAsync)
    .mockRejectedValueOnce(new Error('Native cleanup unavailable'));
  await expect(stopAvailabilityBackgroundTracking()).rejects.toThrow();
  await expect(stopAvailabilityBackgroundTracking()).resolves.toBeUndefined();
});
