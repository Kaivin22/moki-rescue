import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Place } from '../types/place';
import { OptimizerResult } from '../features/itinerary/services/routeOptimizer';

export interface ItineraryRow {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  num_days: number;
  start_date: string | null;
  end_date: string | null;
  budget_tier: string | null;
  transport: string | null;
  budget_total: number | null;
  travel_style: string[] | null;
  num_people: number | null;
  status: string;
  is_public: boolean;
  view_count: number;
  like_count: number;
  share_token: string;
  created_at: string;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export interface ItineraryDayRow {
  id: string;
  itinerary_id: string;
  day_number: number;
  title: string | null;
  note: string | null;
  estimated_cost: number | null;
  itinerary_slots?: ItinerarySlotRow[];
}

export interface ItinerarySlotRow {
  id: string;
  day_id: string;
  place_id: string | null;
  place_name: string;
  place_image_url: string | null;
  place_category: string | null;
  order_index: number;
  start_time: string | null;
  duration_min: number | null;
  note: string | null;
}

export interface ItineraryDetail extends ItineraryRow {
  itinerary_days: ItineraryDayRow[];
}

export function usePublicItineraries(limit = 10) {
  return useQuery({
    queryKey: ['itineraries', 'public', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .or('is_public.eq.true,visibility.eq.public,status.eq.published')
        .order('like_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as ItineraryRow[];
    },
  });
}

export function useMyItineraries(userId?: string | null) {
  return useQuery({
    queryKey: ['itineraries', 'mine', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', userId!)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as ItineraryRow[];
    },
  });
}

export function useItineraryDetails(id?: string) {
  return useQuery({
    queryKey: ['itinerary', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('itineraries')
        .select(`
          *,
          profiles:user_id(display_name, avatar_url),
          itinerary_days (
            id, itinerary_id, day_number, title, note, estimated_cost,
            itinerary_slots (
              id, day_id, place_id, place_name, place_image_url, place_category,
              order_index, start_time, duration_min, note
            )
          )
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;

      const detail = data as ItineraryDetail;
      detail.itinerary_days = (detail.itinerary_days ?? []).sort(
        (a, b) => a.day_number - b.day_number
      );
      detail.itinerary_days.forEach((day) => {
        day.itinerary_slots = (day.itinerary_slots ?? []).sort(
          (a, b) => a.order_index - b.order_index
        );
      });
      return detail;
    },
  });
}

export function useItineraryPlaces(itineraryId?: string) {
  return useQuery({
    queryKey: ['itinerary-places', itineraryId],
    enabled: !!itineraryId,
    queryFn: async () => {
      const { data: days, error: daysError } = await supabase
        .from('itinerary_days')
        .select('id')
        .eq('itinerary_id', itineraryId!);

      if (daysError) throw daysError;
      const dayIds = (days ?? []).map((d) => d.id);
      if (dayIds.length === 0) return [] as Place[];

      const { data: slots, error: slotsError } = await supabase
        .from('itinerary_slots')
        .select('place_id')
        .in('day_id', dayIds)
        .not('place_id', 'is', null);

      if (slotsError) throw slotsError;
      const placeIds = [...new Set((slots ?? []).map((s) => s.place_id).filter(Boolean))] as string[];
      if (placeIds.length === 0) return [] as Place[];

      const { data: places, error: placesError } = await supabase
        .from('places')
        .select('*')
        .in('id', placeIds)
        .eq('is_active', true);

      if (placesError) throw placesError;
      return (places ?? []) as Place[];
    },
  });
}

interface SaveItineraryInput {
  userId: string;
  title: string;
  numDays: number;
  startDate: string;
  numPeople: number;
  budgetTier: string;
  transport: string;
  travelStyles: string[];
  selectedPlaces: Place[];
  result: OptimizerResult;
  coverImageUrl?: string | null;
}

export function useSaveItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveItineraryInput) => {
      const cover =
        input.coverImageUrl ||
        input.selectedPlaces.find((p) => p.image_urls?.[0])?.image_urls?.[0] ||
        null;

      const { data: itinerary, error } = await supabase
        .from('itineraries')
        .insert({
          user_id: input.userId,
          title: input.title || 'Lịch trình Đà Nẵng',
          num_days: input.numDays,
          start_date: input.startDate,
          num_people: input.numPeople,
          budget_tier: input.budgetTier,
          transport: input.transport,
          travel_style: input.travelStyles,
          cover_image_url: cover,
          status: 'published',
          is_public: true,
          visibility: 'public',
          budget_total: input.result.totalCost,
        })
        .select()
        .single();

      if (error) throw error;

      for (const day of input.result.days) {
        const { data: dayRow, error: dayError } = await supabase
          .from('itinerary_days')
          .insert({
            itinerary_id: itinerary.id,
            day_number: day.dayNumber,
            title: `Ngày ${day.dayNumber}`,
            estimated_cost: day.cost,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        if (day.places.length > 0) {
          const slots = day.places.map((slot, index) => {
            const durationMin = Math.max(
              30,
              Math.round(
                (new Date(`1970-01-01T${slot.endTime}:00`).getTime() -
                  new Date(`1970-01-01T${slot.startTime}:00`).getTime()) /
                  60000
              ) || slot.place.avg_duration_min || 60
            );
            return {
              day_id: dayRow.id,
              place_id: slot.place.id,
              place_name: slot.place.name,
              place_image_url: slot.place.image_urls?.[0] ?? null,
              place_category: slot.place.category,
              order_index: index,
              start_time: slot.startTime,
              duration_min: durationMin,
              travel_time_min: slot.travelTimeToNextMin,
              transport_mode: input.transport,
            };
          });

          const { error: slotsError } = await supabase.from('itinerary_slots').insert(slots);
          if (slotsError) throw slotsError;
        }
      }

      return itinerary as ItineraryRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
    },
  });
}

export function useToggleItineraryLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itineraryId,
      userId,
      liked,
    }: {
      itineraryId: string;
      userId: string;
      liked: boolean;
    }) => {
      if (liked) {
        const { error } = await supabase
          .from('itinerary_likes')
          .delete()
          .eq('itinerary_id', itineraryId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('itinerary_likes').insert({
          itinerary_id: itineraryId,
          user_id: userId,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', vars.itineraryId] });
    },
  });
}
