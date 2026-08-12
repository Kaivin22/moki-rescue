import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { Place } from '../types/place';
import { Advice, ItineraryDay, addDays, formatDateVi } from '../features/itinerary/services/routeOptimizer';
import { itineraryError } from '../features/itinerary/services/itineraryErrors';
import type { Itinerary, ItineraryDetail } from '../types/itinerary';

export type ItineraryRow = Itinerary;

const ITINERARY_PAGE_SIZE = 20;
export type ItineraryHistoryFilter = 'all' | 'upcoming' | 'past';

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

export function useItineraryDetails(idOrShareToken?: string) {
  return useQuery({
    queryKey: ['itinerary', idOrShareToken],
    enabled: !!idOrShareToken,
    queryFn: async () => {
      const selection = `
          *,
          itinerary_days (
            id, itinerary_id, day_number, date, title, note,
            weather_score, weather_summary, advice,
            itinerary_slots (
              id, day_id, place_id, place_name, place_image_url, place_category,
              order_index, start_time, duration_min, note, transport_mode, travel_time_min,
              weather_score, weather_note, rain_at_hour, is_meal, is_indoor,
              places:place_id (*)
            )
          )
        `;
      const byId = await supabase
        .from('itineraries')
        .select(selection)
        .eq('id', idOrShareToken!)
        .maybeSingle();
      if (byId.error) throw byId.error;

      let data = byId.data;
      let loadedFromShare = false;
      if (!data) {
        const byToken = await supabase.rpc('get_shared_itinerary', {
          p_share_token: idOrShareToken!,
        });
        if (byToken.error) throw byToken.error;
        data = byToken.data;
        loadedFromShare = true;
      }
      if (!data) throw new Error('Không tìm thấy lịch trình hoặc liên kết đã hết hiệu lực.');

      const detail = data as ItineraryDetail;
      detail.itinerary_days = (detail.itinerary_days ?? []).sort(
        (a, b) => a.day_number - b.day_number
      );
      detail.itinerary_days.forEach((day) => {
        day.itinerary_slots = (day.itinerary_slots ?? []).sort(
          (a, b) => a.order_index - b.order_index
        );
      });

      if (loadedFromShare) {
        const placeIds = [...new Set(detail.itinerary_days
          .flatMap((day) => day.itinerary_slots ?? [])
          .map((slot) => slot.place_id)
          .filter((placeId): placeId is string => Boolean(placeId)))];
        if (placeIds.length > 0) {
          const { data: places, error: placesError } = await supabase
            .from('places')
            .select('*')
            .in('id', placeIds)
            .eq('is_active', true)
            .eq('content_status', 'published');
          if (placesError) throw placesError;
          const placesById = new Map((places ?? []).map((place) => [place.id, place as Place]));
          detail.itinerary_days.forEach((day) => day.itinerary_slots?.forEach((slot) => {
            slot.places = slot.place_id ? placesById.get(slot.place_id) ?? null : null;
          }));
        }
      }
      return detail;
    },
  });
}

export function useInfiniteMyItineraries(
  userId?: string | null,
  filter: ItineraryHistoryFilter = 'all',
  today?: string,
) {
  return useInfiniteQuery({
    queryKey: ['itineraries', 'mine', 'infinite', userId, filter, today],
    enabled: Boolean(userId && (filter === 'all' || today)),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', userId!)
        .order(filter === 'all' ? 'updated_at' : 'start_date', { ascending: filter === 'upcoming' })
        .range(pageParam, pageParam + ITINERARY_PAGE_SIZE - 1);

      if (filter === 'upcoming') query = query.gte('end_date', today!);
      if (filter === 'past') query = query.lt('end_date', today!);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ItineraryRow[];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === ITINERARY_PAGE_SIZE
      ? pages.length * ITINERARY_PAGE_SIZE
      : undefined,
  });
}

export function useEnableItinerarySharing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itineraryId }: { itineraryId: string; userId?: string }) => {
      const { data, error } = await supabase.rpc('enable_itinerary_share', {
        p_itinerary_id: itineraryId,
      });
      if (error) throw error;
      const result = data as { share_token: string; share_expires_at: string };
      return { id: itineraryId, ...result };
    },
    onSuccess: ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', id] });
      queryClient.invalidateQueries({ queryKey: ['itineraries', 'mine'] });
    },
  });
}

export function useUpdateItineraryVoting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itineraryId,
      votingStatus,
    }: {
      itineraryId: string;
      userId?: string;
      votingStatus: 'open' | 'locked';
    }) => {
      const { error } = await supabase.rpc('set_itinerary_voting', {
        p_itinerary_id: itineraryId,
        p_voting_status: votingStatus,
      });
      if (error) throw error;
      return { id: itineraryId, voting_status: votingStatus };
    },
    onSuccess: ({ id }) => queryClient.invalidateQueries({ queryKey: ['itinerary', id] }),
  });
}

