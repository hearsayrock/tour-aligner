begin;

drop function public.decline_event_invite(uuid);
drop function public.invite_artist_to_event(uuid, uuid, text);

-- Export invitation notes before running this rollback if they need to be retained.
alter table public.event_artist_memberships drop column invitation_note;

alter table public.events
  add column logistics_load_in text,
  add column logistics_soundcheck text,
  add column logistics_set_times text,
  add column logistics_backline text,
  add column logistics_artist_should_bring text,
  add column logistics_parking_access text,
  add column logistics_notes text;

update public.events event
set logistics_load_in = logistics.load_in,
    logistics_soundcheck = logistics.soundcheck,
    logistics_set_times = logistics.set_times,
    logistics_backline = logistics.backline,
    logistics_artist_should_bring = logistics.artist_should_bring,
    logistics_parking_access = logistics.parking_access,
    logistics_notes = logistics.notes
from public.event_logistics logistics
where event.id = logistics.event_id;

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
  v_event public.events%rowtype;
  v_event_title text;
  v_slug_base text;
  v_slug_candidate text;
  v_slug_suffix integer := 2;
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

  if v_show_date < current_date then
    raise exception 'Cannot confirm a booking for a date that has already passed.';
  end if;

  if exists (
    select 1
    from public.bookings
    where band_id = v_thread.band_id
      and venue_id = v_thread.venue_id
      and show_date = v_show_date
      and status in ('confirmed', 'cancellation_requested')
  ) then
    raise exception 'This artist is already booked for that date at this venue.';
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

    -- Block booking if the date was pre-closed via the calendar editor, regardless of
    -- how many bands are already confirmed. Previously this guard required count > 0,
    -- which allowed the first booking through even on a manually-closed date.
    if v_booking_date.is_closed_to_more_bands then
      raise exception 'This date is closed to more bands.';
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
    and status in ('confirmed', 'cancellation_requested');

  if v_confirmed_count >= v_booking_date.bill_cap then
    raise exception 'This date has already reached its bill cap.';
  end if;

  -- Get-or-create the Event this booking belongs to. v_booking_date is
  -- already row-locked above (either freshly inserted or SELECT ... FOR
  -- UPDATE), which serializes concurrent confirmations for the same
  -- venue+date, so this lookup-then-insert is race-free without needing
  -- ON CONFLICT handling.
  select *
    into v_event
  from public.events
  where venue_booking_date_id = v_booking_date.id;

  if found and v_event.status = 'cancelled' then
    raise exception 'A cancelled event cannot accept artists.';
  end if;

  if not found then
    v_event_title := 'Show at ' || v_venue.name || ' - ' || to_char(v_show_date, 'Mon FMDD, YYYY');
    v_slug_base := regexp_replace(
      lower(v_event_title || '-' || v_show_date::text),
      '[^a-z0-9]+',
      '-',
      'g'
    );
    v_slug_base := trim(both '-' from v_slug_base);
    v_slug_candidate := v_slug_base;

    while exists (select 1 from public.events where slug = v_slug_candidate) loop
      v_slug_candidate := v_slug_base || '-' || v_slug_suffix;
      v_slug_suffix := v_slug_suffix + 1;
    end loop;

    insert into public.events (
      venue_id,
      created_by_user_id,
      title,
      slug,
      event_date,
      start_time,
      artist_need_description,
      description,
      attendee_capacity,
      needed_artist_count,
      is_public,
      is_accepting_artists,
      status,
      lineup_published,
      venue_booking_date_id,
      logistics_notes,
      created_at,
      updated_at
    ) values (
      v_thread.venue_id,
      v_venue.claimed_by_user_id,
      v_event_title,
      v_slug_candidate,
      v_show_date,
      time '20:00',
      'Auto-created when a booking was confirmed. Please review artist requirements.',
      'This event was created automatically when a booking was confirmed. Please review load-in, soundcheck, set times, backline, parking/access, and artist bring-list details.',
      coalesce(v_venue.capacity, 1),
      coalesce(v_booking_date.bill_cap, 1),
      false,
      false,
      'active',
      false,
      v_booking_date.id,
      'Auto-created when this booking was confirmed. Please review load-in, soundcheck, set times, backline, parking/access, and artist bring-list details.',
      v_now,
      v_now
    )
    returning *
    into v_event;

    insert into public.backstage_messages (
      event_id,
      sender_user_id,
      sender_kind,
      sender_band_id,
      body,
      created_at
    ) values (
      v_event.id,
      v_venue.claimed_by_user_id,
      'system',
      null,
      'TourAligner created this Backstage automatically when the booking was confirmed.',
      v_now
    );
  end if;

  insert into public.bookings (
    thread_id,
    band_id,
    venue_id,
    show_date,
    venue_booking_date_id,
    event_id,
    status,
    created_at,
    updated_at
  ) values (
    v_thread.id,
    v_thread.band_id,
    v_thread.venue_id,
    v_show_date,
    v_booking_date.id,
    v_event.id,
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
    'action', 'booking_confirmed',
    'event_id', v_event.id,
    'event_slug', v_event.slug
  );
end;
$$;

drop table public.event_logistics;

alter policy "backstage_messages: insert accepted members"
  on public.backstage_messages
  with check (
    body <> ''
    and (
      (
        sender_kind = 'venue'
        and sender_user_id = auth.uid()
        and sender_band_id is null
        and public.event_is_managed_by_user(event_id, auth.uid())
      )
      or
      (
        sender_kind = 'artist'
        and sender_user_id = auth.uid()
        and sender_band_id is not null
        and exists (
          select 1
          from public.event_artist_memberships member
          join public.bands band on band.id = member.band_id
          where member.event_id = event_id
            and member.band_id = sender_band_id
            and member.status in ('accepted', 'removal_requested')
            and band.user_id = auth.uid()
        )
      )
      or
      (
        sender_kind = 'system'
        and sender_user_id = auth.uid()
        and sender_band_id is null
        and public.event_is_managed_by_user(event_id, auth.uid())
      )
      or public.is_admin()
    )
  );

commit;
