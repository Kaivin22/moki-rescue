import { supabase } from '@/src/services/supabase';

export const MAX_PLACE_IMAGES = 10;
export const MAX_PLACE_IMAGE_BYTES = 8 * 1024 * 1024;

export interface UploadedPlaceImage { url: string; path: string }

export function detectPlaceImageType(bytes: ArrayBuffer): { contentType: string; extension: string } | null {
  const data = new Uint8Array(bytes);
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { contentType: 'image/jpeg', extension: 'jpg' };
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) return { contentType: 'image/png', extension: 'png' };
  if (data.length >= 12 && String.fromCharCode(...data.slice(0, 4)) === 'RIFF' && String.fromCharCode(...data.slice(8, 12)) === 'WEBP') return { contentType: 'image/webp', extension: 'webp' };
  return null;
}

export async function uploadPlaceImage(uri: string, userId: string): Promise<UploadedPlaceImage> {
  const response = await fetch(uri);
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_PLACE_IMAGE_BYTES) throw new Error('Mỗi ảnh phải nhỏ hơn 8 MB.');
  const detected = detectPlaceImageType(bytes);
  if (!detected) throw new Error('Tệp đã chọn không phải ảnh JPEG, PNG hoặc WebP hợp lệ.');
  const { contentType, extension } = detected;
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('place-images').upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return { path, url: supabase.storage.from('place-images').getPublicUrl(path).data.publicUrl };
}

export function storagePathFromPublicUrl(url: string): string | null {
  const marker = '/storage/v1/object/public/place-images/';
  const index = url.indexOf(marker);
  return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null;
}

export async function removePlaceImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from('place-images').remove(paths);
  if (error) throw error;
}
