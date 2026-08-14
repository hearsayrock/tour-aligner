create table public.artist_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  booking_process_gripe text,
  created_at timestamptz not null default now(),
  constraint artist_waitlist_entries_email_not_blank check (length(trim(email)) > 0),
  constraint artist_waitlist_entries_gripe_not_blank check (
    booking_process_gripe is null or length(trim(booking_process_gripe)) > 0
  )
);

create index artist_waitlist_entries_created_at_idx
  on public.artist_waitlist_entries(created_at desc);

create index artist_waitlist_entries_email_idx
  on public.artist_waitlist_entries(lower(email));

alter table public.artist_waitlist_entries enable row level security;

create policy "artist_waitlist_entries: insert public"
  on public.artist_waitlist_entries for insert
  to anon, authenticated
  with check (true);

create policy "artist_waitlist_entries: admin select all"
  on public.artist_waitlist_entries for select
  to authenticated
  using (public.is_admin());

grant insert on public.artist_waitlist_entries to anon, authenticated;
grant select on public.artist_waitlist_entries to authenticated;
