-- Minimal pre-migration schema for isolated PostgreSQL integration tests.
create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
    '00000000-0000-0000-0000-000000000099')::uuid
$$;
create table venues (
  id uuid primary key, name text, claimed_by_user_id uuid,
  default_bill_cap integer default 4, capacity integer
);
create table bands (id uuid primary key, user_id uuid, name text, slug text, is_active boolean default true);
create table contact_threads (
  id uuid primary key, venue_id uuid, band_id uuid, status text,
  working_date date, last_message_at timestamptz, venue_last_read_at timestamptz
);
create table venue_booking_dates (
  id uuid primary key default gen_random_uuid(), venue_id uuid references venues,
  show_date date, bill_cap integer, is_closed_to_more_bands boolean default false,
  is_unavailable boolean default false, unique(venue_id,show_date)
);
create table events (
  id uuid primary key default gen_random_uuid(), venue_id uuid references venues,
  created_by_user_id uuid, title text, slug text unique, event_date date,
  start_time time, artist_need_description text, description text,
  attendee_capacity integer, needed_artist_count integer,
  is_public boolean default false, is_accepting_artists boolean default true,
  status text default 'draft', lineup_published boolean default false,
  venue_booking_date_id uuid references venue_booking_dates,
  logistics_notes text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create unique index events_venue_booking_date_id_key on events(venue_booking_date_id)
  where venue_booking_date_id is not null;
create table event_artist_memberships (
  id uuid primary key default gen_random_uuid(), event_id uuid references events on delete cascade,
  band_id uuid references bands, status text, source text, accepted_at timestamptz,
  removal_requested_at timestamptz, removal_note text, removed_at timestamptz, created_at timestamptz default now(),
  updated_at timestamptz default now(), unique(event_id,band_id)
);
create table bookings (
  id uuid primary key default gen_random_uuid(), thread_id uuid not null references contact_threads on delete cascade,
  band_id uuid references bands, venue_id uuid references venues, show_date date,
  venue_booking_date_id uuid references venue_booking_dates, event_id uuid references events on delete set null,
  status text default 'confirmed', cancellation_requested_by_side text, cancellation_requested_at timestamptz,
  cancelled_by_side text, cancelled_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
create unique index bookings_active_pair_date_unique on bookings(band_id,venue_id,show_date)
  where status in ('confirmed','cancellation_requested');
create table contact_messages (
  thread_id uuid, sender_side text, sender_user_id uuid, kind text, body text, created_at timestamptz
);
create table backstage_messages (
  event_id uuid, sender_user_id uuid, sender_kind text, sender_band_id uuid, body text, created_at timestamptz
);
insert into venues values('00000000-0000-0000-0000-000000000001','Test Venue',
  '00000000-0000-0000-0000-000000000099',4,100);
insert into bands(id,user_id,name,slug) values('00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000098','Test Artist','test-artist');
insert into events(id,venue_id,title,slug,event_date,needed_artist_count)
  values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001',
  'Test Event','test-event',current_date+30,1);
insert into contact_threads(id,venue_id,band_id,status)
  values('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002','accepted');
