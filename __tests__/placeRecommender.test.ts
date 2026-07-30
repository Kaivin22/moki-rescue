import { recommendPlaces, calculateScore } from '../src/features/itinerary/services/placeRecommender';
import { Place } from '../src/types/place';

describe('placeRecommender', () => {
  const mockProfile: any = {
    travel_style: ['beach', 'nature'],
    budget_tier: 'mid',
  };

  const mockPlaces: Place[] = [
    {
      id: '1',
      name: 'Biển Mỹ Khê',
      category: 'beach',
      tags: ['beach', 'relax'],
      rating_avg: 4.8,
      rating_count: 1000,
      entry_fee_min: 0,
      entry_fee_max: 0,
      is_active: true,
    } as Place,
    {
      id: '2',
      name: 'Bà Nà Hills',
      category: 'mountain',
      tags: ['mountain', 'entertainment'],
      rating_avg: 4.5,
      rating_count: 500,
      entry_fee_min: 900000,
      entry_fee_max: 900000,
      is_active: true,
    } as Place,
    {
      id: '3',
      name: 'Quán Ăn Nhỏ',
      category: 'food',
      tags: ['food'],
      rating_avg: 3.5,
      rating_count: 50,
      entry_fee_min: 50000,
      entry_fee_max: 100000,
      is_active: false,
    } as Place,
  ];

  it('should filter out inactive places and visited places', () => {
    const recommended = recommendPlaces(mockPlaces, mockProfile, ['2']);
    expect(recommended.length).toBe(1);
    expect(recommended[0].id).toBe('1'); // Only active and not visited
  });

  it('should score places matching travel style higher', () => {
    const recommended = recommendPlaces(mockPlaces, mockProfile, []);
    expect(recommended.length).toBe(2);
    expect(recommended[0].id).toBe('1'); // My Khe should have higher score due to 'beach' style match
  });

  it('calculateScore should correctly compute score components', () => {
    const score = calculateScore(mockPlaces[0], mockProfile);
    expect(score).toBeGreaterThan(0);
  });
});
