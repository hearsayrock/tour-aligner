create table public.venue_unavailable_series (
  id                    uuid primary key default gen_random_uuid(),
  venue_id              uuid not null references public.venues(id) on delete cascade,
  created_by_user_id    uuid references public.profiles(id) on delete set null,
  recurrence_weekdays   integer[] not null
                          check (
                            cardinality(recurrence_weekdays) between 1 and 7
                            and recurrence_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]
                          ),
  start_date            date not null,
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

create table public.venue_unavailable_dates (
  id                    uuid primary key default gen_random_uuid(),
  venue_id              uuid not null references public.venues(id) on delete cascade,
  unavailable_series_id uuid references public.venue_unavailable_series(id) on delete set null,
  unavailable_date      date not null,
  reason                text,
  created_by_user_id    uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (venue_id, unavailable_date)
);

create index venue_unavailable_series_venue_start_idx
  on public.venue_unavailable_series(venue_id, start_date);

create index venue_unavailable_dates_venue_date_idx
  on public.venue_unavailable_dates(venue_id, unavailable_date);

create index venue_unavailable_dates_series_idx
  on public.venue_unavailable_dates(unavailable_series_id)
  where unavailable_series_id is not null;

create trigger set_venue_unavailable_series_updated_at
  before update on public.venue_unavailable_series
  for each row execute procedure public.set_updated_at();

create trigger set_venue_unavailable_dates_updated_at
  before update on public.venue_unavailable_dates
  for each row execute procedure public.set_updated_at();

alter table public.venue_unavailable_series enable row level security;
alter table public.venue_unavailable_dates enable row level security;

create policy "venue_unavailable_series: select claimed venue owner"
  on public.venue_unavailable_series for select
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "venue_unavailable_series: insert claimed venue owner"
  on public.venue_unavailable_series for insert
  to authenticated
  with check (
    auth.uid() = created_by_user_id
    and auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

create policy "venue_unavailable_series: update claimed venue owner"
  on public.venue_unavailable_series for update
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  )
  with check (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "venue_unavailable_series: delete claimed venue owner"
  on public.venue_unavailable_series for delete
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "venue_unavailable_dates: select claimed venue owner"
  on public.venue_unavailable_dates for select
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "venue_unavailable_dates: insert claimed venue owner"
  on public.venue_unavailable_dates for insert
  to authenticated
  with check (
    auth.uid() = created_by_user_id
    and auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

create policy "venue_unavailable_dates: update claimed venue owner"
  on public.venue_unavailable_dates for update
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  )
  with check (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "venue_unavailable_dates: delete claimed venue owner"
  on public.venue_unavailable_dates for delete
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );
