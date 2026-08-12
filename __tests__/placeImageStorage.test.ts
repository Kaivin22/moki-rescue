jest.mock('../src/services/supabase', () => ({
  supabase: { storage: { from: jest.fn() } },
}));

import {
  detectPlaceImageType,
  MAX_PLACE_IMAGE_BYTES,
  MAX_PLACE_IMAGES,
  storagePathFromPublicUrl,
} from '../src/features/places/api/placeImageStorage';

function bytes(...values: number[]): ArrayBuffer {
  return Uint8Array.from(values).buffer;
}

describe('place image storage contract', () => {
  it('accepts only supported image signatures', () => {
    expect(detectPlaceImageType(bytes(0xff, 0xd8, 0xff))).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
    expect(detectPlaceImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0))).toEqual({ contentType: 'image/png', extension: 'png' });
    expect(detectPlaceImageType(bytes(82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80))).toEqual({ contentType: 'image/webp', extension: 'webp' });
    expect(detectPlaceImageType(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull();
  });

  it('keeps client limits aligned with the storage contract', () => {
    expect(MAX_PLACE_IMAGES).toBe(10);
    expect(MAX_PLACE_IMAGE_BYTES).toBe(8 * 1024 * 1024);
  });

  it('extracts only paths belonging to the place image bucket', () => {
    expect(storagePathFromPublicUrl('https://demo.supabase.co/storage/v1/object/public/place-images/user/a%20b.jpg'))
      .toBe('user/a b.jpg');
    expect(storagePathFromPublicUrl('https://example.com/image.jpg')).toBeNull();
  });
});
