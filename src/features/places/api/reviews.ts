import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';

export interface MyReviewRow {
  id: string;
  place_id: string;
  rating: number;
  comment: string | null;
  helpful_count: number;
  created_at: string;
  place: { id: string; name: string; image_urls: string[] } | null;
}

const MY_REVIEW_PAGE_SIZE = 20;

export async function getMyReviews(userId: string): Promise<MyReviewRow[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, place_id, rating, comment, helpful_count, created_at, place:places(id, name, image_urls)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MyReviewRow[];
}

export function useInfiniteMyReviews(userId?: string | null) {
  return useInfiniteQuery({
    queryKey: ['my-reviews', 'infinite', userId],
    enabled: Boolean(userId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, place_id, rating, comment, helpful_count, created_at, place:places(id, name, image_urls)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + MY_REVIEW_PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as unknown as MyReviewRow[];
    },
    getNextPageParam: (lastPage, pages) => lastPage.length === MY_REVIEW_PAGE_SIZE
      ? pages.length * MY_REVIEW_PAGE_SIZE
      : undefined,
  });
}

export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  visit_type: 'solo' | 'couple' | 'family' | 'group' | null;
  reviewer_name: string;
  reviewer_avatar_url: string | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export function usePlaceReviews(placeId?: string) {
  return useQuery({
    queryKey: ['place-reviews', placeId],
    enabled: !!placeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, place_id, user_id, rating, comment, visit_type, reviewer_name, reviewer_avatar_url, helpful_count, created_at, updated_at')
        .eq('place_id', placeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlaceReview[];
    },
  });
}

export function useHelpfulReviewIds(userId?: string) {
  return useQuery({
    queryKey: ['helpful-reviews', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('review_helpful').select('review_id').eq('user_id', userId!);
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.review_id as string));
    },
  });
}

export function useToggleReviewHelpful() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reviewId: string; userId: string; active: boolean }) => {
      const request = input.active
        ? supabase.from('review_helpful').delete().eq('review_id', input.reviewId).eq('user_id', input.userId)
        : supabase.from('review_helpful').insert({ review_id: input.reviewId, user_id: input.userId });
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['helpful-reviews', input.userId] });
      queryClient.invalidateQueries({ queryKey: ['place-reviews'] });
    },
  });
}

export function useSubmitPlaceReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      placeId: string;
      userId: string;
      rating: number;
      comment: string;
      visitType: PlaceReview['visit_type'];
    }) => {
      const { error } = await supabase.from('reviews').upsert({
        place_id: input.placeId,
        user_id: input.userId,
        rating: input.rating,
        comment: input.comment.trim() || null,
        visit_type: input.visitType,
      }, { onConflict: 'place_id,user_id' });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['place-reviews', input.placeId] });
      queryClient.invalidateQueries({ queryKey: ['place', input.placeId] });
      queryClient.invalidateQueries({ queryKey: ['places'] });
    },
  });
}
