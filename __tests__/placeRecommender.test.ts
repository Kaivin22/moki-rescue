import { recommendPlaces, calculateScore } from '../src/features/itinerary/services/placeRecommender';
import { Place } from '../src/types/place';
import type { Profile } from '../src/types/profile';

describe('placeRecommender', () => {
  const mockProfile: Pick<Profile, 'travel_style'> = {
    travel_style: ['beach', 'nature'],
  };

  const mockPlaces: Place[] = [
    {
      id: '1',
      name: 'Biển Mỹ Khê',
      category: 'beach',
      tags: ['beach', 'relax'],
      rating_avg: 4.8,
      rating_count: 1000,
      is_active: true,
    } as unknown as Place,
    {
      id: '2',
      name: 'Bà Nà Hills',
      category: 'mountain',
      tags: ['mountain', 'entertainment'],
      rating_avg: 4.5,
      rating_count: 500,
      is_active: true,
    } as unknown as Place,
    {
      id: '3',
      name: 'Quán Ăn Nhỏ',
      category: 'food',
      tags: ['food'],
      rating_avg: 3.5,
      rating_count: 50,
      is_active: false,
    } as unknown as Place,
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
