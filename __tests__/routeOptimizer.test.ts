import { optimizeRoute, OptimizerInput } from '../src/features/itinerary/services/routeOptimizer';
import { Place } from '../src/types/place';

describe('RouteOptimizer', () => {
  const mockPlaces: Place[] = [
    { id: '1', name: 'Place 1', lat: 16.05, lng: 108.20, entry_fee_max: 0, opening_time: '07:00', closing_time: '22:00', avg_duration_min: 60 } as Place,
    { id: '2', name: 'Place 2', lat: 16.06, lng: 108.21, entry_fee_max: 50000, opening_time: '08:00', closing_time: '17:00', avg_duration_min: 90 } as Place,
    { id: '3', name: 'Place 3', lat: 16.04, lng: 108.19, entry_fee_max: 100000, opening_time: '07:00', closing_time: '18:00', avg_duration_min: 120 } as Place,
    { id: '4', name: 'Place 4', lat: 16.07, lng: 108.22, entry_fee_max: 20000, opening_time: '09:00', closing_time: '21:00', avg_duration_min: 45 } as Place,
    { id: '5', name: 'Place 5', lat: 16.03, lng: 108.18, entry_fee_max: 0, opening_time: '00:00', closing_time: '23:59', avg_duration_min: 30 } as Place,
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
});
