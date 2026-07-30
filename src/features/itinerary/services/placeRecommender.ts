import { Place } from '@/src/types/place';

export function recommendPlaces(
  places: Place[],
  profile: any,
  visited: string[] // place IDs đã thăm
): Place[] {
  return places
    .filter(p => p.is_active)
    .filter(p => !visited.includes(p.id))
    .map(p => ({ ...p, score: calculateScore(p, profile) }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

export function calculateScore(place: Place, profile: any): number {
  const styleMatch = getStyleMatch(place.tags || [], profile?.travel_style || []);
  const ratingScore = (place.rating_avg || 0) / 5;
  const budgetScore = getBudgetScore(place, profile);
  const popularityScore = Math.min((place.rating_count || 0) / 100, 1);

  // Trọng số theo yêu cầu
  return styleMatch * 40
       + ratingScore * 25
       + budgetScore * 20
       + popularityScore * 15;
}

function getStyleMatch(placeTags: string[], userStyles: string[]): number {
  if (!userStyles.length) return 0.5;
  const matchCount = placeTags.filter(tag => userStyles.includes(tag)).length;
  return Math.min(matchCount / userStyles.length, 1);
}

function getBudgetScore(place: Place, profile: any): number {
  // Simple budget matching logic
  // Returns 1 if perfectly matches budget, lower otherwise
  if (!profile?.budget_tier) return 0.8;
  const tier = profile.budget_tier;
  const fee = place.entry_fee_max || 0;
  
  if (tier === 'low' && fee < 100000) return 1;
  if (tier === 'mid' && fee >= 100000 && fee < 500000) return 1;
  if (tier === 'high' && fee >= 500000) return 1;
  
  if (fee === 0) return 1; // Free is always good
  
  return 0.5; // Neutral
}
