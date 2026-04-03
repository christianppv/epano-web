/**
 * Database type definitions for EPANO.
 *
 * Regenerate with:
 *   supabase gen types typescript --local > src/types/database.ts
 *
 * These manual types serve as a fallback until Supabase is connected.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; name: string | null; email: string | null; avatar_url: string | null; created_at: string };
        Insert: { id: string; name?: string; email?: string; avatar_url?: string };
        Update: { name?: string; email?: string; avatar_url?: string };
        Relationships: never[];
      };
      trips: {
        Row: { id: string; name: string; destination: string; date_from: string | null; date_to: string | null; invite_code: string; created_by: string | null; status: string; planned_members: number; created_at: string };
        Insert: { name: string; destination: string; date_from?: string | null; date_to?: string | null; created_by: string; planned_members?: number; status?: string };
        Update: { name?: string; destination?: string; date_from?: string | null; date_to?: string | null; status?: string; planned_members?: number };
        Relationships: never[];
      };
      trip_members: {
        Row: { trip_id: string; user_id: string; role: 'organizer' | 'member'; joined_at: string };
        Insert: { trip_id: string; user_id: string; role?: 'organizer' | 'member' };
        Update: { role?: 'organizer' | 'member' };
        Relationships: never[];
      };
      options: {
        Row: { id: string; trip_id: string; url: string | null; title: string | null; image_url: string | null; price: string | null; rating: string | null; source_domain: string | null; category: string; notes: string | null; added_by: string | null; status: string; created_at: string };
        Insert: { trip_id: string; url?: string; title?: string; image_url?: string; price?: string; rating?: string; source_domain?: string; category?: string; notes?: string; added_by?: string };
        Update: { title?: string; image_url?: string; price?: string; rating?: string; category?: string; notes?: string; status?: string };
        Relationships: never[];
      };
      polls: {
        Row: { id: string; trip_id: string; title: string; category: string | null; deadline: string | null; status: string; created_by: string | null; created_at: string };
        Insert: { trip_id: string; title: string; category?: string; deadline?: string; created_by?: string };
        Update: { title?: string; deadline?: string; status?: string };
        Relationships: never[];
      };
      poll_options: {
        Row: { id: string; poll_id: string; option_id: string };
        Insert: { poll_id: string; option_id: string };
        Update: never;
        Relationships: never[];
      };
      votes: {
        Row: { id: string; poll_id: string; poll_option_id: string; user_id: string; value: 'yes' | 'no' | 'maybe'; created_at: string };
        Insert: { poll_id: string; poll_option_id: string; user_id: string; value?: 'yes' | 'no' | 'maybe' };
        Update: { value?: 'yes' | 'no' | 'maybe' };
        Relationships: never[];
      };
      comments: {
        Row: { id: string; trip_id: string; option_id: string | null; poll_id: string | null; user_id: string; text: string; created_at: string };
        Insert: { trip_id: string; user_id: string; text: string; option_id?: string; poll_id?: string };
        Update: { text?: string };
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_trip: {
        Args: { p_name: string; p_destination: string; p_date_from?: string | null; p_date_to?: string | null; p_planned_members?: number };
        Returns: { id: string; name: string; destination: string; date_from: string | null; date_to: string | null; invite_code: string; created_by: string; status: string; planned_members: number; created_at: string }[];
      };
      get_trip_by_invite_code: {
        Args: { p_code: string };
        Returns: { id: string; name: string; destination: string; status: string; invite_code: string }[];
      };
      join_trip_by_invite_code: {
        Args: { p_code: string };
        Returns: string;
      };
    };
  };
}
