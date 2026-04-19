alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (status in ('confirmed', 'cancellation_requested', 'cancelled'));

alter table public.bookings
  add column if not exists cancellation_requested_by_side text
    check (cancellation_requested_by_side in ('band', 'venue')),
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancelled_by_side text
    check (cancelled_by_side in ('band', 'venue')),
  add column if not exists cancelled_at timestamptz;

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
      and status in ('confirmed', 'cancellation_requested')
  ) then
    raise exception 'Resolve the current booking before confirming a new one.';
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
      is_closed_to_more_bands,
      is_unavailable
    ) values (
      v_thread.venue_id,
      v_show_date,
      coalesce(p_bill_cap, v_venue.default_bill_cap),
      p_close_bill,
      false
    )
    returning *
    into v_booking_date;
  else
    if v_booking_date.is_unavailable then
      raise exception 'This date is marked unavailable.';
    end if;

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
    raise exception 'This date has already reached its bill cap.';
  end if;

  insert into public.bookings (
    thread_id,
    band_id,
    venue_id,
    show_date,
    venue_booking_date_id,
    status,
    created_at,
    updated_at
  ) values (
    v_thread.id,
    v_thread.band_id,
    v_thread.venue_id,
    v_show_date,
    v_booking_date.id,
    'confirmed',
    v_now,
    v_now
  );

  update public.contact_threads
  set
    working_date = v_show_date,
    last_message_at = v_now,
    venue_last_read_at = v_now
  where id = v_thread.id;

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
    'status', 'confirmed',
    'action', 'booking_confirmed'
  );
end;
$$;

create or replace function public.request_booking_cancellation(
  p_thread_id uuid,
  p_note text default null
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
  v_booking public.bookings%rowtype;
  v_band public.bands%rowtype;
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
    raise exception 'Only active conversations can request a cancellation.';
  end if;

  select *
    into v_band
  from public.bands
  where id = v_thread.band_id;

  if not found or v_band.user_id <> v_uid then
    raise exception 'Only the artist can request cancellation.';
  end if;

  select *
    into v_booking
  from public.bookings
  where thread_id = v_thread.id
    and status = 'confirmed'
  order by updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No confirmed booking was found for this conversation.';
  end if;

  update public.bookings
  set
    status = 'cancellation_requested',
    cancellation_requested_by_side = 'band',
    cancellation_requested_at = v_now,
    updated_at = v_now
  where id = v_booking.id
  returning *
  into v_booking;

  update public.contact_threads
  set
    last_message_at = v_now,
    band_last_read_at = v_now
  where id = v_thread.id;

  insert into public.contact_messages (
    thread_id,
    sender_side,
    sender_user_id,
    kind,
    body,
    created_at
  ) values (
    v_thread.id,
    'band',
    v_uid,
    'system',
    'Artist requested to cancel the booking for ' || to_char(v_booking.show_date, 'Mon FMDD, YYYY') || '.',
    v_now
  );

  if nullif(btrim(coalesce(p_note, '')), '') is not null then
    insert into public.contact_messages (
      thread_id,
      sender_side,
      sender_user_id,
      kind,
      body,
      created_at
    ) values (
      v_thread.id,
      'band',
      v_uid,
      'message',
      btrim(p_note),
      v_now
    );
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', 'cancellation_requested',
    'action', 'booking_cancellation_requested'
  );
end;
$$;

create or replace function public.resolve_booking_cancellation(
  p_thread_id uuid,
  p_action text,
  p_note text default null
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
  v_booking public.bookings%rowtype;
  v_venue public.venues%rowtype;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if p_action not in ('keep', 'cancel') then
    raise exception 'Invalid cancellation action.';
  end if;

  select thread.*
    into v_thread
  from public.contact_threads thread
  where thread.id = p_thread_id
  for update;

  if not found then
    raise exception 'Conversation not found.';
  end if;

  select *
    into v_venue
  from public.venues
  where id = v_thread.venue_id;

  if not found or v_venue.claimed_by_user_id <> v_uid then
    raise exception 'Only the venue owner can resolve cancellation requests.';
  end if;

  select *
    into v_booking
  from public.bookings
  where thread_id = v_thread.id
    and status = 'cancellation_requested'
  order by updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No cancellation request is waiting on this booking.';
  end if;

  if p_action = 'keep' then
    update public.bookings
    set
      status = 'confirmed',
      cancellation_requested_by_side = null,
      cancellation_requested_at = null,
      updated_at = v_now
    where id = v_booking.id
    returning *
    into v_booking;

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
      'Venue kept the booking for ' || to_char(v_booking.show_date, 'Mon FMDD, YYYY') || ' in place.',
      v_now
    );
  else
    update public.bookings
    set
      status = 'cancelled',
      cancelled_by_side = 'venue',
      cancelled_at = v_now,
      updated_at = v_now
    where id = v_booking.id
    returning *
    into v_booking;

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
      'Venue cancelled the booking for ' || to_char(v_booking.show_date, 'Mon FMDD, YYYY') || '.',
      v_now
    );
  end if;

  if nullif(btrim(coalesce(p_note, '')), '') is not null then
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
      'message',
      btrim(p_note),
      v_now
    );
  end if;

  update public.contact_threads
  set
    last_message_at = v_now,
    venue_last_read_at = v_now
  where id = v_thread.id;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', case when p_action = 'keep' then 'confirmed' else 'cancelled' end,
    'action', case when p_action = 'keep' then 'booking_kept' else 'booking_cancelled' end
  );
end;
$$;

create or replace function public.cancel_confirmed_booking(
  p_thread_id uuid,
  p_note text default null
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
  v_booking public.bookings%rowtype;
  v_venue public.venues%rowtype;
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

  select *
    into v_venue
  from public.venues
  where id = v_thread.venue_id;

  if not found or v_venue.claimed_by_user_id <> v_uid then
    raise exception 'Only the venue owner can cancel a confirmed booking.';
  end if;

  select *
    into v_booking
  from public.bookings
  where thread_id = v_thread.id
    and status in ('confirmed', 'cancellation_requested')
  order by updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'No active booking was found for this conversation.';
  end if;

  update public.bookings
  set
    status = 'cancelled',
    cancelled_by_side = 'venue',
    cancelled_at = v_now,
    updated_at = v_now
  where id = v_booking.id
  returning *
  into v_booking;

  update public.contact_threads
  set
    last_message_at = v_now,
    venue_last_read_at = v_now
  where id = v_thread.id;

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
    'Venue cancelled the booking for ' || to_char(v_booking.show_date, 'Mon FMDD, YYYY') || '.',
    v_now
  );

  if nullif(btrim(coalesce(p_note, '')), '') is not null then
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
      'message',
      btrim(p_note),
      v_now
    );
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', 'cancelled',
    'action', 'booking_cancelled'
  );
end;
$$;

revoke all on function public.request_booking_cancellation(uuid, text) from public;
revoke all on function public.resolve_booking_cancellation(uuid, text, text) from public;
revoke all on function public.cancel_confirmed_booking(uuid, text) from public;

grant execute on function public.request_booking_cancellation(uuid, text) to authenticated;
grant execute on function public.resolve_booking_cancellation(uuid, text, text) to authenticated;
grant execute on function public.cancel_confirmed_booking(uuid, text) to authenticated;
