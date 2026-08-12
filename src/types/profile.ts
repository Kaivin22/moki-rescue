import type { SupportTicketStatus, TransportMode } from './domain';

export interface Profile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  vip_status: 'free' | 'vip';
  vip_started_at?: string | null;
  vip_expires_at?: string | null;
  role: 'user' | 'editor' | 'admin';
  home_city?: string | null;
  travel_style?: string[] | null;
  preferred_transport?: TransportMode | null;
  travel_with?: 'solo' | 'couple' | 'family' | 'group' | null;
  ai_msg_count?: number;
  ai_msg_reset_date?: string;
  terms_version?: string | null;
  terms_accepted_at?: string | null;
  is_banned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description: string;
  status: SupportTicketStatus;
  created_at: string;
  updated_at: string;
}
