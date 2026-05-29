drop policy if exists "venue_unavailable_dates: delete claimed venue owner" on public.venue_unavailable_dates;
drop policy if exists "venue_unavailable_dates: update claimed venue owner" on public.venue_unavailable_dates;
drop policy if exists "venue_unavailable_dates: insert claimed venue owner" on public.venue_unavailable_dates;
drop policy if exists "venue_unavailable_dates: select claimed venue owner" on public.venue_unavailable_dates;
drop policy if exists "venue_unavailable_series: delete claimed venue owner" on public.venue_unavailable_series;
drop policy if exists "venue_unavailable_series: update claimed venue owner" on public.venue_unavailable_series;
drop policy if exists "venue_unavailable_series: insert claimed venue owner" on public.venue_unavailable_series;
drop policy if exists "venue_unavailable_series: select claimed venue owner" on public.venue_unavailable_series;

drop trigger if exists set_venue_unavailable_dates_updated_at on public.venue_unavailable_dates;
drop trigger if exists set_venue_unavailable_series_updated_at on public.venue_unavailable_series;

drop index if exists public.venue_unavailable_dates_series_idx;
drop index if exists public.venue_unavailable_dates_venue_date_idx;
drop index if exists public.venue_unavailable_series_venue_start_idx;

drop table if exists public.venue_unavailable_dates;
drop table if exists public.venue_unavailable_series;
