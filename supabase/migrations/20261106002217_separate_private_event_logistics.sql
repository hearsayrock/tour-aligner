begin;

create table public.event_logistics (
  event_id uuid primary key references public.events(id) on delete cascade,
  load_in text,
  soundcheck text,
  set_times text,
  backline text,
  artist_should_bring text,
  parking_access text,
  notes text
);

alter table public.event_logistics enable row level security;
revoke all on public.event_logistics from public, anon, authenticated;
grant select, insert, update on public.event_logistics to authenticated;

create policy "event logistics: read as host or participating artist"
  on public.event_logistics for select to authenticated
  using (
    public.event_is_managed_by_user(event_id, (select auth.uid()))
    or public.event_artist_membership_exists_for_user(
      event_id, (select auth.uid()), array['invited', 'accepted', 'removal_requested']
    )
  );

create policy "event logistics: insert as host"
  on public.event_logistics for insert to authenticated
  with check (public.event_is_managed_by_user(event_id, (select auth.uid())));

create policy "event logistics: update as host"
  on public.event_logistics for update to authenticated
  using (public.event_is_managed_by_user(event_id, (select auth.uid())))
  with check (public.event_is_managed_by_user(event_id, (select auth.uid())));

-- Lock writes before copying so a concurrent edit cannot be lost during the move.
lock table public.events in access exclusive mode;

insert into public.event_logistics (
  event_id, load_in, soundcheck, set_times, backline, artist_should_bring, parking_access, notes
)
select id, logistics_load_in, logistics_soundcheck, logistics_set_times, logistics_backline,
       logistics_artist_should_bring, logistics_parking_access, logistics_notes
from public.events
where coalesce(logistics_load_in, logistics_soundcheck, logistics_set_times, logistics_backline,
               logistics_artist_should_bring, logistics_parking_access, logistics_notes) is not null;

-- The booking confirmation function also creates events and writes a logistics note.
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
      v_now,
      v_now
    )
    returning *
    into v_event;

    insert into public.event_logistics (event_id, notes)
    values (v_event.id, 'Auto-created when this booking was confirmed. Please review load-in, soundcheck, set times, backline, parking/access, and artist bring-list details.');

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

alter table public.events
  drop column logistics_load_in,
  drop column logistics_soundcheck,
  drop column logistics_set_times,
  drop column logistics_backline,
  drop column logistics_artist_should_bring,
  drop column logistics_parking_access,
  drop column logistics_notes;

alter table public.event_artist_memberships
  add column invitation_note text;

-- Store the invitation with the Event, independently of private chat requests.
create function public.invite_artist_to_event(p_event_id uuid, p_band_id uuid, p_note text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_venue_id uuid;
begin
  select venue_id into v_venue_id
  from public.events
  where id = p_event_id and status in ('draft', 'active');

  if v_venue_id is null or not public.event_is_managed_by_user(p_event_id, (select auth.uid())) then
    raise exception 'You can only invite artists to a draft or active event you host.';
  end if;

  if exists (
    select 1 from public.private_chat_threads thread
    where thread.status = 'blocked'
      and (
        (thread.participant_one_kind = 'venue' and thread.participant_one_id = v_venue_id
         and thread.participant_two_kind = 'band' and thread.participant_two_id = p_band_id)
        or
        (thread.participant_one_kind = 'band' and thread.participant_one_id = p_band_id
         and thread.participant_two_kind = 'venue' and thread.participant_two_id = v_venue_id)
      )
  ) then
    raise exception 'Contact is blocked between these profiles.';
  end if;

  insert into public.event_artist_memberships as membership (
    event_id, band_id, status, source, invited_at, invitation_note
  )
  values (p_event_id, p_band_id, 'invited', 'invitation', now(), nullif(btrim(p_note), ''))
  on conflict (event_id, band_id) do update
    set status = excluded.status,
        source = excluded.source,
        invited_at = excluded.invited_at,
        invitation_note = excluded.invitation_note
    where membership.status in ('declined', 'removed');

  if not found then
    raise exception 'This artist already has an application, invitation, or spot on the bill.';
  end if;
end;
$$;

revoke all on function public.invite_artist_to_event(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.invite_artist_to_event(uuid, uuid, text) to authenticated;

create function public.decline_event_invite(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.event_artist_memberships membership
  set status = 'declined', declined_at = now()
  where membership.id = p_membership_id
    and membership.status = 'invited'
    and exists (
      select 1 from public.bands band
      where band.id = membership.band_id and band.user_id = (select auth.uid())
    );

  if not found then
    raise exception 'This invitation is no longer available.';
  end if;
end;
$$;

revoke all on function public.decline_event_invite(uuid) from public, anon, authenticated;
grant execute on function public.decline_event_invite(uuid) to authenticated;

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
          where member.event_id = backstage_messages.event_id
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
