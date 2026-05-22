-- Manual rollback for 20260522172523_event_backstage_schema.sql.
--
-- This removes the Event and Backstage schema introduced by the migration.
-- Run only as an explicit manual recovery step, not through the normal
-- Supabase forward migration chain.

drop table if exists public.backstage_read_states cascade;
drop table if exists public.backstage_messages cascade;
drop table if exists public.event_artist_memberships cascade;
drop table if exists public.event_genres cascade;
drop table if exists public.events cascade;
