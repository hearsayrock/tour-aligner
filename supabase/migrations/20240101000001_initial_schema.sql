-- ============================================================
-- TourAligner — Initial Schema
-- Migration: 20240101000001
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- Extends auth.users 1:1. Created automatically on signup.
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- GENRES
-- Reference table. Seeded via a separate migration.
-- ─────────────────────────────────────────────────────────────
create table public.genres (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  slug        text unique not null,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- BANDS
-- An artist profile. One user can own many bands.
-- ─────────────────────────────────────────────────────────────
create table public.bands (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  slug            text unique not null,
  location_city   text,
  location_state  text,
  description     text,
  website_url     text,
  instagram_url   text,
  spotify_url     text,
  youtube_url     text,
  bandcamp_url    text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index bands_user_id_idx    on public.bands(user_id);
create index bands_slug_idx       on public.bands(slug);
create index bands_location_idx   on public.bands(location_state);

create table public.band_genres (
  band_id   uuid not null references public.bands(id) on delete cascade,
  genre_id  uuid not null references public.genres(id) on delete cascade,
  primary key (band_id, genre_id)
);

-- ─────────────────────────────────────────────────────────────
-- VENUES
-- Public directory of music venues. Claimable by one user.
-- ─────────────────────────────────────────────────────────────
create table public.venues (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text unique not null,
  location_city         text not null,
  location_state        text not null,
  location_address      text,
  location_zip          text,
  capacity              integer check (capacity > 0),
  description           text,
  website_url           text,
  instagram_url         text,
  phone                 text,
  booking_email         text,
  -- Set when a claim is approved. Null = unclaimed.
  claimed_by_user_id    uuid references public.profiles(id) on delete set null,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index venues_slug_idx         on public.venues(slug);
create index venues_location_idx     on public.venues(location_state, location_city);
create index venues_claimed_by_idx   on public.venues(claimed_by_user_id);

create table public.venue_genres (
  venue_id  uuid not null references public.venues(id) on delete cascade,
  genre_id  uuid not null references public.genres(id) on delete cascade,
  primary key (venue_id, genre_id)
);

-- ─────────────────────────────────────────────────────────────
-- VENUE CLAIMS
-- Tracks who claimed which venue and when.
-- For MVP, claims are auto-approved.
-- status: pending | approved | rejected (pending used when admin review is added)
-- ─────────────────────────────────────────────────────────────
create table public.venue_claims (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'approved'
                check (status in ('pending', 'approved', 'rejected')),
  notes       text,  -- reserved for admin review notes
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Only one approved claim per venue at a time
  constraint venue_claims_venue_unique unique (venue_id)
);

create index venue_claims_user_id_idx on public.venue_claims(user_id);

-- When a claim is approved, stamp claimed_by_user_id on the venue row.
-- This denormalization allows efficient RLS checks on booking_inquiries.
create or replace function public.handle_venue_claim()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'approved' then
    update public.venues
    set claimed_by_user_id = new.user_id,
        updated_at = now()
    where id = new.venue_id;
  end if;
  return new;
end;
$$;

create trigger on_venue_claim_approved
  after insert or update of status on public.venue_claims
  for each row execute procedure public.handle_venue_claim();

-- ─────────────────────────────────────────────────────────────
-- BOOKING INQUIRIES
-- Sent by an artist (band) to a venue.
-- status: pending | accepted | declined | cancelled
-- ─────────────────────────────────────────────────────────────
create table public.booking_inquiries (
  id                uuid primary key default gen_random_uuid(),
  band_id           uuid not null references public.bands(id) on delete cascade,
  venue_id          uuid not null references public.venues(id) on delete cascade,
  requested_date    date not null,
  message           text not null,
  expected_draw     integer check (expected_draw >= 0),
  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  -- Venue's response note (accept or decline message)
  response_message  text,
  responded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index booking_inquiries_band_id_idx   on public.booking_inquiries(band_id);
create index booking_inquiries_venue_id_idx  on public.booking_inquiries(venue_id);
create index booking_inquiries_status_idx    on public.booking_inquiries(status);

-- Automatically set responded_at when status changes to a terminal state
create or replace function public.handle_inquiry_response()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('accepted', 'declined') and old.status = 'pending' then
    new.responded_at = now();
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_inquiry_status_change
  before update on public.booking_inquiries
  for each row execute procedure public.handle_inquiry_response();

-- updated_at triggers for all tables
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_bands_updated_at
  before update on public.bands
  for each row execute procedure public.set_updated_at();

create trigger set_venues_updated_at
  before update on public.venues
  for each row execute procedure public.set_updated_at();

create trigger set_venue_claims_updated_at
  before update on public.venue_claims
  for each row execute procedure public.set_updated_at();
