import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/src/services/supabase';

export interface PendingPlace {
  id: string;
  revisionId?: string;
  name: string;
  category: string;
  address: string;
  created_at: string;
  revisionImages?: string[];
  currentImages?: string[];
}

export interface AdminReview {
  id: string;
  comment: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  profiles?: { display_name?: string | null } | null;
  places?: { name?: string | null } | null;
}

interface PendingRevisionRow {
  id: string;
  place_id: string;
  snapshot: Partial<PendingPlace> & { image_urls?: string[] };
  created_at: string;
  place?: { image_urls?: string[] } | null;
}

export function useAdminReviews() {
  return useQuery({
    queryKey: ['admin', 'reviews-moderation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, comment, is_flagged, flag_reason, created_at, profiles:user_id(display_name), places:place_id(name)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AdminReview[];
    },
  });
}

export function useAdminPendingPlaces() {
  return useQuery({
    queryKey: ['admin', 'pending-places'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('places')
        .select('id, name, category, address, created_at, content_status, image_urls')
        .eq('content_status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      const { data: revisions, error: revisionError } = await supabase
        .from('place_revisions')
        .select('id, place_id, snapshot, created_at, place:places(image_urls)')
        .eq('content_status', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(20);
      if (revisionError) throw revisionError;

      const pendingPlaces = (data ?? []) as PendingPlace[];
      const revisionRows = (revisions ?? []) as unknown as PendingRevisionRow[];
      return [
        ...pendingPlaces,
        ...revisionRows
          .filter(revision => !pendingPlaces.some(place => place.id === revision.place_id))
          .map(revision => ({
            id: revision.place_id,
            revisionId: revision.id,
            name: revision.snapshot?.name ?? 'Bản chỉnh sửa địa điểm',
            category: revision.snapshot?.category ?? '—',
            address: revision.snapshot?.address ?? '—',
            created_at: revision.created_at,
            revisionImages: revision.snapshot?.image_urls ?? [],
            currentImages: revision.place?.image_urls ?? [],
          })),
      ] satisfies PendingPlace[];
    },
  });
}
