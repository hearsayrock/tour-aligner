-- ============================================================
-- TourAligner — Row Level Security Policies
-- Migration: 20240101000002
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- GENRES
-- Public reference data — readable by everyone including anon.
-- Only modified via migrations.
-- ─────────────────────────────────────────────────────────────
alter table public.genres enable row level security;

create policy "genres: select all"
  on public.genres for select
  using (true);

-- ─────────────────────────────────────────────────────────────
-- BANDS
-- ─────────────────────────────────────────────────────────────
alter table public.bands enable row level security;

-- Any authenticated user can browse bands (discovery)
create policy "bands: select authenticated"
  on public.bands for select
  to authenticated
  using (is_active = true);

-- Authenticated users can create bands owned by themselves
create policy "bands: insert own"
  on public.bands for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Only the band owner can update
create policy "bands: update own"
  on public.bands for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only the band owner can delete (soft-delete via is_active preferred)
create policy "bands: delete own"
  on public.bands for delete
  to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- BAND_GENRES
-- ─────────────────────────────────────────────────────────────
alter table public.band_genres enable row level security;

create policy "band_genres: select authenticated"
  on public.band_genres for select
  to authenticated
  using (true);

create policy "band_genres: insert own band"
  on public.band_genres for insert
  to authenticated
  with check (
    auth.uid() = (select user_id from public.bands where id = band_id)
  );

create policy "band_genres: delete own band"
  on public.band_genres for delete
  to authenticated
  using (
    auth.uid() = (select user_id from public.bands where id = band_id)
  );

-- ─────────────────────────────────────────────────────────────
-- VENUES
-- Public directory — readable by everyone including anon.
-- Only the venue's claimed owner can edit.
-- ─────────────────────────────────────────────────────────────
alter table public.venues enable row level security;

-- Venues are publicly browsable (marketing + discovery)
create policy "venues: select all"
  on public.venues for select
  using (is_active = true);

-- Any authenticated user can add an unclaimed venue to the directory
create policy "venues: insert authenticated"
  on public.venues for insert
  to authenticated
  with check (claimed_by_user_id is null);

-- Only the claimed owner can update venue details
create policy "venues: update claimed owner"
  on public.venues for update
  to authenticated
  using (auth.uid() = claimed_by_user_id)
  with check (auth.uid() = claimed_by_user_id);

-- ─────────────────────────────────────────────────────────────
-- VENUE_GENRES
-- ─────────────────────────────────────────────────────────────
alter table public.venue_genres enable row level security;

create policy "venue_genres: select all"
  on public.venue_genres for select
  using (true);

create policy "venue_genres: insert claimed owner"
  on public.venue_genres for insert
  to authenticated
  with check (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

create policy "venue_genres: delete claimed owner"
  on public.venue_genres for delete
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

-- ─────────────────────────────────────────────────────────────
-- VENUE CLAIMS
-- ─────────────────────────────────────────────────────────────
alter table public.venue_claims enable row level security;

-- Users can view their own claims
create policy "venue_claims: select own"
  on public.venue_claims for select
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users can submit a claim (uniqueness constraint prevents duplicates)
create policy "venue_claims: insert authenticated"
  on public.venue_claims for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.venue_claims vc
      where vc.venue_id = venue_claims.venue_id
        and vc.status = 'approved'
    )
  );

-- Only admins update claims (status changes). No user-facing UPDATE for MVP.
-- When admin review is added, a service_role or admin policy goes here.

-- ─────────────────────────────────────────────────────────────
-- BOOKING INQUIRIES
-- Visible only to the band owner and the venue owner.
-- Band owner: can insert and cancel.
-- Venue owner: can accept or decline.
-- ─────────────────────────────────────────────────────────────
alter table public.booking_inquiries enable row level security;

-- Shared visibility helper: user owns the band OR owns the venue
create policy "booking_inquiries: select band or venue"
  on public.booking_inquiries for select
  to authenticated
  using (
    auth.uid() = (select user_id from public.bands where id = band_id)
    or
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

-- Band owner can send an inquiry for their own band
create policy "booking_inquiries: insert band owner"
  on public.booking_inquiries for insert
  to authenticated
  with check (
    auth.uid() = (select user_id from public.bands where id = band_id)
  );

-- Band owner can cancel (set status = 'cancelled'); only allowed from 'pending'
create policy "booking_inquiries: update cancel by band"
  on public.booking_inquiries for update
  to authenticated
  using (
    auth.uid() = (select user_id from public.bands where id = band_id)
    and status = 'pending'
  )
  with check (
    status = 'cancelled'
  );

-- Venue owner can accept or decline; only allowed from 'pending'
create policy "booking_inquiries: update respond by venue"
  on public.booking_inquiries for update
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    and status = 'pending'
  )
  with check (
    status in ('accepted', 'declined')
  );
