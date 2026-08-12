import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import type { Profile } from '../types/profile';
export type { Profile } from '../types/profile';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isProfileLoading: true,
  isHydrated: false,
  error: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  syncUser: async (user) => {
    set({ user, isLoading: true, isProfileLoading: Boolean(user), error: null });
    if (!user) {
      set({ profile: null, isLoading: false, isProfileLoading: false, isHydrated: true });
      return;
    }
    try {
      const profile = await fetchProfile(user.id);
      if (get().user?.id === user.id) set({ profile, error: null });
    } catch (error) {
      if (get().user?.id === user.id) {
        set({ profile: null, error: error instanceof Error ? error.message : 'Không thể tải hồ sơ.' });
      }
    } finally {
      if (get().user?.id === user.id) set({ isLoading: false, isProfileLoading: false, isHydrated: true });
    }
  },
  initialize: async () => {
    if (get().isHydrated) return;
    set({ isLoading: true, isProfileLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const user = data.session?.user ?? null;
      set({ user });
      if (!user) {
        set({ profile: null });
      } else {
        try {
          const profile = await fetchProfile(user.id);
          if (get().user?.id === user.id) set({ profile });
        } catch (profileError) {
          if (get().user?.id === user.id) {
            set({
              profile: null,
              error: profileError instanceof Error ? profileError.message : 'Không thể tải hồ sơ.',
            });
          }
        }
      }
    } catch (error) {
      set({ user: null, profile: null, error: error instanceof Error ? error.message : 'Không thể khởi tạo phiên đăng nhập.' });
    } finally {
      set({ isLoading: false, isProfileLoading: false, isHydrated: true });
    }
  },
  refreshProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null, isProfileLoading: false });
      return;
    }
    set({ isProfileLoading: true, error: null });
    try {
      const profile = await fetchProfile(user.id);
      if (get().user?.id === user.id) set({ profile, error: null });
    } catch (error) {
      if (get().user?.id === user.id) {
        set({ error: error instanceof Error ? error.message : 'Không thể làm mới hồ sơ.' });
      }
    } finally {
      if (get().user?.id === user.id) set({ isProfileLoading: false });
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
