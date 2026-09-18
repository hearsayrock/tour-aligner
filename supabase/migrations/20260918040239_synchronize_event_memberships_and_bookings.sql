-- Both entry paths share a booking ledger. Events do not require a conversation.
begin;
alter table public.bookings alter column thread_id drop not null;
-- Deleting a conversation must not erase a confirmed event commitment.
alter table public.bookings drop constraint bookings_thread_id_fkey;
alter table public.bookings add constraint bookings_thread_id_fkey
  foreign key (thread_id) references public.contact_threads(id) on delete set null;

create unique index bookings_active_event_artist_unique
  on public.bookings(event_id, band_id)
  where event_id is not null and status in ('confirmed', 'cancellation_requested');

-- Internal only: called by triggers and this migration, never by API clients.
create function public.sync_event_membership_booking(p_membership_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.event_artist_memberships%rowtype;
  e public.events%rowtype;
  d public.venue_booking_dates%rowtype;
  b public.bookings%rowtype;
  target_status text;
  used_slots integer;
begin
  select * into m from public.event_artist_memberships where id = p_membership_id;
  if not found then return; end if;
  select * into e from public.events where id = m.event_id for update;
  if not found then return; end if;

  if m.status not in ('accepted', 'removal_requested') or e.status = 'cancelled' then
    update public.bookings set status = 'cancelled', cancelled_at = now(),
      cancelled_by_side = 'venue', cancellation_requested_at = null,
      cancellation_requested_by_side = null
    where event_id = e.id and band_id = m.band_id
      and status in ('confirmed', 'cancellation_requested');
    return;
  end if;

  target_status := case when m.status = 'removal_requested'
    then 'cancellation_requested' else 'confirmed' end;
  insert into public.venue_booking_dates(venue_id, show_date, bill_cap)
    select e.venue_id, e.event_date, greatest(e.needed_artist_count, v.default_bill_cap)
    from public.venues v where v.id = e.venue_id
    on conflict (venue_id, show_date) do nothing;
  select * into d from public.venue_booking_dates
    where venue_id = e.venue_id and show_date = e.event_date for update;

  -- An event owns a venue/date. Never silently attach an artist to another event.
  if exists (select 1 from public.events other
    where other.venue_booking_date_id = d.id and other.id <> e.id) then
    raise exception 'Another event already uses this venue and date.';
  end if;
  if e.venue_booking_date_id is distinct from d.id then
    update public.events set venue_booking_date_id = d.id where id = e.id;
  end if;

  select * into b from public.bookings
    where event_id = e.id and band_id = m.band_id
      and status in ('confirmed', 'cancellation_requested') for update;
  if not found then
    select * into b from public.bookings
      where band_id = m.band_id and venue_id = e.venue_id and show_date = e.event_date
        and status in ('confirmed', 'cancellation_requested') for update;
    if found and b.event_id is not null and b.event_id <> e.id then
      raise exception 'This artist is already booked for that date at this venue.';
    end if;
  end if;

  -- Existing commitments can be kept/cancelled even after the bill is closed.
  if b.id is null or b.venue_booking_date_id <> d.id then
    if d.is_unavailable then raise exception 'This date is marked unavailable.'; end if;
    if d.is_closed_to_more_bands then raise exception 'This date is closed to more bands.'; end if;
    select count(*) into used_slots from public.bookings
      where venue_booking_date_id = d.id and status in ('confirmed', 'cancellation_requested');
    if used_slots >= d.bill_cap then raise exception 'This date has already reached its bill cap.'; end if;
  end if;

  if b.id is null then
    insert into public.bookings(band_id, venue_id, show_date, venue_booking_date_id,
      event_id, status, cancellation_requested_by_side, cancellation_requested_at)
    values(m.band_id, e.venue_id, e.event_date, d.id, e.id, target_status,
      case when target_status = 'cancellation_requested' then 'band' end,
      case when target_status = 'cancellation_requested' then now() end);
  else
    update public.bookings set event_id = e.id, venue_id = e.venue_id,
      show_date = e.event_date, venue_booking_date_id = d.id, status = target_status,
      cancellation_requested_by_side = case when target_status = 'cancellation_requested' then 'band' end,
      cancellation_requested_at = case when target_status = 'cancellation_requested'
        then coalesce(cancellation_requested_at, now()) end
      where id = b.id;
  end if;
end;
$$;
revoke all on function public.sync_event_membership_booking(uuid) from public, anon, authenticated;

create function public.sync_membership_booking_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- The reciprocal trigger already performed its half of the synchronization.
  if pg_trigger_depth() > 1 then return null; end if;
  if TG_OP = 'DELETE' then
    update public.bookings set status = 'cancelled', cancelled_at = now(), cancelled_by_side = 'venue',
      cancellation_requested_at = null, cancellation_requested_by_side = null
    where event_id = OLD.event_id and band_id = OLD.band_id
      and status in ('confirmed', 'cancellation_requested');
  else
    if TG_OP = 'UPDATE' and (OLD.event_id <> NEW.event_id or OLD.band_id <> NEW.band_id) then
      raise exception 'An event membership cannot be moved to another artist or event.';
    end if;
    if NEW.status in ('accepted', 'removal_requested') and exists (
      select 1 from public.events where id = NEW.event_id and status = 'cancelled'
    ) then raise exception 'A cancelled event cannot accept artists.'; end if;
    perform public.sync_event_membership_booking(NEW.id);
  end if;
  return null;
end;
$$;
create trigger sync_membership_booking
  after insert or update or delete on public.event_artist_memberships
  for each row execute function public.sync_membership_booking_trigger();

create function public.sync_booking_membership_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare membership_status text;
begin
  if pg_trigger_depth() > 1 or NEW.event_id is null then return null; end if;
  membership_status := case NEW.status when 'confirmed' then 'accepted'
    when 'cancellation_requested' then 'removal_requested' else 'removed' end;
  insert into public.event_artist_memberships(event_id, band_id, status, source,
    accepted_at, removal_requested_at, removed_at)
  values(NEW.event_id, NEW.band_id, membership_status, 'manual',
    case when NEW.status <> 'cancelled' then now() end,
    case when NEW.status = 'cancellation_requested' then now() end,
    case when NEW.status = 'cancelled' then now() end)
  on conflict (event_id, band_id) do update set
    status = excluded.status,
    accepted_at = coalesce(public.event_artist_memberships.accepted_at, excluded.accepted_at),
    removal_requested_at = excluded.removal_requested_at,
    removed_at = excluded.removed_at;
  return null;
end;
$$;
create trigger sync_booking_membership
  after insert or update of status on public.bookings
  for each row execute function public.sync_booking_membership_trigger();

create function public.sync_event_bookings_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  -- Changing the event does not edit the shared date row used by other bookings.
  for m in select id from public.event_artist_memberships
    where event_id = NEW.id and status in ('accepted', 'removal_requested') order by id
  loop
    perform public.sync_event_membership_booking(m.id);
  end loop;
  if NEW.status = 'cancelled' then
    update public.event_artist_memberships set status = 'removed', removed_at = now()
      where event_id = NEW.id and status in ('accepted', 'removal_requested');
  end if;
  return null;
end;
$$;
create trigger sync_event_bookings
  after update of event_date, venue_id, status on public.events
  for each row when (OLD.event_date is distinct from NEW.event_date
    or OLD.venue_id is distinct from NEW.venue_id or OLD.status is distinct from NEW.status)
  execute function public.sync_event_bookings_trigger();

-- Cancel before the FK clears event_id, preserving the ledger without ghost shows.
create function public.cancel_deleted_event_bookings_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.bookings set status = 'cancelled', cancelled_at = now(),
    cancelled_by_side = 'venue', cancellation_requested_at = null,
    cancellation_requested_by_side = null
    where event_id = OLD.id and status in ('confirmed', 'cancellation_requested');
  return OLD;
end;
$$;
create trigger cancel_deleted_event_bookings before delete on public.events
  for each row execute function public.cancel_deleted_event_bookings_trigger();
revoke all on function public.cancel_deleted_event_bookings_trigger() from public, anon, authenticated;

revoke all on function public.sync_membership_booking_trigger() from public, anon, authenticated;
revoke all on function public.sync_booking_membership_trigger() from public, anon, authenticated;
revoke all on function public.sync_event_bookings_trigger() from public, anon, authenticated;

-- Insert the booking first; its trigger creates the membership without a second booking.
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

-- Expose only lineup fields. Membership notes and applications remain private.
create function public.get_public_event_lineup(p_event_id uuid)
returns table(membership_id uuid, band_id uuid, artist_name text, artist_slug text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.band_id, b.name, b.slug
  from public.event_artist_memberships m
  join public.events e on e.id = m.event_id
  join public.bands b on b.id = m.band_id
  where e.id = p_event_id and e.is_public and e.lineup_published
    and e.status in ('draft', 'active') and b.is_active
    and m.status in ('accepted', 'removal_requested')
  order by m.accepted_at, m.id
$$;
revoke all on function public.get_public_event_lineup(uuid) from public;
grant execute on function public.get_public_event_lineup(uuid) to anon, authenticated;

-- Reconcile existing commitments. Fail atomically on conflicts rather than discard data.
-- Preserve pending cancellation requests recorded by the old Inbox-only lifecycle.
update public.event_artist_memberships m
  set status = 'removal_requested', removal_requested_at = b.cancellation_requested_at
  from public.bookings b, public.events e
  where m.event_id = e.id and m.band_id = b.band_id and m.status = 'accepted'
    and b.status = 'cancellation_requested'
    and (b.event_id = e.id or (b.event_id is null and b.venue_id = e.venue_id and b.show_date = e.event_date));
-- A cancellation newer than the acceptance must not be resurrected by the backfill.
update public.event_artist_memberships m set status = 'removed', removed_at = b.cancelled_at
  from public.bookings b, public.events e
  where m.event_id = e.id and m.band_id = b.band_id
    and m.status in ('accepted', 'removal_requested') and b.status = 'cancelled'
    and b.cancelled_at is not null and (m.accepted_at is null or m.accepted_at <= b.cancelled_at)
    and (b.event_id = e.id or (b.event_id is null and b.venue_id = e.venue_id and b.show_date = e.event_date))
    and not exists (select 1 from public.bookings active_booking
      where active_booking.band_id = m.band_id and active_booking.venue_id = e.venue_id
        and active_booking.show_date = e.event_date
        and active_booking.status in ('confirmed', 'cancellation_requested'));
update public.event_artist_memberships m set status = 'removed', removed_at = now()
  from public.events e where m.event_id = e.id and e.status = 'cancelled'
    and m.status in ('accepted', 'removal_requested');
do $$ declare m record; begin
  for m in select membership.id from public.event_artist_memberships membership
    where membership.status in ('accepted', 'removal_requested')
      or exists (select 1 from public.bookings b
        where b.event_id = membership.event_id and b.band_id = membership.band_id
          and b.status in ('confirmed', 'cancellation_requested'))
    order by membership.event_id, membership.id
  loop perform public.sync_event_membership_booking(m.id); end loop;
end $$;
commit;
