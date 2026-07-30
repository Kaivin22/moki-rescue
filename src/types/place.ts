export interface Place {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  lat: number;
  lng: number;
  category: string;
  tags: string[];
  suitable_for: string[];
  entry_fee_min: number;
  entry_fee_max: number;
  avg_duration_min: number;
  opening_time: string;
  closing_time: string;
  opening_days: number[];
  tips: string | null;
  best_time_of_day: string | null;
  best_months: number[];
  image_urls: string[];
  phone: string | null;
  website: string | null;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  score?: number; // Used for recommendation
}

export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  visit_type: string | null;
  visit_month: number | null;
  highlights: string[];
  comment: string | null;
  helpful_count: number;
  created_at: string;
  user?: {
    display_name: string;
    avatar_url: string;
  };
}

export interface FilterState {
  categories: string[];
  suitableFor: string[];
  maxEntryFee: number | null;
  minDuration: number | null;
  minRating: number | null;
  openNow: boolean;
}
