-- Manual rollback for 20260522172524_backfill_confirmed_bookings_to_events.sql.
--
-- This deletes only Events generated from existing confirmed bookings. The
-- original bookings/contact rows are left untouched. Dependent Event genres,
-- memberships, Backstage messages, and read states are removed by cascade.

delete from public.events
where migrated_booking_group_key like 'venue_booking_date:%';
