import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearRequestSubmission,
  getRequestSubmissionKey,
} from '@/src/features/rescue/services/requestSubmission';
import type { CreateRescueInput } from '@/src/types/rescue';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('@/src/utils/uuid', () => ({ createUuid: jest.fn(() => 'fixture-new-key') }));

const input = { serviceCode: 'flat_tire', latitude: 16.06, longitude: 108.2 } as CreateRescueInput;

beforeEach(() => jest.clearAllMocks());

it('reuses a persisted idempotency key when an uncertain submission is sent again unchanged', async () => {
  jest
    .mocked(AsyncStorage.getItem)
    .mockResolvedValue(JSON.stringify({ key: 'original-key', payload: JSON.stringify(input) }));
  await expect(getRequestSubmissionKey(input)).resolves.toBe('original-key');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
});

it('uses a new key when the actual request content changes', async () => {
  jest
    .mocked(AsyncStorage.getItem)
    .mockResolvedValue(JSON.stringify({ key: 'original-key', payload: JSON.stringify(input) }));
  await expect(getRequestSubmissionKey({ ...input, latitude: 16.07 })).resolves.toBe('fixture-new-key');
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
});

it('only removes the stored identity when cleanup is explicitly requested', async () => {
  await clearRequestSubmission();
  expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
});
