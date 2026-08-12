import { validateSlotEdit } from '../src/features/itinerary/services/slotValidation';
import type { ScheduledPlace } from '../src/features/itinerary/services/routeOptimizer';
import type { Place } from '../src/types/place';

function place(id: string): Place {
  return { id, name: id, lat: 16.05, lng: 108.2 } as Place;
}

function slot(id: string, startTime: string, endTime: string): ScheduledPlace {
  return {
    place: place(id), startTime, endTime,
    travelTimeToNextMin: 0, travelDistanceKm: 0,
  };
}

describe('itinerary slot edit validation', () => {
  const days = [{ places: [slot('a', '08:00', '09:00'), slot('b', '10:00', '11:00')] }];

  it('accepts a valid edit between adjacent activities', () => {
    expect(validateSlotEdit(days, {}, {
      dayIndex: 0, slotIndex: 0, placeId: 'a', startTime: '08:30', durationMin: 60,
    })).toBeNull();
  });

  it('rejects stale modal targets and invalid time values', () => {
    expect(validateSlotEdit(days, {}, {
      dayIndex: 0, slotIndex: 0, placeId: 'b', startTime: '08:00', durationMin: 60,
    })).toContain('Địa điểm đã thay đổi');
    expect(validateSlotEdit(days, {}, {
      dayIndex: 0, slotIndex: 0, placeId: 'a', startTime: '25:00', durationMin: 60,
    })).toContain('không hợp lệ');
  });

  it('rejects overlap with the following activity and midnight overflow', () => {
    expect(validateSlotEdit(days, {}, {
      dayIndex: 0, slotIndex: 0, placeId: 'a', startTime: '09:30', durationMin: 60,
    })).toContain('phía sau');
    expect(validateSlotEdit(days, {}, {
      dayIndex: 0, slotIndex: 0, placeId: 'a', startTime: '23:30', durationMin: 60,
    })).toContain('ngày hôm sau');
  });

  it('uses existing overrides when checking the previous interval', () => {
    expect(validateSlotEdit(days, { a: { startTime: '09:15', durationMin: 60 } }, {
      dayIndex: 0, slotIndex: 1, placeId: 'b', startTime: '10:00', durationMin: 60,
    })).toContain('phía trước');
  });
});
