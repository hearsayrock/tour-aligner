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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          show_date: string
          bill_cap: number
          is_closed_to_more_bands?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          venue_id?: string
          show_date?: string
          bill_cap?: number
          is_closed_to_more_bands?: boolean
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
          status: 'confirmed' | 'cancelled'
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
          status?: 'confirmed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          thread_id?: string
          band_id?: string
          venue_id?: string
          show_date?: string
          venue_booking_date_id?: string
          status?: 'confirmed' | 'cancelled'
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
    }
    Views: Record<string, never>
    Functions: {
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
export type BookingInquiry = Database['public']['Tables']['booking_inquiries']['Row']
export type ContactThread  = Database['public']['Tables']['contact_threads']['Row']
export type VenueBookingDate = Database['public']['Tables']['venue_booking_dates']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type ContactMessage = Database['public']['Tables']['contact_messages']['Row']

export type InquiryStatus = BookingInquiry['status']
export type ClaimStatus   = VenueClaim['status']
export type TouringRadius = NonNullable<Band['touring_radius']>
export type ContactThreadStatus = ContactThread['status']
export type ConversationSide = NonNullable<ContactThread['requested_by_side']>
export type ContactMessageKind = ContactMessage['kind']
export type BookingStatus = Booking['status']