export function useRevokeItinerarySharing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itineraryId: string) => {
      const { error } = await supabase.rpc('revoke_itinerary_share', { p_itinerary_id: itineraryId });
      if (error) throw error;
      return itineraryId;
    },
    onSuccess: (itineraryId) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary', itineraryId] });
      queryClient.invalidateQueries({ queryKey: ['itineraries', 'mine'] });
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

export interface SlotOverride {
  startTime: string;
  durationMin: number;
}

interface SaveItineraryInput {
  userId: string;
  itineraryId?: string | null;
  expectedUpdatedAt?: string | null;
  title: string;
  numDays: number;
  startDate: string;
  numPeople: number;
  transport: string;
  travelStyles: string[];
  selectedPlaces: Place[];
  /** scheduledDays: kết quả lịch tính theo dayPlans của người dùng */
  scheduledDays: ItineraryDay[];
  /** slotOverrides: các chỉnh sửa giờ người dùng đã thực hiện (key = place.id) */
  slotOverrides: Record<string, SlotOverride>;
  /** advice: lời khuyên đã sinh lúc tạo (GĐ 6 — lưu để xem lại) */
  advice?: Advice[];
  coverImageUrl?: string | null;
}

export function useSaveItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveItineraryInput) => {
      if (input.scheduledDays.some((day) => day.unscheduledPlaces.length > 0)) {
        throw new Error('Lịch trình còn địa điểm chưa xếp được nên chưa thể lưu.');
      }
      const scheduledPlaceIds = input.scheduledDays.flatMap((day) => day.places)
        .filter((slot) => !slot.isMeal)
        .map((slot) => slot.place.id);
      const selectedPlaceIds = input.selectedPlaces.map((place) => place.id);
      if (scheduledPlaceIds.length !== selectedPlaceIds.length
        || new Set(scheduledPlaceIds).size !== scheduledPlaceIds.length
        || selectedPlaceIds.some((id) => !scheduledPlaceIds.includes(id))) {
        throw new Error('Danh sách địa điểm và lịch đã xếp không khớp nhau. Vui lòng tính lại lịch trình.');
      }
      const cover =
        input.coverImageUrl ||
        input.selectedPlaces.find((p) => p.image_urls?.[0])?.image_urls?.[0] ||
        null;

      // Xây dựng payload days cho RPC
      const daysPayload = input.scheduledDays.map((day, dayIdx) => {
        const dayDate = input.startDate ? addDays(input.startDate, dayIdx) : null;
        const dayTitle = dayDate
          ? `Ngày ${day.dayNumber} — ${formatDateVi(dayDate)}`
          : `Ngày ${day.dayNumber}`;

        const slots = day.places.map((slot, slotIdx) => {
          const override = input.slotOverrides[slot.place.id];
          const startTime = override?.startTime ?? slot.startTime;
          const durationMin = override?.durationMin ?? Math.max(
            30,
            Math.round(
              (new Date(`1970-01-01T${slot.endTime}:00`).getTime() -
                new Date(`1970-01-01T${slot.startTime}:00`).getTime()) / 60000
            ) || slot.place.avg_duration_min
          );
          return {
            place_id: slot.isMeal ? '' : slot.place.id,
            place_name: slot.place.name,
            place_image_url: slot.place.image_urls?.[0] ?? null,
            place_category: slot.place.category,
            order_index: slotIdx,
            start_time: startTime,
            duration_min: durationMin,
            travel_time_min: slot.travelTimeToNextMin,
            transport_mode: input.transport,
            weather_score: slot.weatherScore ?? null,
            weather_note: slot.weatherNote ?? null,
            rain_at_hour: slot.rainAtHour ?? null,
            is_meal: slot.isMeal ?? false,
            is_indoor: slot.isIndoor ?? false,
          };
        });

        return {
          day_number: day.dayNumber,
          title: dayTitle,
          weather_score: day.weatherScore ?? null,
          weather_summary: day.weatherSummary ?? null,
          advice: day.advice ?? input.advice?.filter((a) => a.dayNumber === day.dayNumber || a.dayNumber === undefined) ?? [],
          slots,
        };
      });

      const { data: rpcResult, error: rpcError } = await supabase.rpc('upsert_itinerary', {
        p_itinerary_id: input.itineraryId ?? null,
        p_payload: {
          title: input.title.trim(),
          num_days: input.numDays,
          start_date: input.startDate || null,
          num_people: input.numPeople,
          transport: input.transport,
          travel_style: input.travelStyles,
          cover_image_url: cover,
          expected_updated_at: input.expectedUpdatedAt ?? null,
          days: daysPayload,
        },
      });
      if (rpcError) throw itineraryError(rpcError);
      if (!rpcResult || typeof rpcResult !== 'object' || !('id' in rpcResult)) {
        throw new Error('Máy chủ trả về kết quả lưu lịch trình không hợp lệ.');
      }
      return rpcResult as { id: string; updated_at: string };
    },
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats', input.userId] });
    },
  });
}

export function useDeleteItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('itineraries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] });
    },
  });
}
