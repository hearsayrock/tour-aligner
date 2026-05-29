// ============================================================
// TourAligner — Database Types
// Auto-generate with: npx supabase gen types typescript --linked
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    PostgrestVersion: "12"
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          primary_role: 'artist' | 'venue' | 'both' | null
          location_city: string | null
          location_state: string | null
          preferred_contact: 'email' | 'phone'
          notif_new_inquiry: boolean
          notif_inquiry_response: boolean
          notif_marketing: boolean
          is_admin: boolean
          is_suspended: boolean
          email: string | null
          last_active_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          primary_role?: 'artist' | 'venue' | 'both' | null
          location_city?: string | null
          location_state?: string | null
          preferred_contact?: 'email' | 'phone'
          notif_new_inquiry?: boolean
          notif_inquiry_response?: boolean
          notif_marketing?: boolean
          is_admin?: boolean
          is_suspended?: boolean
          email?: string | null
          last_active_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          primary_role?: 'artist' | 'venue' | 'both' | null
          location_city?: string | null
          location_state?: string | null
          preferred_contact?: 'email' | 'phone'
          notif_new_inquiry?: boolean
          notif_inquiry_response?: boolean
          notif_marketing?: boolean
          is_admin?: boolean
          is_suspended?: boolean
          email?: string | null
          last_active_at?: string | null
          updated_at?: string
        }
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          name?: string
          slug?: string
        }
      }
      bands: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          tagline: string | null
          location_city: string | null
          location_state: string | null
          description: string | null
          touring_radius: 'local' | 'regional' | 'national' | 'international' | null
          website_url: string | null
          instagram_url: string | null
          spotify_url: string | null
          youtube_url: string | null
          bandcamp_url: string | null
          apple_music_url: string | null
          tiktok_url: string | null
          soundcloud_url: string | null
          facebook_url: string | null
          twitter_url: string | null
          members: string[]
          profile_photo_url: string | null
          cover_photo_url: string | null
          featured_track_url: string | null
          artist_type: 'solo' | 'band' | null
          set_length_min: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          tagline?: string | null
          location_city?: string | null
          location_state?: string | null
          description?: string | null
          touring_radius?: 'local' | 'regional' | 'national' | 'international' | null
          website_url?: string | null
          instagram_url?: string | null
          spotify_url?: string | null
          youtube_url?: string | null
          bandcamp_url?: string | null
          apple_music_url?: string | null
          tiktok_url?: string | null
          soundcloud_url?: string | null
          facebook_url?: string | null
          twitter_url?: string | null
          members?: string[]
          profile_photo_url?: string | null
          cover_photo_url?: string | null
          featured_track_url?: string | null
          artist_type?: 'solo' | 'band' | null
          set_length_min?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          tagline?: string | null
          location_city?: string | null
          location_state?: string | null
          description?: string | null
          touring_radius?: 'local' | 'regional' | 'national' | 'international' | null
          website_url?: string | null
          instagram_url?: string | null
          spotify_url?: string | null
          youtube_url?: string | null
          bandcamp_url?: string | null
          apple_music_url?: string | null
          tiktok_url?: string | null
          soundcloud_url?: string | null
          facebook_url?: string | null
          twitter_url?: string | null
          members?: string[]
          profile_photo_url?: string | null
          cover_photo_url?: string | null
          featured_track_url?: string | null
          artist_type?: 'solo' | 'band' | null
          set_length_min?: number | null
          is_active?: boolean
          updated_at?: string
        }
      }
      band_genres: {
        Row: {
          band_id: string
          genre_id: string
        }
        Insert: {
          band_id: string
          genre_id: string
        }
        Update: {
          band_id?: string
          genre_id?: string
        }
      }
      band_show_dates: {
        Row: {
          id: string
          band_id: string
          show_date: string
          venue_name: string
          city: string
          state: string
          ticket_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          band_id: string
          show_date: string
          venue_name: string
          city: string
          state: string
          ticket_url?: string | null
          created_at?: string
        }
        Update: {
          show_date?: string
          venue_name?: string
          city?: string
          state?: string
          ticket_url?: string | null
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          slug: string
          location_city: string
          location_state: string
          location_address: string | null
          location_zip: string | null
          capacity: number | null
          description: string | null
          website_url: string | null
          instagram_url: string | null
          phone: string | null
          booking_email: string | null
          claimed_by_user_id: string | null
          default_bill_cap: number
          age_requirement: 'all_ages' | '18_plus' | '21_plus' | null
          is_active: boolean
          is_unlisted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          location_city: string
          location_state: string
          location_address?: string | null
          location_zip?: string | null
          capacity?: number | null
          description?: string | null
          website_url?: string | null
          instagram_url?: string | null
          phone?: string | null
          booking_email?: string | null
          claimed_by_user_id?: string | null
          default_bill_cap?: number
          age_requirement?: 'all_ages' | '18_plus' | '21_plus' | null
          is_active?: boolean
          is_unlisted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          location_city?: string
          location_state?: string
          location_address?: string | null
          location_zip?: string | null
          capacity?: number | null
          description?: string | null
          website_url?: string | null
          instagram_url?: string | null
          phone?: string | null
          booking_email?: string | null
          claimed_by_user_id?: string | null
          default_bill_cap?: number
          age_requirement?: 'all_ages' | '18_plus' | '21_plus' | null
          is_active?: boolean
          is_unlisted?: boolean
          updated_at?: string
        }
      }
      venue_genres: {
        Row: {
          venue_id: string
          genre_id: string
        }
        Insert: {
          venue_id: string
          genre_id: string
        }
        Update: {
          venue_id?: string
          genre_id?: string
        }
      }
      venue_claims: {
        Row: {
          id: string
          venue_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          user_id: string
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          venue_id: string
          created_by_user_id: string | null
          event_series_id: string | null
          series_occurrence_index: number | null
          title: string
          slug: string
          event_date: string
          start_time: string
          artist_need_description: string
          description: string
          attendee_capacity: number
          needed_artist_count: number
          is_public: boolean
          is_accepting_artists: boolean
          status: 'draft' | 'active' | 'completed' | 'cancelled'
          lineup_published: boolean
          migrated_booking_group_key: string | null
          logistics_load_in: string | null
          logistics_soundcheck: string | null
          logistics_set_times: string | null
          logistics_backline: string | null
          logistics_artist_should_bring: string | null
          logistics_parking_access: string | null
          logistics_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          created_by_user_id?: string | null
          event_series_id?: string | null
          series_occurrence_index?: number | null
          title: string
          slug: string
          event_date: string
          start_time: string
          artist_need_description: string
          description: string
          attendee_capacity: number
          needed_artist_count: number
          is_public?: boolean
          is_accepting_artists?: boolean
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          lineup_published?: boolean
          migrated_booking_group_key?: string | null
          logistics_load_in?: string | null
          logistics_soundcheck?: string | null
          logistics_set_times?: string | null
          logistics_backline?: string | null
          logistics_artist_should_bring?: string | null
          logistics_parking_access?: string | null
          logistics_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          venue_id?: string
          created_by_user_id?: string | null
          event_series_id?: string | null
          series_occurrence_index?: number | null
          title?: string
          slug?: string
          event_date?: string
          start_time?: string
          artist_need_description?: string
          description?: string
          attendee_capacity?: number
          needed_artist_count?: number
          is_public?: boolean
          is_accepting_artists?: boolean
          status?: 'draft' | 'active' | 'completed' | 'cancelled'
          lineup_published?: boolean
          migrated_booking_group_key?: string | null
          logistics_load_in?: string | null
          logistics_soundcheck?: string | null
          logistics_set_times?: string | null
          logistics_backline?: string | null
          logistics_artist_should_bring?: string | null
          logistics_parking_access?: string | null
          logistics_notes?: string | null
          updated_at?: string
        }
      }
      event_series: {
        Row: {
          id: string
          venue_id: string
          created_by_user_id: string | null
          recurrence_weekdays: number[]
          start_date: string
          start_time: string
          limit_type: 'count' | 'end_date'
          occurrence_count: number | null
          recurrence_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          created_by_user_id?: string | null
          recurrence_weekdays: number[]
          start_date: string
          start_time: string
          limit_type: 'count' | 'end_date'
          occurrence_count?: number | null
          recurrence_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          venue_id?: string
          created_by_user_id?: string | null
          recurrence_weekdays?: number[]
          start_date?: string
          start_time?: string
          limit_type?: 'count' | 'end_date'
          occurrence_count?: number | null
          recurrence_end_date?: string | null
          updated_at?: string
        }
      }
      venue_unavailable_series: {
        Row: {
          id: string
          venue_id: string
          created_by_user_id: string | null
          recurrence_weekdays: number[]
          start_date: string
          limit_type: 'count' | 'end_date'
          occurrence_count: number | null
          recurrence_end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          created_by_user_id?: string | null
          recurrence_weekdays: number[]
          start_date: string
          limit_type: 'count' | 'end_date'
          occurrence_count?: number | null
          recurrence_end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          venue_id?: string
          created_by_user_id?: string | null
          recurrence_weekdays?: number[]
          start_date?: string
          limit_type?: 'count' | 'end_date'
          occurrence_count?: number | null
          recurrence_end_date?: string | null
          updated_at?: string
        }
      }
      venue_unavailable_dates: {
        Row: {
          id: string
          venue_id: string
          unavailable_series_id: string | null
          unavailable_date: string
          reason: string | null
          created_by_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          unavailable_series_id?: string | null
          unavailable_date: string
          reason?: string | null
          created_by_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          venue_id?: string
          unavailable_series_id?: string | null
          unavailable_date?: string
          reason?: string | null
          created_by_user_id?: string | null
          updated_at?: string
        }
      }
      event_genres: {
        Row: {
          event_id: string
          genre_id: string
        }
        Insert: {
          event_id: string
          genre_id: string
        }
        Update: {
          event_id?: string
          genre_id?: string
        }
      }
      event_artist_memberships: {
        Row: {
          id: string
          event_id: string
          band_id: string
          status: 'applied' | 'invited' | 'accepted' | 'declined' | 'removed' | 'removal_requested'
          source: 'application' | 'invitation' | 'migration' | 'manual'
          application_note: string | null
          invite_note: string | null
          removal_note: string | null
          applied_at: string | null
          invited_at: string | null
          accepted_at: string | null
          declined_at: string | null
          removed_at: string | null
          removal_requested_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          band_id: string
          status: 'applied' | 'invited' | 'accepted' | 'declined' | 'removed' | 'removal_requested'
          source?: 'application' | 'invitation' | 'migration' | 'manual'
          application_note?: string | null
          invite_note?: string | null
          removal_note?: string | null
          applied_at?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          declined_at?: string | null
          removed_at?: string | null
          removal_requested_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          event_id?: string
          band_id?: string
          status?: 'applied' | 'invited' | 'accepted' | 'declined' | 'removed' | 'removal_requested'
          source?: 'application' | 'invitation' | 'migration' | 'manual'
          application_note?: string | null
          invite_note?: string | null
          removal_note?: string | null
          applied_at?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          declined_at?: string | null
          removed_at?: string | null
          removal_requested_at?: string | null
          updated_at?: string
        }
      }
      backstage_messages: {
        Row: {
          id: string
          event_id: string
          sender_user_id: string | null
          sender_kind: 'venue' | 'artist' | 'system'
          sender_band_id: string | null
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          sender_user_id?: string | null
          sender_kind: 'venue' | 'artist' | 'system'
          sender_band_id?: string | null
          body: string
          created_at?: string
        }
        Update: {
          event_id?: string
          sender_user_id?: string | null
          sender_kind?: 'venue' | 'artist' | 'system'
          sender_band_id?: string | null
          body?: string
        }
      }
      backstage_read_states: {
        Row: {
          event_id: string
          user_id: string
          last_read_at: string
        }
        Insert: {
          event_id: string
          user_id: string
          last_read_at?: string
        }
        Update: {
          last_read_at?: string
        }
      }
      private_chat_threads: {
        Row: {
          id: string
          participant_one_kind: 'band' | 'venue'
          participant_one_id: string
          participant_two_kind: 'band' | 'venue'
          participant_two_id: string
          status: 'pending' | 'accepted' | 'declined' | 'blocked'
          requested_by_kind: 'band' | 'venue' | null
          requested_by_id: string | null
          blocked_by_kind: 'band' | 'venue' | null
          blocked_by_id: string | null
          accepted_at: string | null
          last_message_at: string | null
          participant_one_last_read_at: string | null
          participant_two_last_read_at: string | null
          participant_one_archived_at: string | null
          participant_two_archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_one_kind: 'band' | 'venue'
          participant_one_id: string
          participant_two_kind: 'band' | 'venue'
          participant_two_id: string
          status?: 'pending' | 'accepted' | 'declined' | 'blocked'
          requested_by_kind?: 'band' | 'venue' | null
          requested_by_id?: string | null
          blocked_by_kind?: 'band' | 'venue' | null
          blocked_by_id?: string | null
          accepted_at?: string | null
          last_message_at?: string | null
          participant_one_last_read_at?: string | null
          participant_two_last_read_at?: string | null
          participant_one_archived_at?: string | null
          participant_two_archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          participant_one_kind?: 'band' | 'venue'
          participant_one_id?: string
          participant_two_kind?: 'band' | 'venue'
          participant_two_id?: string
          status?: 'pending' | 'accepted' | 'declined' | 'blocked'
          requested_by_kind?: 'band' | 'venue' | null
          requested_by_id?: string | null
          blocked_by_kind?: 'band' | 'venue' | null
          blocked_by_id?: string | null
          accepted_at?: string | null
          last_message_at?: string | null
          participant_one_last_read_at?: string | null
          participant_two_last_read_at?: string | null
          participant_one_archived_at?: string | null
          participant_two_archived_at?: string | null
          updated_at?: string
        }
      }
      booking_inquiries: {
        Row: {
          id: string
          band_id: string
          venue_id: string
          requested_date: string
          message: string
          expected_draw: number | null
          status: 'pending' | 'accepted' | 'declined' | 'cancelled'
          response_message: string | null
          responded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          band_id: string
          venue_id: string
          requested_date: string
          message: string
          expected_draw?: number | null
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled'
          response_message?: string | null
          responded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          requested_date?: string
          message?: string
          expected_draw?: number | null
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled'
          response_message?: string | null
          responded_at?: string | null
          updated_at?: string
        }
      }
      contact_threads: {
        Row: {
          id: string
          band_id: string
          venue_id: string
          status: 'pending' | 'accepted' | 'declined' | 'blocked'
          requested_by_side: 'band' | 'venue' | null
          blocked_by_side: 'band' | 'venue' | null
          accepted_at: string | null
          working_date: string | null
          last_message_at: string | null
          band_last_read_at: string | null
          venue_last_read_at: string | null
          band_archived_at: string | null
          venue_archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          band_id: string
          venue_id: string
          status?: 'pending' | 'accepted' | 'declined' | 'blocked'
          requested_by_side?: 'band' | 'venue' | null
          blocked_by_side?: 'band' | 'venue' | null
          accepted_at?: string | null
          working_date?: string | null
          last_message_at?: string | null
          band_last_read_at?: string | null
          venue_last_read_at?: string | null
          band_archived_at?: string | null
          venue_archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          band_id?: string
          venue_id?: string
          status?: 'pending' | 'accepted' | 'declined' | 'blocked'
          requested_by_side?: 'band' | 'venue' | null
          blocked_by_side?: 'band' | 'venue' | null
          accepted_at?: string | null
          working_date?: string | null
          last_message_at?: string | null
          band_last_read_at?: string | null
          venue_last_read_at?: string | null
          band_archived_at?: string | null
          venue_archived_at?: string | null
          updated_at?: string
        }
      }
      venue_booking_dates: {
        Row: {
          id: string
          venue_id: string
          show_date: string
          bill_cap: number
          is_closed_to_more_bands: boolean
          is_unavailable: boolean
          show_type: 'open_bill' | 'touring_package' | 'local_showcase' | 'festival' | 'private_event' | 'special_event' | null
          genre_focus: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          show_date: string
          bill_cap: number
          is_closed_to_more_bands?: boolean
          is_unavailable?: boolean
          show_type?: 'open_bill' | 'touring_package' | 'local_showcase' | 'festival' | 'private_event' | 'special_event' | null
          genre_focus?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          venue_id?: string
          show_date?: string
          bill_cap?: number
          is_closed_to_more_bands?: boolean
          is_unavailable?: boolean
          show_type?: 'open_bill' | 'touring_package' | 'local_showcase' | 'festival' | 'private_event' | 'special_event' | null
          genre_focus?: string | null
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          thread_id: string
          band_id: string
          venue_id: string
          show_date: string
          venue_booking_date_id: string
          status: 'confirmed' | 'cancellation_requested' | 'cancelled'
          cancellation_requested_by_side: 'band' | 'venue' | null
          cancellation_requested_at: string | null
          cancelled_by_side: 'band' | 'venue' | null
          cancelled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          band_id: string
          venue_id: string
          show_date: string
          venue_booking_date_id: string
          status?: 'confirmed' | 'cancellation_requested' | 'cancelled'
          cancellation_requested_by_side?: 'band' | 'venue' | null
          cancellation_requested_at?: string | null
          cancelled_by_side?: 'band' | 'venue' | null
          cancelled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          thread_id?: string
          band_id?: string
          venue_id?: string
          show_date?: string
          venue_booking_date_id?: string
          status?: 'confirmed' | 'cancellation_requested' | 'cancelled'
          cancellation_requested_by_side?: 'band' | 'venue' | null
          cancellation_requested_at?: string | null
          cancelled_by_side?: 'band' | 'venue' | null
          cancelled_at?: string | null
          updated_at?: string
        }
      }
      contact_messages: {
        Row: {
          id: string
          thread_id: string
          sender_side: 'band' | 'venue' | null
          sender_user_id: string | null
          kind: 'request' | 'message' | 'system'
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_side?: 'band' | 'venue' | null
          sender_user_id?: string | null
          kind: 'request' | 'message' | 'system'
          body: string
          created_at?: string
        }
        Update: {
          thread_id?: string
          sender_side?: 'band' | 'venue' | null
          sender_user_id?: string | null
          kind?: 'request' | 'message' | 'system'
          body?: string
          created_at?: string
        }
      }
      private_chat_messages: {
        Row: {
          id: string
          thread_id: string
          sender_profile_kind: 'band' | 'venue' | null
          sender_profile_id: string | null
          sender_user_id: string | null
          kind: 'request' | 'message' | 'system'
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_profile_kind?: 'band' | 'venue' | null
          sender_profile_id?: string | null
          sender_user_id?: string | null
          kind: 'request' | 'message' | 'system'
          body: string
          created_at?: string
        }
        Update: {
          thread_id?: string
          sender_profile_kind?: 'band' | 'venue' | null
          sender_profile_id?: string | null
          sender_user_id?: string | null
          kind?: 'request' | 'message' | 'system'
          body?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      request_private_chat: {
        Args: {
          p_sender_kind: 'band' | 'venue'
          p_sender_id: string
          p_recipient_kind: 'band' | 'venue'
          p_recipient_id: string
          p_body: string
        }
        Returns: Json
      }
      respond_to_private_chat_request: {
        Args: {
          p_thread_id: string
          p_actor_kind: 'band' | 'venue'
          p_actor_id: string
          p_action: 'accept' | 'deny' | 'deny_and_block'
          p_note?: string | null
        }
        Returns: Json
      }
      send_private_chat_message: {
        Args: {
          p_thread_id: string
          p_sender_kind: 'band' | 'venue'
          p_sender_id: string
          p_body: string
        }
        Returns: Json
      }
      mark_private_chat_read: {
        Args: {
          p_thread_id: string
          p_actor_kind: 'band' | 'venue'
          p_actor_id: string
        }
        Returns: undefined
      }
      archive_private_chat_thread: {
        Args: {
          p_thread_id: string
          p_actor_kind: 'band' | 'venue'
          p_actor_id: string
        }
        Returns: Json
      }
      unarchive_private_chat_thread: {
        Args: {
          p_thread_id: string
          p_actor_kind: 'band' | 'venue'
          p_actor_id: string
        }
        Returns: Json
      }
      block_private_chat_thread: {
        Args: {
          p_thread_id: string
          p_actor_kind: 'band' | 'venue'
          p_actor_id: string
          p_note?: string | null
        }
        Returns: Json
      }
      unblock_private_chat_thread: {
        Args: {
          p_thread_id: string
          p_actor_kind: 'band' | 'venue'
          p_actor_id: string
        }
        Returns: Json
      }
      request_contact: {
        Args: {
          p_band_id: string
          p_venue_id: string
          p_initiator_side: 'band' | 'venue'
          p_body: string
          p_show_date?: string | null
        }
        Returns: Json
      }
      respond_to_contact_request: {
        Args: {
          p_thread_id: string
          p_action: 'accept' | 'decline_retry_later' | 'decline_and_block'
          p_note?: string | null
        }
        Returns: Json
      }
      unblock_contact_thread: {
        Args: {
          p_thread_id: string
        }
        Returns: Json
      }
      block_contact_thread: {
        Args: {
          p_thread_id: string
          p_note?: string | null
        }
        Returns: Json
      }
      send_contact_message: {
        Args: {
          p_thread_id: string
          p_body: string
        }
        Returns: Json
      }
      mark_contact_thread_read: {
        Args: {
          p_thread_id: string
        }
        Returns: undefined
      }
      set_contact_thread_working_date: {
        Args: {
          p_thread_id: string
          p_show_date?: string | null
        }
        Returns: Json
      }
      confirm_contact_booking: {
        Args: {
          p_thread_id: string
          p_show_date?: string | null
          p_bill_cap?: number | null
          p_close_bill?: boolean
        }
        Returns: Json
      }
      request_booking_cancellation: {
        Args: {
          p_booking_id: string
          p_note?: string | null
        }
        Returns: Json
      }
      resolve_booking_cancellation: {
        Args: {
          p_booking_id: string
          p_action: string
          p_note?: string | null
        }
        Returns: Json
      }
      cancel_confirmed_booking: {
        Args: {
          p_booking_id: string
          p_note?: string | null
        }
        Returns: Json
      }
      accept_event_invite: {
        Args: {
          p_membership_id: string
        }
        Returns: Json
      }
      request_event_removal: {
        Args: {
          p_membership_id: string
          p_note?: string | null
        }
        Returns: Json
      }
      archive_contact_thread: {
        Args: {
          p_thread_id: string
        }
        Returns: Json
      }
      unarchive_contact_thread: {
        Args: {
          p_thread_id: string
        }
        Returns: Json
      }
      search_bands_fuzzy: {
        Args: {
          p_query: string
        }
        Returns: {
          id: string
          rank: number
        }[]
      }
      search_venues_fuzzy: {
        Args: {
          p_query: string
        }
        Returns: {
          id: string
          rank: number
        }[]
      }
    }
    Enums: Record<string, never>
  }
}

