-- Backfill existing confirmed bookings into private Events and Backstages.
--
-- The old bookings/contact data remains intact. Generated rows are marked with
-- events.migrated_booking_group_key so the matching rollback can target only
-- rows created by this migration.

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
  migrated_booking_group_key,
  logistics_notes,
  created_at,
  updated_at
)
select
  booking_group.venue_id,
  venue.claimed_by_user_id,
  'Show at ' || venue.name || ' - ' || to_char(booking_group.show_date, 'Mon FMDD, YYYY'),
  regexp_replace(
    lower(venue.slug || '-' || to_char(booking_group.show_date, 'YYYY-MM-DD') || '-' || left(booking_group.venue_booking_date_id::text, 8)),
    '[^a-z0-9-]+',
    '-',
    'g'
  ),
  booking_group.show_date,
  time '20:00',
  'Migrated from an existing confirmed booking.',
  'This Event was created from existing confirmed booking data during the Event and Backstage migration.',
  coalesce(venue.capacity, 1),
  greatest(coalesce(booking_date.bill_cap, booking_group.confirmed_count), booking_group.confirmed_count, 1),
  false,
  false,
  'active',
  false,
  'venue_booking_date:' || booking_group.venue_booking_date_id::text,
  'Migrated from existing confirmed booking data. Please review load-in, soundcheck, set times, backline, parking/access, and artist bring-list details.',
  booking_group.first_created_at,
  now()
from (
  select
    booking.venue_booking_date_id,
    booking.venue_id,
    min(booking.show_date) as show_date,
    min(booking.created_at) as first_created_at,
    count(*)::integer as confirmed_count
  from public.bookings booking
  where booking.status = 'confirmed'
  group by booking.venue_booking_date_id, booking.venue_id
) booking_group
join public.venues venue on venue.id = booking_group.venue_id
left join public.venue_booking_dates booking_date on booking_date.id = booking_group.venue_booking_date_id
on conflict (migrated_booking_group_key) do nothing;

insert into public.event_artist_memberships (
  event_id,
  band_id,
  status,
  source,
  accepted_at,
  created_at,
  updated_at
)
select distinct on (event.id, booking.band_id)
  event.id,
  booking.band_id,
  'accepted',
  'migration',
  booking.created_at,
  booking.created_at,
  now()
from public.bookings booking
join public.events event
  on event.migrated_booking_group_key = 'venue_booking_date:' || booking.venue_booking_date_id::text
where booking.status = 'confirmed'
on conflict (event_id, band_id) do nothing;

insert into public.event_genres (event_id, genre_id)
select distinct
  event.id,
  band_genre.genre_id
from public.events event
join public.event_artist_memberships member on member.event_id = event.id
join public.band_genres band_genre on band_genre.band_id = member.band_id
where event.migrated_booking_group_key like 'venue_booking_date:%'
on conflict do nothing;

insert into public.event_genres (event_id, genre_id)
select distinct
  event.id,
  venue_genre.genre_id
from public.events event
join public.venue_genres venue_genre on venue_genre.venue_id = event.venue_id
where event.migrated_booking_group_key like 'venue_booking_date:%'
  and not exists (
    select 1
    from public.event_genres existing
    where existing.event_id = event.id
  )
on conflict do nothing;

insert into public.backstage_messages (
  event_id,
  sender_user_id,
  sender_kind,
  sender_band_id,
  body,
  created_at
)
select
  event.id,
  event.created_by_user_id,
  'system',
  null,
  'TourAligner created this Backstage from existing confirmed booking data.',
  event.created_at
from public.events event
where event.migrated_booking_group_key like 'venue_booking_date:%'
  and not exists (
    select 1
    from public.backstage_messages message
    where message.event_id = event.id
      and message.sender_kind = 'system'
      and message.body = 'TourAligner created this Backstage from existing confirmed booking data.'
  );
