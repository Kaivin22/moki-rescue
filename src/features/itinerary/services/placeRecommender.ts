import { Place } from '@/src/types/place';
import type { Profile } from '@/src/types/profile';

type RecommendationProfile = Pick<Profile, 'travel_style'> | null | undefined;

export function recommendPlaces(
  places: Place[],
  profile: RecommendationProfile,
  visited: string[] // place IDs đã thăm
): Place[] {
  return places
    .filter(p => p.is_active)
    .filter(p => !visited.includes(p.id))
    .map(p => ({ ...p, score: calculateScore(p, profile) }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

export function calculateScore(place: Place, profile: RecommendationProfile): number {
  const styleMatch = getStyleMatch(place.tags || [], profile?.travel_style || []);
  const ratingScore = (place.rating_avg || 0) / 5;
  const popularityScore = Math.min((place.rating_count || 0) / 100, 1);

  return styleMatch * 50
       + ratingScore * 30
       + popularityScore * 20;
}

function getStyleMatch(placeTags: string[], userStyles: string[]): number {
  if (!userStyles.length) return 0.5;
  const matchCount = placeTags.filter(tag => userStyles.includes(tag)).length;
  return Math.min(matchCount / userStyles.length, 1);
}
