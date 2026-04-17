-- ============================================================
-- TourAligner — Thread working dates and confirmed bookings
-- Migration: 20260417172751
-- ============================================================

alter table public.venues
  add column if not exists default_bill_cap integer not null default 4
  check (default_bill_cap > 0);

alter table public.contact_threads
  add column if not exists working_date date;

create table public.venue_booking_dates (
  id                       uuid primary key default gen_random_uuid(),
  venue_id                 uuid not null references public.venues(id) on delete cascade,
  show_date                date not null,
  bill_cap                 integer not null check (bill_cap > 0),
  is_closed_to_more_bands  boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint venue_booking_dates_unique unique (venue_id, show_date)
);

create index venue_booking_dates_venue_id_idx
  on public.venue_booking_dates(venue_id, show_date);

create trigger set_venue_booking_dates_updated_at
  before update on public.venue_booking_dates
  for each row execute procedure public.set_updated_at();

create table public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  thread_id             uuid not null unique references public.contact_threads(id) on delete cascade,
  band_id               uuid not null references public.bands(id) on delete cascade,
  venue_id              uuid not null references public.venues(id) on delete cascade,
  show_date             date not null,
  venue_booking_date_id uuid not null references public.venue_booking_dates(id) on delete cascade,
  status                text not null default 'confirmed'
                          check (status in ('confirmed', 'cancelled')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index bookings_band_id_idx
  on public.bookings(band_id, status, created_at desc);

create index bookings_venue_id_idx
  on public.bookings(venue_id, status, created_at desc);

create index bookings_show_date_idx
  on public.bookings(show_date, status);

create index bookings_venue_booking_date_id_idx
  on public.bookings(venue_booking_date_id, status);

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

create or replace function public.set_contact_thread_working_date(
  p_thread_id uuid,
  p_show_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_thread public.contact_threads%rowtype;
  v_actor_side text;
  v_actor_label text;
  v_previous_date date;
  v_message text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select thread.*
    into v_thread
  from public.contact_threads thread
  where thread.id = p_thread_id
  for update;

  if not found then
    raise exception 'Conversation not found.';
  end if;

  if v_uid = (select user_id from public.bands where id = v_thread.band_id) then
    v_actor_side := 'band';
    v_actor_label := 'Artist';
  elsif v_uid = (select claimed_by_user_id from public.venues where id = v_thread.venue_id) then
    v_actor_side := 'venue';
    v_actor_label := 'Venue';
  else
    raise exception 'You do not have access to this conversation.';
  end if;

  if v_thread.status <> 'accepted' then
    raise exception 'A working date can only be managed in an active conversation.';
  end if;

  v_previous_date := v_thread.working_date;

  update public.contact_threads
  set
    working_date = p_show_date,
    last_message_at = coalesce(last_message_at, v_now),
    band_last_read_at = case when v_actor_side = 'band' then v_now else band_last_read_at end,
    venue_last_read_at = case when v_actor_side = 'venue' then v_now else venue_last_read_at end
  where id = v_thread.id
  returning *
  into v_thread;

  if v_previous_date is distinct from p_show_date then
    if p_show_date is null then
      v_message := v_actor_label || ' cleared the working date.';
    elsif v_previous_date is null then
      v_message := v_actor_label || ' set the working date to ' || to_char(p_show_date, 'Mon FMDD, YYYY') || '.';
    else
      v_message := v_actor_label || ' moved the working date to ' || to_char(p_show_date, 'Mon FMDD, YYYY') || '.';
    end if;

    insert into public.contact_messages (
      thread_id,
      sender_side,
      sender_user_id,
      kind,
      body,
      created_at
    ) values (
      v_thread.id,
      v_actor_side,
      v_uid,
      'system',
      v_message,
      v_now
    );
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'working_date_updated'
  );
end;
$$;

create or replace function public.confirm_contact_booking(
  p_thread_id uuid,
  p_show_date date default null,
  p_bill_cap integer default null,
  p_close_bill boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_thread public.contact_threads%rowtype;
  v_venue public.venues%rowtype;
  v_show_date date;
  v_booking_date public.venue_booking_dates%rowtype;
  v_confirmed_count integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select thread.*
    into v_thread
  from public.contact_threads thread
  where thread.id = p_thread_id
  for update;

  if not found then
    raise exception 'Conversation not found.';
  end if;

  if v_thread.status <> 'accepted' then
    raise exception 'Only active conversations can be confirmed.';
  end if;

  select *
    into v_venue
  from public.venues
  where id = v_thread.venue_id
  for update;

  if not found then
    raise exception 'Venue not found.';
  end if;

  if v_venue.claimed_by_user_id <> v_uid then
    raise exception 'Only the venue owner can confirm a booking.';
  end if;

  v_show_date := coalesce(p_show_date, v_thread.working_date);

  if v_show_date is null then
    raise exception 'Set a working date before confirming a booking.';
  end if;

  if exists (
    select 1
    from public.bookings
    where thread_id = v_thread.id
      and status = 'confirmed'
  ) then
    raise exception 'This conversation already has a confirmed booking.';
  end if;

  select *
    into v_booking_date
  from public.venue_booking_dates
  where venue_id = v_thread.venue_id
    and show_date = v_show_date
  for update;

  if not found then
    insert into public.venue_booking_dates (
      venue_id,
      show_date,
      bill_cap,
      is_closed_to_more_bands
    ) values (
      v_thread.venue_id,
      v_show_date,
      coalesce(p_bill_cap, v_venue.default_bill_cap),
      p_close_bill
    )
    returning *
    into v_booking_date;
  else
    update public.venue_booking_dates
    set
      bill_cap = coalesce(p_bill_cap, bill_cap),
      is_closed_to_more_bands = case
        when p_close_bill then true
        else is_closed_to_more_bands
      end
    where id = v_booking_date.id
    returning *
    into v_booking_date;
  end if;

  select count(*)
    into v_confirmed_count
  from public.bookings
  where venue_booking_date_id = v_booking_date.id
    and status = 'confirmed';

  if v_booking_date.is_closed_to_more_bands and v_confirmed_count > 0 then
    raise exception 'This date is already capped and closed to more bands.';
  end if;

  if v_confirmed_count >= v_booking_date.bill_cap then
    raise exception 'This date has reached its bill cap.';
  end if;

  insert into public.bookings (
    thread_id,
    band_id,
    venue_id,
    show_date,
    venue_booking_date_id,
    status
  ) values (
    v_thread.id,
    v_thread.band_id,
    v_thread.venue_id,
    v_show_date,
    v_booking_date.id,
    'confirmed'
  );

  update public.contact_threads
  set
    working_date = v_show_date,
    last_message_at = v_now,
    venue_last_read_at = v_now
  where id = v_thread.id
  returning *
  into v_thread;

  insert into public.contact_messages (
    thread_id,
    sender_side,
    sender_user_id,
    kind,
    body,
    created_at
  ) values (
    v_thread.id,
    'venue',
    v_uid,
    'system',
    'Venue confirmed the booking for ' || to_char(v_show_date, 'Mon FMDD, YYYY') || '.',
    v_now
  );

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'booking_confirmed'
  );
end;
$$;

revoke all on function public.set_contact_thread_working_date(uuid, date) from public;
revoke all on function public.confirm_contact_booking(uuid, date, integer, boolean) from public;

grant execute on function public.set_contact_thread_working_date(uuid, date) to authenticated;
grant execute on function public.confirm_contact_booking(uuid, date, integer, boolean) to authenticated;

alter table public.venue_booking_dates enable row level security;
alter table public.bookings enable row level security;

create policy "venue_booking_dates: select all"
  on public.venue_booking_dates for select
  using (true);

create policy "bookings: select public confirmed or participants"
  on public.bookings for select
  using (
    status = 'confirmed'
    or auth.uid() = (select user_id from public.bands where id = band_id)
    or auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );
