import {
  optimizeItinerary,
  optimizeRoute,
  OptimizerInput,
  orderDay,
  scheduleDay,
  toMinutes,
  toTimeStr,
} from '../src/features/itinerary/services/routeOptimizer';
import { Place } from '../src/types/place';

describe('RouteOptimizer', () => {
  const mockPlaces: Place[] = [
    { id: '1', name: 'Place 1', lat: 16.05, lng: 108.20, opening_time: '07:00', closing_time: '22:00', avg_duration_min: 60 } as unknown as Place,
    { id: '2', name: 'Place 2', lat: 16.06, lng: 108.21, opening_time: '08:00', closing_time: '17:00', avg_duration_min: 90 } as unknown as Place,
    { id: '3', name: 'Place 3', lat: 16.04, lng: 108.19, opening_time: '07:00', closing_time: '18:00', avg_duration_min: 120 } as unknown as Place,
    { id: '4', name: 'Place 4', lat: 16.07, lng: 108.22, opening_time: '09:00', closing_time: '21:00', avg_duration_min: 45 } as unknown as Place,
    { id: '5', name: 'Place 5', lat: 16.03, lng: 108.18, opening_time: '00:00', closing_time: '23:59', avg_duration_min: 30 } as unknown as Place,
  ];

  it('should cluster 5 places into 1 day correctly', () => {
    const input: OptimizerInput = {
      places: mockPlaces,
      numDays: 1,
      transport: 'motorbike',
      startTime: '08:00',
      endTime: '20:00',
    };
    
    const result = optimizeRoute(input);
    expect(result.days.length).toBe(1);
    // Should have places scheduled
    expect(result.days[0].places.length).toBeGreaterThan(0);
  });

  it('should handle single place single day without crashing', () => {
    const input: OptimizerInput = {
      places: [mockPlaces[0]],
      numDays: 1,
      transport: 'car',
      startTime: '09:00',
      endTime: '17:00',
    };
    
    const result = optimizeRoute(input);
    expect(result.days.length).toBe(1);
    expect(result.days[0].places[0].place.id).toBe('1');
  });

  it('should respect closing time', () => {
    // Place 2 closes at 17:00. If we start at 16:30 and duration is 90 mins, it should be warned or skipped
    const input: OptimizerInput = {
      places: [mockPlaces[1]],
      numDays: 1,
      transport: 'motorbike',
      startTime: '16:30',
      endTime: '20:00',
    };
    
    const result = optimizeRoute(input);
    // Either placed with a warning, or not placed
    if (result.days[0].places.length > 0) {
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it('never wraps an overflowing schedule into the next morning', () => {
    const longPlaces = Array.from({ length: 8 }, (_, index) => ({
      ...mockPlaces[4],
      id: `long-${index}`,
      name: `Long place ${index}`,
      avg_duration_min: 180,
    }));

    const day = scheduleDay(longPlaces, 'motorbike', '2026-08-12', 0, undefined, '08:00', '21:00');

    expect(day.unscheduledPlaces.length).toBeGreaterThan(0);
    day.places.forEach((slot) => {
      expect(toMinutes(slot.endTime)).toBeLessThanOrEqual(toMinutes('21:00'));
    });
    expect(toTimeStr(25 * 60 + 30)).toBe('23:59');
  });

  it('keeps a real restaurant linked as a place instead of a synthetic meal break', () => {
    const restaurant = {
      ...mockPlaces[4],
      id: 'restaurant-1',
      name: 'Nhà hàng thật',
      category: 'food',
      avg_duration_min: 60,
    } as Place;

    const day = scheduleDay([restaurant], 'motorbike', '2026-08-12', 0, undefined, '12:00', '21:00');
    expect(day.places[0].place.id).toBe('restaurant-1');
    expect(day.places[0].isMeal).toBe(false);
    expect(day.places[0].isMealVenue).toBe(true);
  });

  it('supports evening visits for opening ranges that cross midnight', () => {
    const nightPlace = {
      ...mockPlaces[4],
      id: 'night-1',
      category: 'food',
      opening_time: '20:00',
      closing_time: '02:00',
      avg_duration_min: 45,
    } as Place;
    const day = scheduleDay([nightPlace], 'motorbike', '2026-08-12', 0, undefined, '20:00', '21:00');
    expect(day.unscheduledPlaces).toHaveLength(0);
    expect(day.places[0].endTime).toBe('20:45');
  });

  it('rejects invalid optimizer boundaries before clustering', () => {
    expect(() => optimizeRoute({
      places: [mockPlaces[0]],
      numDays: 0,
      transport: 'motorbike',
      startTime: '08:00',
      endTime: '21:00',
    })).toThrow('Số ngày');
    expect(() => optimizeRoute({
      places: [mockPlaces[0], mockPlaces[0]],
      numDays: 1,
      transport: 'motorbike',
      startTime: '08:00',
      endTime: '21:00',
    })).toThrow('trùng');
  });

  it('uses the road matrix for VIP travel metrics', async () => {
    const originalFetch = global.fetch;
    const originalCarUrl = process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL;
    process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = 'https://routing.test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        durations: [[0, 600, 1200], [600, 0, 300], [1200, 300, 0]],
        distances: [[0, 5000, 10000], [5000, 0, 2000], [10000, 2000, 0]],
      }),
    } as Response);

    try {
      const result = await optimizeItinerary({
        places: mockPlaces.slice(0, 3),
        numDays: 1,
        transport: 'car',
        startTime: '08:00',
        endTime: '20:00',
      });
      expect(result.isSmartOptimized).toBe(true);
      expect(result.totalDistanceKm).toBe(7);
      expect(result.totalTravelTime).toBe(15);
    } finally {
      global.fetch = originalFetch;
      if (originalCarUrl === undefined) delete process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL;
      else process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = originalCarUrl;
    }
  });

  it('preserves a manually chosen order while refreshing road metrics', async () => {
    const originalFetch = global.fetch;
    const originalCarUrl = process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL;
    process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = 'https://routing.test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        durations: [[0, 600, 1200], [600, 0, 300], [1200, 300, 0]],
        distances: [[0, 5000, 10000], [5000, 0, 2000], [10000, 2000, 0]],
      }),
    } as Response);

    try {
      const result = await optimizeItinerary({
        places: mockPlaces.slice(0, 3),
        numDays: 1,
        transport: 'car',
        startTime: '08:00',
        endTime: '20:00',
        lockedDayPlaceIds: [['3', '1', '2']],
        preserveOrder: true,
      });
      expect(result.days[0].places.filter((slot) => !slot.isMeal).map((slot) => slot.place.id)).toEqual(['3', '1', '2']);
      expect(result.routingStatus).toBe('road');
    } finally {
      global.fetch = originalFetch;
      if (originalCarUrl === undefined) delete process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL;
      else process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = originalCarUrl;
    }
  });

  it('rejects duplicate or incomplete locked day allocations', async () => {
    await expect(optimizeItinerary({
      places: mockPlaces.slice(0, 3),
      numDays: 1,
      transport: 'walk',
      startTime: '08:00',
      endTime: '20:00',
      lockedDayPlaceIds: [['1', '1', '2']],
    })).rejects.toThrow('không đầy đủ');
  });

  it('finds the exact best weighted order for a small day, including a reversed pair', () => {
    const places = mockPlaces.slice(0, 3);
    const wanted = ['2', '1', '3'];
    const cost = (route: Place[]) => route.reduce(
      (total, place, index) => total + (place.id === wanted[index] ? 0 : 10),
      0,
    );

    expect(orderDay(places, cost, () => 1).map((place) => place.id)).toEqual(wanted);
  });
});
