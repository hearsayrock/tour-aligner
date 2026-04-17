-- ============================================================
-- TourAligner — Public band profiles and pending claims
-- Migration: 20260417162751
-- ============================================================

-- Public band profile pages should be viewable by signed-out visitors.
create policy "bands: select anon"
  on public.bands for select
  to anon
  using (is_active = true);

create policy "band_genres: select anon"
  on public.band_genres for select
  to anon
  using (true);

-- New and existing venue claims should require admin approval by default.
alter table public.venue_claims
  alter column status set default 'pending';
