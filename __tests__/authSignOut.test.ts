import type { User } from '@supabase/supabase-js';
import { supabase } from '@/src/services/supabase';
import { useAuthStore } from '@/src/stores/authStore';
import type { Profile } from '@/src/types/profile';

jest.mock('@/src/services/supabase', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));
jest.mock('@/src/i18n', () => ({ useI18n: { getState: () => ({ language: 'vi' }) } }));

const mockSignOut = jest.mocked(supabase.auth.signOut);

beforeEach(() => {
  mockSignOut.mockReset();
  useAuthStore.setState({
    user: { id: 'test-user' } as User,
    profile: { id: 'test-user' } as Profile,
    isLoading: false,
    isProfileLoading: false,
    isHydrated: true,
    error: 'old profile error',
  });
});

describe.each([
  ['signOut', 'local'],
  ['signOutEverywhere', 'global'],
] as const)('%s', (action, scope) => {
  it('resolves only when Supabase confirms success', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await expect(useAuthStore.getState()[action]()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledWith({ scope });
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      isLoading: false,
      isProfileLoading: false,
      isHydrated: true,
      error: null,
    });
  });

  it('rejects a returned API error instead of claiming revocation succeeded', async () => {
    const error = { message: 'Server unavailable', status: 503 } as NonNullable<
      Awaited<ReturnType<typeof supabase.auth.signOut>>['error']
    >;
    mockSignOut.mockResolvedValue({ error });
    await expect(useAuthStore.getState()[action]()).rejects.toBe(error);
    expect(mockSignOut).toHaveBeenCalledWith({ scope });
    expect(useAuthStore.getState()).toMatchObject({ user: null, profile: null, isLoading: false });
  });

  it('propagates a thrown network/storage failure and always releases the loading state', async () => {
    const error = new Error('Storage unavailable');
    mockSignOut.mockRejectedValue(error);
    await expect(useAuthStore.getState()[action]()).rejects.toBe(error);
    expect(useAuthStore.getState()).toMatchObject({ user: null, profile: null, isLoading: false });
  });
});
