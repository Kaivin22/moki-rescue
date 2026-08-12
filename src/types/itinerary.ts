import type { Place } from './place';
import type { ItineraryStatus, ItineraryVisibility, TransportMode } from './domain';

export interface ItineraryDraft {
  title: string;
  numDays: number;
  numPeople: number;
  startDate: string;
  transport: TransportMode;
  travelStyles: string[];
  selectedPlaces: Place[];
}

export interface Itinerary {
  id: string;
  user_id?: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  num_days: number;
  start_date: string | null;
  end_date: string | null;
  transport: TransportMode;
  travel_style: string[] | null;
  num_people: number;
  visibility: ItineraryVisibility;
  status: ItineraryStatus;
  share_token?: string | null;
  voting_status: 'open' | 'locked';
  share_expires_at: string | null;
  is_owner?: boolean;
  author_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDay {
  id: string;
  itinerary_id: string;
  day_number: number;
  date: string | null;
  title: string | null;
  note: string | null;
  weather_score: number | null;
  weather_summary: string | null;
  advice: unknown[];
  itinerary_slots?: ItinerarySlot[];
}

export interface ItinerarySlot {
  id: string;
  day_id: string;
  place_id: string | null;
  place_name: string;
  place_image_url: string | null;
  place_category: string | null;
  order_index: number;
  start_time: string;
  duration_min: number;
  note: string | null;
  transport_mode: TransportMode;
  travel_time_min: number;
  weather_score: number | null;
  weather_note: string | null;
  rain_at_hour: number | null;
  is_meal: boolean;
  is_indoor: boolean;
  created_at: string;
  places?: Place | null;
}

export interface ItineraryDetail extends Itinerary {
  itinerary_days: ItineraryDay[];
}
