-- ============================================================
-- TourAligner — Band Profile Additions
-- Migration: 20240101000004
-- ============================================================

-- Add new fields to bands
alter table public.bands
  add column tagline          text,
  add column touring_radius   text check (touring_radius in ('local', 'regional', 'national', 'international')),
  add column apple_music_url  text,
  add column tiktok_url       text,
  add column soundcloud_url   text,
  add column facebook_url     text,
  add column twitter_url      text,
  add column members          text[] not null default '{}';

-- ─────────────────────────────────────────────────────────────
-- BAND SHOW DATES
-- Upcoming shows / tour dates listed on a band's profile.
-- ─────────────────────────────────────────────────────────────
create table public.band_show_dates (
  id          uuid primary key default gen_random_uuid(),
  band_id     uuid not null references public.bands(id) on delete cascade,
  show_date   date not null,
  venue_name  text not null,
  city        text not null,
  state       text not null,
  ticket_url  text,
  created_at  timestamptz not null default now()
);

create index band_show_dates_band_id_idx on public.band_show_dates(band_id);
create index band_show_dates_date_idx    on public.band_show_dates(show_date);

alter table public.band_show_dates enable row level security;

-- Anyone can read show dates for active bands
create policy "Show dates are publicly readable"
  on public.band_show_dates for select
  using (
    exists (
      select 1 from public.bands
      where bands.id = band_show_dates.band_id
        and bands.is_active = true
    )
  );

-- Band owner can manage their show dates
create policy "Band owner can manage show dates"
  on public.band_show_dates for all
  using (
    exists (
      select 1 from public.bands
      where bands.id = band_show_dates.band_id
        and bands.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bands
      where bands.id = band_show_dates.band_id
        and bands.user_id = auth.uid()
    )
  );
