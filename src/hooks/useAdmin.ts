import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export interface AdminStats {
  totalPlaces: number;
  activeUsers: number;
  totalItineraries: number;
  vipUsers: number;
  openTickets: number;
}

export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'stats'],
    enabled,
    queryFn: async (): Promise<AdminStats> => {
      const [places, users, itineraries, vip, tickets] = await Promise.all([
        supabase.from('places').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('itineraries').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('vip_status', 'vip'),
        supabase
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'in_progress']),
      ]);

      return {
        totalPlaces: places.count ?? 0,
        activeUsers: users.count ?? 0,
        totalItineraries: itineraries.count ?? 0,
        vipUsers: vip.count ?? 0,
        openTickets: tickets.count ?? 0,
      };
    },
  });
}

export function usePlaceReviews(placeId?: string) {
  return useQuery({
    queryKey: ['reviews', placeId],
    enabled: !!placeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('place_id', placeId!)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
  });
}
