import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_PREFIX = '@search_history:';

export function getSearchHistoryKey(userId?: string | null): string {
  return `${SEARCH_HISTORY_PREFIX}${userId ?? 'guest'}`;
}
export async function readSearchHistory(userId?: string | null): Promise<string[]> {
  const key = getSearchHistoryKey(userId);
  try {
    const stored = await AsyncStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) throw new Error('Invalid search history');
    return parsed
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .slice(0, 10);
  } catch {
    await AsyncStorage.removeItem(key);
    return [];
  }
}

export async function clearSearchHistory(userId?: string | null): Promise<void> {
  await AsyncStorage.removeItem(getSearchHistoryKey(userId));
}