// ─────────────────────────────────────────────────────────────
// Convenience row types
// ─────────────────────────────────────────────────────────────
export type Profile        = Database['public']['Tables']['profiles']['Row']
export type Genre          = Database['public']['Tables']['genres']['Row']
export type Band           = Database['public']['Tables']['bands']['Row']
export type BandGenre      = Database['public']['Tables']['band_genres']['Row']
export type BandShowDate   = Database['public']['Tables']['band_show_dates']['Row']
export type Venue          = Database['public']['Tables']['venues']['Row']
export type VenueGenre     = Database['public']['Tables']['venue_genres']['Row']
export type VenueClaim     = Database['public']['Tables']['venue_claims']['Row']
export type Event          = Database['public']['Tables']['events']['Row']
export type EventSeries    = Database['public']['Tables']['event_series']['Row']
export type VenueUnavailableSeries = Database['public']['Tables']['venue_unavailable_series']['Row']
export type VenueUnavailableDate = Database['public']['Tables']['venue_unavailable_dates']['Row']
export type EventGenre     = Database['public']['Tables']['event_genres']['Row']
export type EventArtistMembership = Database['public']['Tables']['event_artist_memberships']['Row']
export type BackstageMessage = Database['public']['Tables']['backstage_messages']['Row']
export type BackstageReadState = Database['public']['Tables']['backstage_read_states']['Row']
export type PrivateChatThread = Database['public']['Tables']['private_chat_threads']['Row']
export type BookingInquiry = Database['public']['Tables']['booking_inquiries']['Row']
export type ContactThread  = Database['public']['Tables']['contact_threads']['Row']
export type VenueBookingDate = Database['public']['Tables']['venue_booking_dates']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type ContactMessage = Database['public']['Tables']['contact_messages']['Row']
export type PrivateChatMessage = Database['public']['Tables']['private_chat_messages']['Row']

export type InquiryStatus = BookingInquiry['status']
export type ClaimStatus   = VenueClaim['status']
export type EventStatus   = Event['status']
export type EventArtistMembershipStatus = EventArtistMembership['status']
export type TouringRadius = NonNullable<Band['touring_radius']>
export type ContactThreadStatus = ContactThread['status']
export type ConversationSide = NonNullable<ContactThread['requested_by_side']>
export type ContactMessageKind = ContactMessage['kind']
export type BookingStatus = Booking['status']
export type PrivateChatStatus = PrivateChatThread['status']
export type PrivateChatMessageKind = PrivateChatMessage['kind']
