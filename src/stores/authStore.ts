import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  role: string;
  vip_status: string;
  home_city?: string | null;
  travel_style?: string[] | null;
  preferred_transport?: string | null;
  phone?: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data as Profile | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isHydrated: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  initialize: async () => {
    if (get().isHydrated) return;
    set({ isLoading: true });
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    const profile = user ? await fetchProfile(user.id) : null;
    set({ user, profile, isLoading: false, isHydrated: true });
  },
  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, profile: null, isLoading: false });
  },
}));

supabase.auth.onAuthStateChange(async (_event, session) => {
  const user = session?.user ?? null;
  useAuthStore.getState().setUser(user);

  if (user) {
    const profile = await fetchProfile(user.id);
    useAuthStore.getState().setProfile(profile);
  } else {
    useAuthStore.getState().setProfile(null);
  }

  useAuthStore.getState().setLoading(false);
  if (!useAuthStore.getState().isHydrated) {
    useAuthStore.setState({ isHydrated: true });
  }
});
