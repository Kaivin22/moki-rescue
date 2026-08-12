import type { ScheduledPlace } from './routeOptimizer';
import { toMinutes } from './routeOptimizer';

export interface SlotOverride {
  startTime: string;
  durationMin: number;
}

export interface SlotEdit extends SlotOverride {
  dayIndex: number;
  slotIndex: number;
  placeId: string;
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validateSlotEdit(
  days: { places: ScheduledPlace[] }[],
  overrides: Record<string, SlotOverride>,
  edit: SlotEdit,
): string | null {
  const slots = days[edit.dayIndex]?.places ?? [];
  const target = slots[edit.slotIndex];
  if (!edit.placeId || !target || target.place.id !== edit.placeId) {
    return 'Địa điểm đã thay đổi. Hãy đóng hộp thoại và thử lại.';
  }
  if (!TIME_PATTERN.test(edit.startTime) || !Number.isInteger(edit.durationMin) || edit.durationMin < 5) {
    return 'Giờ bắt đầu hoặc thời lượng không hợp lệ.';
  }

  const start = toMinutes(edit.startTime);
  const end = start + edit.durationMin;
  if (end > 24 * 60) return 'Thời gian tham quan không được kéo dài sang ngày hôm sau.';

  const intervalFor = (index: number) => {
    const slot = slots[index];
    const override = overrides[slot.place.id];
    const slotStart = toMinutes(override?.startTime ?? slot.startTime);
    const fallbackDuration = Math.max(5, toMinutes(slot.endTime) - toMinutes(slot.startTime));
    return { start: slotStart, end: slotStart + (override?.durationMin ?? fallbackDuration) };
  };

  if (edit.slotIndex > 0 && start < intervalFor(edit.slotIndex - 1).end) {
    return 'Thời gian mới bị chồng lên hoạt động phía trước.';
  }
  if (edit.slotIndex < slots.length - 1 && end > intervalFor(edit.slotIndex + 1).start) {
    return 'Thời gian mới bị chồng lên hoạt động phía sau.';
  }
  return null;
}
