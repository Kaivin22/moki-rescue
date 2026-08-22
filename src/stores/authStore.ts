import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '@/src/services/supabase';
import type { Profile } from '@/src/types/profile';
import { useI18n } from '@/src/i18n';
export type { Profile } from '@/src/types/profile';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  syncUser: (user: User | null) => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

function authError(kind: 'profile' | 'session' | 'refresh') {
  const english = useI18n.getState().language === 'en';
  if (kind === 'session') return english ? 'Could not initialize the session.' : 'Không thể khởi tạo phiên.';
  if (kind === 'refresh') return english ? 'Could not refresh the profile.' : 'Không thể làm mới hồ sơ.';
  return english ? 'Could not load the profile.' : 'Không thể tải hồ sơ.';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isProfileLoading: true,
  isHydrated: false,
  error: null,
  syncUser: async (user) => {
    set({ user, isLoading: true, isProfileLoading: Boolean(user), error: null });
    if (!user) {
      set({ profile: null, isLoading: false, isProfileLoading: false, isHydrated: true });
      return;
    }
    try {
      const profile = await fetchProfile(user.id);
      if (get().user?.id === user.id) set({ profile });
    } catch {
      if (get().user?.id === user.id) {
        set({ error: authError('profile') });
      }
    } finally {
      if (get().user?.id === user.id) set({ isLoading: false, isProfileLoading: false, isHydrated: true });
    }
  },
  initialize: async () => {
    if (get().isHydrated) return;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const user = data.session?.user ?? null;
      set({ user });
      set({ profile: user ? await fetchProfile(user.id) : null });
    } catch {
      set({ user: null, profile: null, error: authError('session') });
    } finally {
      set({ isLoading: false, isProfileLoading: false, isHydrated: true });
    }
  },
  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    set({ isProfileLoading: true });
    try {
      set({ profile: await fetchProfile(user.id), error: null });
    } catch {
      set({ error: authError('refresh') });
    } finally {
      set({ isProfileLoading: false });
    }
  },
  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      set({ user: null, profile: null, isLoading: false, isProfileLoading: false, isHydrated: true });
    }
  },
}));
