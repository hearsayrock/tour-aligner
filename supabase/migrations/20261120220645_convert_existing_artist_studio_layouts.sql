begin;
-- Only presentation metadata is converted. The existing photos, music, shows,
-- bookings, lyrics, genres and profile blocks stay in their canonical records.
create schema if not exists studio_recovery;
revoke all on schema studio_recovery from public, anon, authenticated;
create table studio_recovery.artist_looks_20261120220645 as
select id, profile_theme, profile_photo_url, cover_photo_url, profile_background_url
from public.bands;
revoke all on studio_recovery.artist_looks_20261120220645 from public, anon, authenticated;
update public.bands
set profile_theme = jsonb_build_object('studio',
  jsonb_strip_nulls(jsonb_build_object('version',1,'preset','basement','layout','poster',
    'accent',case when profile_theme->>'accent' ~ '^#[0-9a-fA-F]{6}$' then profile_theme->>'accent' end,
    'tabs',jsonb_build_array('home','music','shows','about'))) || coalesce(profile_theme->'studio','{}'::jsonb));
commit;
