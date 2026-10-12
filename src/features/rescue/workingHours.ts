import type { WorkingDay } from '@/src/types/rescue';

export function minuteLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function parseWorkingTime(value: string, end = false): number | null {
  const trimmed = value.trim();
  if (end && trimmed === '24:00') return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) return null;
  const [hour, minute] = trimmed.split(':').map(Number);
  const result = hour * 60 + minute;
  // Use 24:00 for an end at midnight, avoiding an ambiguous zero-length shift.
  return end && result === 0 ? 1440 : result;
}

export function validWorkingDays(days: WorkingDay[]): boolean {
  if (days.length > 7) return false;
  const weekdays = new Set<number>();
  const occupied = new Set<number>();
  for (const day of days) {
    if (
      !Number.isInteger(day.dayOfWeek) ||
      day.dayOfWeek < 1 ||
      day.dayOfWeek > 7 ||
      weekdays.has(day.dayOfWeek) ||
      !Number.isInteger(day.opensMinute) ||
      !Number.isInteger(day.closesMinute) ||
      day.opensMinute < 0 ||
      day.opensMinute >= 1440 ||
      day.closesMinute < 1 ||
      day.closesMinute > 1440 ||
      day.opensMinute === day.closesMinute
    )
      return false;
    weekdays.add(day.dayOfWeek);
    const duration = (day.closesMinute - day.opensMinute + 1440) % 1440 || 1440;
    const start = (day.dayOfWeek - 1) * 1440 + day.opensMinute;
    for (let minute = start; minute < start + duration; minute++) {
      const index = minute % (7 * 1440);
      if (occupied.has(index)) return false;
      occupied.add(index);
    }
  }
  return true;
}

export const WEEKDAYS = {
  vi: ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};
