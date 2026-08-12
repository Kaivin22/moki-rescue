import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { Place, FilterState } from '../../../types';

const PLACE_PAGE_SIZE = 40;

async function searchPlacesPage(filters?: FilterState, searchQuery?: string, category?: string | null, offset = 0, limit = PLACE_PAGE_SIZE) {
  const cleanQ = searchQuery?.replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim() || null;
  const categories = [...new Set([...(filters?.categories ?? []), ...(category ? [category] : [])])];
  const { data, error } = await supabase.rpc('search_places', {
    p_query: cleanQ,
    p_categories: categories.length ? categories : null,
    p_suitable_for: filters?.suitableFor?.length ? filters.suitableFor : null,
    p_min_duration: filters?.minDuration ?? null,
    p_min_rating: filters?.minRating ?? null,
    p_open_now: filters?.openNow ?? false,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as Place[];
}

export function usePlaces(filters?: FilterState, searchQuery?: string, category?: string | null) {
  return useQuery({
    queryKey: ['places', filters, searchQuery, category],
    queryFn: async () => {
      return searchPlacesPage(filters, searchQuery, category, 0, 100);
    },
    staleTime: 60_000,
  });
}

export function useInfinitePlaces(filters?: FilterState, searchQuery?: string, category?: string | null) {
  return useInfiniteQuery({
    queryKey: ['places', 'infinite', filters, searchQuery, category],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchPlacesPage(filters, searchQuery, category, pageParam),
    getNextPageParam: (lastPage, pages) => lastPage.length === PLACE_PAGE_SIZE ? pages.length * PLACE_PAGE_SIZE : undefined,
    staleTime: 60_000,
  });
}

export function usePlaceDetails(id: string) {
  return useQuery({
    queryKey: ['place', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('places').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Place;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useSavedPlaces(userId?: string | null) {
  return useQuery({
    queryKey: ['saved-places', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_places')
        .select('place_id, places(*)')
        .eq('user_id', userId!)
        .order('saved_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as { places: Place | null }[])
        .map(row => row.places)
        .filter((place): place is Place => Boolean(place));
    },
    staleTime: 30_000,
  });
}

export function useInfiniteSavedPlaces(userId?: string | null, searchQuery?: string) {
  const cleanQuery = searchQuery?.replace(/[%_]/g, '').trim() ?? '';
  return useInfiniteQuery({
    queryKey: ['saved-places', 'infinite', userId, cleanQuery],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('saved_places')
        .select('place_id, saved_at, places!inner(*)')
        .eq('user_id', userId!)
        .order('saved_at', { ascending: false })
        .range(pageParam, pageParam + PLACE_PAGE_SIZE - 1);
      if (cleanQuery) query = query.ilike('places.name', `%${cleanQuery}%`);
      const { data, error } = await query;
      if (error) throw error;
      return ((data ?? []) as unknown as { places: Place | null }[])
        .map((row) => row.places)
        .filter((place): place is Place => Boolean(place));
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === PLACE_PAGE_SIZE
      ? pages.length * PLACE_PAGE_SIZE
      : undefined,
    staleTime: 30_000,
  });
}

export function useIsPlaceSaved(userId?: string | null, placeId?: string) {
  return useQuery({
    queryKey: ['is-saved', userId, placeId],
    enabled: !!userId && !!placeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_places')
        .select('place_id')
        .eq('user_id', userId!)
        .eq('place_id', placeId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useToggleSavePlace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, placeId, isCurrentlySaved }: { userId: string; placeId: string; isCurrentlySaved: boolean }) => {
      if (isCurrentlySaved) {
        // Remove from saved
        const { error } = await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', userId)
          .eq('place_id', placeId);
        if (error) throw error;
      } else {
        // Add to saved
        const { error } = await supabase
          .from('saved_places')
          .insert({ user_id: userId, place_id: placeId });
        if (error) throw error;
      }
    },
    onMutate: async ({ userId, placeId, isCurrentlySaved }) => {
      await queryClient.cancelQueries({ queryKey: ['is-saved', userId, placeId] });
      const previousState = queryClient.getQueryData(['is-saved', userId, placeId]);
      queryClient.setQueryData(['is-saved', userId, placeId], !isCurrentlySaved);
      return { previousState };
    },
    onError: (err, { userId, placeId }, context) => {
      if (context?.previousState !== undefined) {
        queryClient.setQueryData(['is-saved', userId, placeId], context.previousState);
      }
    },
    onSettled: (data, error, { userId, placeId }) => {
      queryClient.invalidateQueries({ queryKey: ['is-saved', userId, placeId] });
      queryClient.invalidateQueries({ queryKey: ['saved-places', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats', userId] });
    },
  });
}
