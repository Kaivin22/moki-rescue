import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';

export interface ProfileStats {
  itineraryCount: number;
  savedPlaceCount: number;
}
export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [itineraries, savedPlaces] = await Promise.all([
    supabase
      .from('itineraries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('saved_places')
      .select('place_id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (itineraries.error) throw itineraries.error;
  if (savedPlaces.error) throw savedPlaces.error;

  return {
    itineraryCount: itineraries.count ?? 0,
    savedPlaceCount: savedPlaces.count ?? 0,
  };
}

export function useProfileStats(userId?: string | null) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: () => getProfileStats(userId!),
    enabled: Boolean(userId),
  });
}
