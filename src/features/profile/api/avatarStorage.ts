import { supabase } from '@/src/services/supabase';
import { detectPlaceImageType } from '@/src/features/places/api/placeImageStorage';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function uploadAvatar(uri: string, userId: string): Promise<string> {
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_AVATAR_BYTES) throw new Error('Ảnh đại diện phải nhỏ hơn 2 MB.');
  const detected = detectPlaceImageType(bytes);
  if (!detected) throw new Error('Ảnh đại diện phải là JPEG, PNG hoặc WebP hợp lệ.');
  const path = `${userId}/${crypto.randomUUID()}.${detected.extension}`;
  const { error } = await supabase.storage.from('avatars').upload(path, bytes, { contentType: detected.contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function removePreviousAvatar(publicUrl?: string | null): Promise<void> {
  if (!publicUrl) return;
  const marker = '/storage/v1/object/public/avatars/';
  const index = publicUrl.indexOf(marker);
  if (index < 0) return;
  const path = decodeURIComponent(publicUrl.slice(index + marker.length));
  const { error } = await supabase.storage.from('avatars').remove([path]);
  if (error) throw error;
}
