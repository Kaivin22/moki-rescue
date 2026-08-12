import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';
import type { Place } from '@/src/types/place';
import { removePlaceImages, storagePathFromPublicUrl } from './placeImageStorage';

export type AdminPlaceStatusFilter = 'all' | 'active' | 'inactive';
const ADMIN_PLACE_PAGE_SIZE = 40;

export function useAdminAllPlaces(search: string, statusFilter: AdminPlaceStatusFilter) {
  return useInfiniteQuery({
    queryKey: ['admin', 'all-places', search, statusFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase.from('places').select('*').order('created_at', { ascending: false }).range(pageParam, pageParam + ADMIN_PLACE_PAGE_SIZE - 1);
      if (statusFilter === 'active') query = query.eq('is_active', true);
      if (statusFilter === 'inactive') query = query.eq('is_active', false);
      if (search.trim()) query = query.ilike('name', `%${search.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Place[];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === ADMIN_PLACE_PAGE_SIZE ? pages.length * ADMIN_PLACE_PAGE_SIZE : undefined,
    staleTime: 30_000,
  });
}

export function useTogglePlaceActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.rpc('admin_moderate_place', {
        p_place_id: id,
        p_action: isActive ? 'publish' : 'archive',
        p_note: null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'all-places'] }),
  });
}

export function useDeletePlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: place, error: readError } = await supabase
        .from('places').select('image_urls').eq('id', id).single();
      if (readError) throw readError;
      const { error } = await supabase.from('places').delete().eq('id', id);
      if (error) throw error;
      const paths = ((place.image_urls ?? []) as string[])
        .map(storagePathFromPublicUrl)
        .filter((path): path is string => Boolean(path));
      try {
        await removePlaceImages(paths);
      } catch (cleanupError) {
        console.warn('[places] Database row deleted but image cleanup failed:', cleanupError);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'all-places'] }),
  });
}

export function useUpsertPlace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (place: Partial<Place> & { id?: string }) => {
      const normalizedName = place.name?.trim();
      const normalizedAddress = place.address?.trim();
      if (!place.id && normalizedName && normalizedAddress) {
        const { data: duplicates, error: duplicateError } = await supabase
          .from('places').select('id, name, address')
          .ilike('name', normalizedName).ilike('address', normalizedAddress).limit(1);
        if (duplicateError) throw duplicateError;
        if (duplicates?.length) {
          throw new Error(`Địa điểm có vẻ đã tồn tại: ${duplicates[0].name} — ${duplicates[0].address}`);
        }
      }

      if (place.id) {
        const { id, ...updates } = place;
        if (updates.content_status === 'pending_review' && updates.is_active) {
          const { error } = await supabase.rpc('submit_place_revision', {
            p_place_id: id,
            p_snapshot: updates,
          });
          if (error) throw error;
          return;
        }
        const { error } = await supabase.from('places').update(updates).eq('id', id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('places').insert(place);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-places'] });
      queryClient.invalidateQueries({ queryKey: ['places'] });
    },
  });
}
