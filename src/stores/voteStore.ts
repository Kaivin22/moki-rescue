import { create } from 'zustand';
import { supabase } from '../services/supabase';

interface VoteCounts {
  up: number;
  down: number;
}

interface VoteState {
  currentShareToken: string | null;
  myVotes: Record<string, 'up' | 'down' | null>;
  counts: Record<string, VoteCounts>;
  participants: string[];
  loading: boolean;
  error: string | null;
  castVote: (shareToken: string, placeId: string, type: 'up' | 'down') => Promise<void>;
  fetchVotes: (shareToken: string) => Promise<void>;
}

export const useVoteStore = create<VoteState>((set, get) => ({
  currentShareToken: null,
  myVotes: {},
  counts: {},
  participants: [],
  loading: false,
  error: null,
  fetchVotes: async (shareToken) => {
    set((state) => state.currentShareToken === shareToken
      ? { loading: true, error: null }
      : { currentShareToken: shareToken, myVotes: {}, counts: {}, participants: [], loading: true, error: null });
    const { data, error } = await supabase.rpc('get_shared_votes', {
      p_share_token: shareToken,
    });

    if (!error && data) {
      const counts: Record<string, VoteCounts> = {};
      const myVotes: Record<string, 'up' | 'down' | null> = {};
      const rows = data as { place_id: string; up: number; down: number; my_vote: 'up' | 'down' | null }[];
      rows.forEach((row) => {
        counts[row.place_id] = { up: row.up, down: row.down };
        if (row.my_vote) myVotes[row.place_id] = row.my_vote;
      });

      set({ counts, myVotes, participants: [], loading: false, error: null });
    } else {
      set({ loading: false, error: error?.message ?? 'Không thể tải dữ liệu bình chọn.' });
    }
  },

  castVote: async (shareToken, placeId, type) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Bạn cần đăng nhập để bình chọn.');
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

    const { error } = await supabase.rpc('vote_shared_itinerary', {
      p_share_token: shareToken,
      p_place_id: placeId,
      p_vote: type,
    });

    if (error) {
      set({
        myVotes: { ...get().myVotes, [placeId]: prevVote ?? null },
        counts: { ...get().counts, [placeId]: prevCounts },
      });
      throw error;
    }
  },
}));
