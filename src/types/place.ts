import type { PlaceCategory } from './domain';

export interface Place {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  tags: string[];
  suitable_for: string[];
  avg_duration_min: number;
  opening_time: string;
  closing_time: string;
  opening_days: number[];
  tips: string | null;
  best_time_of_day: string | null;
  best_months: number[] | null;
  image_urls: string[];
  phone: string | null;
  website: string | null;
  source_name: string;
  source_url: string;
  rating_avg: number | null;
  rating_count: number;
  is_active: boolean;
  content_status?: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
  review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  version?: number;
  score?: number; // Used for recommendation
  distanceKm?: number; // Used for distance sorting

  // ─── Weather-aware scheduling context (optional; suy luận từ category/tags nếu DB thiếu) ───
  is_indoor?: boolean;           // true = bảo tàng/mall/cafe (ít bị ảnh hưởng mưa)
  weather_sensitivity?: number;  // 0..1 — 1 = biển/leo núi (rất nhạy mưa), 0 = trong nhà
  ideal_time_of_day?: 'morning' | 'noon' | 'afternoon' | 'evening' | 'any';
  is_meal_venue?: boolean;       // điểm ăn uống — dùng để chèn vào khung bữa
}

export interface Review {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  visit_type: string | null;
  visit_month: number | null;
  highlights: string[] | null;
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
  minDuration: number | null;
  minRating: number | null;
  openNow: boolean;
}
