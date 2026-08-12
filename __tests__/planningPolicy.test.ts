import {
  normalizeItineraryDraft,
  PLANNING_LIMITS,
  estimateRequiredDays,
  validateItineraryDraft,
} from '../src/features/itinerary/config/planningPolicy';
import type { ItineraryDraft } from '../src/types/itinerary';
import type { Place } from '../src/types/place';
import { todayInTimeZone } from '../src/utils/localDate';

const place = {
  id: 'place-1',
  name: 'Địa điểm hợp lệ',
  lat: 16.05,
  lng: 108.2,
  avg_duration_min: 60,
} as Place;

function validDraft(overrides: Partial<ItineraryDraft> = {}): ItineraryDraft {
  return {
    title: 'Đà Nẵng cuối tuần',
    numDays: 2,
    startDate: todayInTimeZone(),
    numPeople: 2,
    transport: 'motorbike',
    travelStyles: [],
    selectedPlaces: [place],
    ...overrides,
  };
}

describe('planning policy', () => {
  it('accepts a complete draft at the production boundary', () => {
    expect(validateItineraryDraft(validDraft(), {
      requireTitle: true,
      requireStartDate: true,
      requirePlaces: true,
    })).toEqual([]);
  });

  it('rejects zero days, an empty place selection and an invalid date', () => {
    const codes = validateItineraryDraft(validDraft({
      numDays: 0,
      startDate: '2026-02-30',
      selectedPlaces: [],
    }), {
      requireTitle: true,
      requireStartDate: true,
      requirePlaces: true,
    }).map((issue) => issue.code);

    expect(codes).toEqual(expect.arrayContaining([
      'DAYS_OUT_OF_RANGE',
      'START_DATE_INVALID',
      'PLACES_REQUIRED',
    ]));
  });

  it('enforces the same selected-place limit used by the optimizer', () => {
    const selectedPlaces = Array.from(
      { length: PLANNING_LIMITS.maxSelectedPlaces + 1 },
      (_, index) => ({ ...place, id: `place-${index}` }),
    );
    const codes = validateItineraryDraft(validDraft({ selectedPlaces }), { requirePlaces: true })
      .map((issue) => issue.code);
    expect(codes).toContain('TOO_MANY_PLACES');
  });

  it('normalizes persisted numeric values and removes duplicate selections', () => {
    const normalized = normalizeItineraryDraft(validDraft({
      numDays: 0,
      numPeople: 999,
      travelStyles: ['beach', 'beach', 'unknown'],
      selectedPlaces: [place, place],
    }));

    expect(normalized.numDays).toBe(PLANNING_LIMITS.minDays);
    expect(normalized.numPeople).toBe(PLANNING_LIMITS.maxPeople);
    expect(normalized.travelStyles).toEqual(['beach']);
    expect(normalized.selectedPlaces).toHaveLength(1);
  });

  it('estimates extra days when visit duration cannot fit the chosen day count', () => {
    const selectedPlaces = Array.from({ length: 6 }, (_, index) => ({
      ...place,
      id: `long-${index}`,
      avg_duration_min: 240,
    }));
    expect(estimateRequiredDays(validDraft({ selectedPlaces }))).toBeGreaterThan(2);
  });
});
