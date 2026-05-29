drop policy if exists "event_series: delete claimed venue owner" on public.event_series;
drop policy if exists "event_series: update claimed venue owner" on public.event_series;
drop policy if exists "event_series: insert claimed venue owner" on public.event_series;
drop policy if exists "event_series: select claimed venue owner" on public.event_series;

drop index if exists public.events_event_series_idx;

alter table public.events
  drop column if exists series_occurrence_index,
  drop column if exists event_series_id;

drop trigger if exists set_event_series_updated_at on public.event_series;
drop index if exists public.event_series_venue_start_idx;
drop table if exists public.event_series;
