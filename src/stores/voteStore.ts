import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

interface VoteCounts {
  up: number;
  down: number;
}

interface VoteState {
  myVotes: Record<string, 'up' | 'down' | null>;
  counts: Record<string, VoteCounts>;
  loading: boolean;
  voterToken: string | null;
  ensureVoterToken: () => Promise<string>;
  castVote: (itineraryId: string, placeId: string, type: 'up' | 'down') => Promise<void>;
  fetchVotes: (itineraryId: string) => Promise<void>;
}

const TOKEN_KEY = 'danang_voter_token';

export const useVoteStore = create<VoteState>((set, get) => ({
  myVotes: {},
  counts: {},
  loading: false,
  voterToken: null,

  ensureVoterToken: async () => {
    const existing = get().voterToken;
    if (existing) return existing;

    let token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }
    set({ voterToken: token });
    return token;
  },

  fetchVotes: async (itineraryId) => {
    set({ loading: true });
    const token = await get().ensureVoterToken();

    const { data, error } = await supabase
      .from('group_votes')
      .select('place_id, vote, voter_token')
      .eq('itinerary_id', itineraryId);

    if (!error && data) {
      const counts: Record<string, VoteCounts> = {};
      const myVotes: Record<string, 'up' | 'down' | null> = {};

      data.forEach((row) => {
        if (!counts[row.place_id]) counts[row.place_id] = { up: 0, down: 0 };
        if (row.vote === 'up') counts[row.place_id].up += 1;
        if (row.vote === 'down') counts[row.place_id].down += 1;
        if (row.voter_token === token) {
          myVotes[row.place_id] = row.vote as 'up' | 'down';
        }
      });

      set({ counts, myVotes, loading: false });
    } else {
      set({ loading: false });
    }
  },

  castVote: async (itineraryId, placeId, type) => {
    const token = await get().ensureVoterToken();
    const prevVote = get().myVotes[placeId];
    const prevCounts = { ...(get().counts[placeId] || { up: 0, down: 0 }) };

    // optimistic
    const nextCounts = { ...prevCounts };
    if (prevVote === 'up') nextCounts.up = Math.max(0, nextCounts.up - 1);
    if (prevVote === 'down') nextCounts.down = Math.max(0, nextCounts.down - 1);
    if (type === 'up') nextCounts.up += 1;
    if (type === 'down') nextCounts.down += 1;

    set({
      myVotes: { ...get().myVotes, [placeId]: type },
      counts: { ...get().counts, [placeId]: nextCounts },
    });

    const { data: userData } = await supabase.auth.getUser();
    const voterName = userData.user?.email?.split('@')[0] || 'Khách';

    const { error } = await supabase.from('group_votes').upsert(
      {
        itinerary_id: itineraryId,
        place_id: placeId,
        voter_token: token,
        voter_name: voterName,
        vote: type,
      },
      { onConflict: 'itinerary_id,place_id,voter_token' }
    );

    if (error) {
      set({
        myVotes: { ...get().myVotes, [placeId]: prevVote ?? null },
        counts: { ...get().counts, [placeId]: prevCounts },
      });
    }
  },
}));
