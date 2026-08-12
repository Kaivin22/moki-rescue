import { supabase } from '@/src/services/supabase';

export type PlaceReportReason = 'wrong_hours' | 'place_closed' | 'wrong_image' | 'wrong_address' | 'other';

export async function submitPlaceReport(input: {
  placeId: string;
  reporterId: string;
  reason: PlaceReportReason;
  note: string;
}): Promise<void> {
  const note = input.note.trim();
  if (note.length > 2000) throw new Error('Ghi chú không được vượt quá 2.000 ký tự.');

  const { error } = await supabase.from('place_reports').insert({
    place_id: input.placeId,
    reporter_id: input.reporterId,
    reason: input.reason,
    note: note || null,
    status: 'pending',
  });
  if (error?.code === '23505') throw new Error('Bạn đã có một báo cáo đang chờ xử lý cho địa điểm này.');
  if (error) throw error;
}
