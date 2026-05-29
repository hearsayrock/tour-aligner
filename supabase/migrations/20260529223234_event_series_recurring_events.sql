create table public.event_series (
  id                    uuid primary key default gen_random_uuid(),
  venue_id              uuid not null references public.venues(id) on delete cascade,
  created_by_user_id    uuid references public.profiles(id) on delete set null,
  recurrence_weekdays   integer[] not null
                          check (
                            cardinality(recurrence_weekdays) between 1 and 7
                            and recurrence_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
                          ),
  start_date            date not null,
  start_time            time not null,
  limit_type            text not null check (limit_type in ('count', 'end_date')),
  occurrence_count      integer check (occurrence_count is null or occurrence_count > 0),
  recurrence_end_date   date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (
    (limit_type = 'count' and occurrence_count is not null and recurrence_end_date is null)
    or
    (limit_type = 'end_date' and recurrence_end_date is not null and occurrence_count is null)
  )
);

create index event_series_venue_start_idx
  on public.event_series(venue_id, start_date);

create trigger set_event_series_updated_at
  before update on public.event_series
  for each row execute procedure public.set_updated_at();

alter table public.events
  add column if not exists event_series_id uuid references public.event_series(id) on delete set null,
  add column if not exists series_occurrence_index integer check (series_occurrence_index is null or series_occurrence_index > 0);

create index events_event_series_idx
  on public.events(event_series_id, series_occurrence_index)
  where event_series_id is not null;

alter table public.event_series enable row level security;

create policy "event_series: select claimed venue owner"
  on public.event_series for select
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "event_series: insert claimed venue owner"
  on public.event_series for insert
  to authenticated
  with check (
    auth.uid() = created_by_user_id
    and auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

create policy "event_series: update claimed venue owner"
  on public.event_series for update
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  )
  with check (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "event_series: delete claimed venue owner"
  on public.event_series for delete
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );
