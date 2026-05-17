-- Restore legacy band profile schema that exists in production but was moved
-- out of active migrations because of duplicate historical timestamps.

alter table public.bands
  add column if not exists tagline text,
  add column if not exists touring_radius text,
  add column if not exists apple_music_url text,
  add column if not exists tiktok_url text,
  add column if not exists soundcloud_url text,
  add column if not exists facebook_url text,
  add column if not exists twitter_url text,
  add column if not exists members text[] not null default '{}',
  add column if not exists featured_track_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bands_touring_radius_check'
      and conrelid = 'public.bands'::regclass
  ) then
    alter table public.bands
      add constraint bands_touring_radius_check
      check (touring_radius in ('local', 'regional', 'national', 'international'));
  end if;
end $$;

create table if not exists public.band_show_dates (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  show_date date not null,
  venue_name text not null,
  city text not null,
  state text not null,
  ticket_url text,
  created_at timestamptz not null default now()
);

create index if not exists band_show_dates_band_id_idx
  on public.band_show_dates(band_id);

create index if not exists band_show_dates_date_idx
  on public.band_show_dates(show_date);

alter table public.band_show_dates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'band_show_dates'
      and policyname = 'Show dates are publicly readable'
  ) then
    create policy "Show dates are publicly readable"
      on public.band_show_dates for select
      using (
        exists (
          select 1
          from public.bands
          where bands.id = band_show_dates.band_id
            and bands.is_active = true
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'band_show_dates'
      and policyname = 'Band owner can manage show dates'
  ) then
    create policy "Band owner can manage show dates"
      on public.band_show_dates for all
      using (
        exists (
          select 1
          from public.bands
          where bands.id = band_show_dates.band_id
            and bands.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.bands
          where bands.id = band_show_dates.band_id
            and bands.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bands'
      and policyname = 'bands: select public active'
  ) then
    create policy "bands: select public active"
      on public.bands for select
      using (is_active = true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'band_genres'
      and policyname = 'band_genres: select public'
  ) then
    create policy "band_genres: select public"
      on public.band_genres for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_inquiries'
      and policyname = 'booking_inquiries: select accepted public'
  ) then
    create policy "booking_inquiries: select accepted public"
      on public.booking_inquiries for select
      using (status = 'accepted');
  end if;
end $$;
