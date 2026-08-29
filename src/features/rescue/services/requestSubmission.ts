import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CreateRescueInput } from '@/src/types/rescue';
import { createUuid } from '@/src/utils/uuid';

const STORAGE_KEY = '@moki-rescue/request-submission/v1';

interface StoredSubmission {
  key: string;
  payload: string;
}

export async function getRequestSubmissionKey(input: CreateRescueInput) {
  const payload = JSON.stringify(input);
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<StoredSubmission>;
      if (stored.payload === payload && typeof stored.key === 'string') return stored.key;
    }
  } catch {
    // A damaged local draft must not block a roadside request.
  }
  const key = createUuid();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ key, payload } satisfies StoredSubmission));
  return key;
}

export async function clearRequestSubmission() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
