const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
  },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('expo-task-manager', () => ({ isTaskDefined: () => false, defineTask: jest.fn() }));
jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted' },
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
}));
jest.mock('../src/services/supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
jest.mock('../src/i18n', () => ({ useI18n: { getState: () => ({ language: 'vi' }) } }));
jest.mock('../src/features/rescue/api/rescueApi', () => ({
  rescueApi: { saveProviderAvailabilityLocation: jest.fn() },
}));
jest.mock('../src/features/rescue/api/client', () => ({
  ApiClientError: class extends Error {
    constructor(public code: string) {
      super(code);
    }
  },
}));

import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../src/services/supabase';
import { rescueApi } from '../src/features/rescue/api/rescueApi';
import {
  AVAILABILITY_TASK,
  startAvailabilityBackgroundTracking,
  stopAvailabilityBackgroundTracking,
  publishAvailabilityPosition,
} from '../src/features/rescue/services/availabilityBackgroundLocation';

const task = jest.mocked(TaskManager.defineTask).mock.calls[0][1];
const granted = { status: 'granted' } as Location.LocationPermissionResponse;
const position = (): Location.LocationObject => ({
  timestamp: Date.now(),
  coords: {
    latitude: 16.05,
    longitude: 108.2,
    accuracy: 20,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
});
const setUser = (id: string) =>
  jest.mocked(supabase.auth.getSession).mockResolvedValue({
    data: { session: { user: { id } } },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
const runTask = (sample = position()) =>
  task({
    data: { locations: [sample] },
    error: null,
    executionInfo: { eventId: 'test', taskName: AVAILABILITY_TASK },
  });

beforeEach(async () => {
  await stopAvailabilityBackgroundTracking();
  mockStorage.clear();
  jest.clearAllMocks();
  (Constants as { executionEnvironment: string }).executionEnvironment = 'bare';
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(granted);
  jest.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValue(granted);
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false);
  setUser('provider-a');
});

it('binds background availability to the signed-in provider and publishes fresh GPS', async () => {
  expect(await startAvailabilityBackgroundTracking()).toBe(true);
  expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
    AVAILABILITY_TASK,
    expect.objectContaining({ distanceInterval: 0, timeInterval: 30000 }),
  );
  await runTask();
  expect(rescueApi.saveProviderAvailabilityLocation).toHaveBeenCalledWith(16.05, 108.2, 20);
});

it('does not start native tracking when background permission is denied', async () => {
  jest
    .mocked(Location.requestBackgroundPermissionsAsync)
    .mockResolvedValue({ status: 'denied' } as Location.LocationPermissionResponse);
  expect(await startAvailabilityBackgroundTracking()).toBe(false);
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  expect(mockStorage.size).toBe(0);
});

it('reports foreground-only support in Expo Go without requesting background permission', async () => {
  (Constants as { executionEnvironment: string }).executionEnvironment = 'storeClient';
  expect(await startAvailabilityBackgroundTracking()).toBe(false);
  expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});

it('never publishes a previous account location after account switching', async () => {
  await startAvailabilityBackgroundTracking();
  setUser('provider-b');
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true);
  await runTask();
  expect(rescueApi.saveProviderAvailabilityLocation).not.toHaveBeenCalled();
  expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(AVAILABILITY_TASK);
  expect(mockStorage.size).toBe(0);
});

it('stops and clears tracking when availability is disabled', async () => {
  await startAvailabilityBackgroundTracking();
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true);
  await stopAvailabilityBackgroundTracking();
  await runTask();
  expect(rescueApi.saveProviderAvailabilityLocation).not.toHaveBeenCalled();
  expect(mockStorage.size).toBe(0);
});

it('does not resurrect tracking when permission resolves after stop', async () => {
  let finish!: (value: Location.LocationPermissionResponse) => void;
  jest.mocked(Location.requestBackgroundPermissionsAsync).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const starting = startAvailabilityBackgroundTracking();
  await Promise.resolve();
  await stopAvailabilityBackgroundTracking();
  finish(granted);
  expect(await starting).toBe(false);
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

it('discards stale, future and inaccurate samples instead of making them fresh again', async () => {
  expect(await publishAvailabilityPosition({ ...position(), timestamp: Date.now() - 180000 })).toBe(false);
  expect(await publishAvailabilityPosition({ ...position(), timestamp: Date.now() + 60000 })).toBe(false);
  const inaccurate = position();
  inaccurate.coords.accuracy = null;
  expect(await publishAvailabilityPosition(inaccurate)).toBe(false);
  expect(rescueApi.saveProviderAvailabilityLocation).not.toHaveBeenCalled();
});
