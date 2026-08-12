import { Place } from '@/src/types/place';

export function isPlaceOpenNow(place: Place, now = new Date()): boolean {
  const weekday = now.getDay() === 0 ? 7 : now.getDay();
  if (place.opening_days?.length && !place.opening_days.includes(weekday)) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value?: string | null) => {
    const [hours, minutes] = (value ?? '').slice(0, 5).split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
  };
  const opening = toMinutes(place.opening_time);
  const closing = toMinutes(place.closing_time);
  if (opening === null || closing === null) return false;
  return closing >= opening
    ? current >= opening && current <= closing
    : current >= opening || current <= closing;
}
