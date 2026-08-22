export type ProfileRole = 'customer' | 'provider' | 'dispatcher' | 'admin';

export interface Profile {
  id: string;
  display_name: string;
  avatar_path: string | null;
  role: ProfileRole;
  locale: 'vi' | 'en';
  is_active: boolean;
  terms_version: string | null;
  terms_accepted_at: string | null;
  deletion_requested_at?: string | null;
  created_at: string;
  updated_at: string;
}
