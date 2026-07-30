import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Place, FilterState } from '../types/place';

export function usePlaces(filters?: FilterState, searchQuery?: string, category?: string | null) {
  return useQuery({
    queryKey: ['places', filters, searchQuery, category],
    queryFn: async () => {
      let query = supabase.from('places').select('*').eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      if (searchQuery) {
        // Full Text Search
        query = query.textSearch('name', searchQuery, { type: 'websearch', config: 'simple' });
      }

      if (filters) {
        if (filters.categories && filters.categories.length > 0) {
          query = query.in('category', filters.categories);
        }
        if (filters.suitableFor && filters.suitableFor.length > 0) {
          query = query.contains('suitable_for', filters.suitableFor);
        }
        if (filters.maxEntryFee !== null) {
          query = query.lte('entry_fee_min', filters.maxEntryFee);
        }
        if (filters.minDuration !== null) {
          query = query.gte('avg_duration_min', filters.minDuration);
        }
        if (filters.minRating !== null) {
          query = query.gte('rating_avg', filters.minRating);
        }
        // TODO: openNow logic requires current time checking, which is complex in SQL without a function
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as Place[];
    },
  });
}

export function usePlaceDetails(id: string) {
  return useQuery({
    queryKey: ['place', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return data as Place;
    },
    enabled: !!id,
  });
}
