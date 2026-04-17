-- ============================================================
-- TourAligner — Featured track + public profile access
-- Migration: 20240101000004
-- ============================================================

-- Add featured track URL to bands (Spotify track/album/playlist URL)
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS featured_track_url TEXT NULL;

-- ─────────────────────────────────────────────────────────────
-- Fix: Band profiles and genres were only readable by
-- authenticated users, breaking public-facing profile pages.
-- Open them up to all roles (including anon).
-- ─────────────────────────────────────────────────────────────

-- Bands: allow unauthenticated visitors to read active bands
CREATE POLICY "bands: select public active"
  ON public.bands FOR SELECT
  USING (is_active = true);

-- Band genres: allow unauthenticated visitors to read genre data
CREATE POLICY "band_genres: select public"
  ON public.band_genres FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- Accepted bookings: publicly visible so band profile pages
-- can show upcoming confirmed shows to any visitor.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "booking_inquiries: select accepted public"
  ON public.booking_inquiries FOR SELECT
  USING (status = 'accepted');
