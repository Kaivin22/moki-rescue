import { isPlaceOpenNow } from '../src/features/places/utils/placeAvailability';

const place = {
  opening_days: [1, 2, 3, 4, 5],
  opening_time: '08:00',
  closing_time: '18:00',
} as any;

describe('isPlaceOpenNow', () => {
  it('returns true inside opening hours on an opening day', () => {
    expect(isPlaceOpenNow(place, new Date('2026-08-10T10:00:00'))).toBe(true);
  });

  it('returns false outside opening hours', () => {
    expect(isPlaceOpenNow(place, new Date('2026-08-10T20:00:00'))).toBe(false);
  });

  it('supports an overnight opening interval', () => {
    const overnight = { ...place, opening_days: [1], opening_time: '20:00', closing_time: '02:00' };
    expect(isPlaceOpenNow(overnight, new Date('2026-08-10T23:00:00'))).toBe(true);
  });
});
