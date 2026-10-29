begin;
drop function if exists public.search_artist_directory(uuid, text, text, uuid, text, text);
-- Removing the feature also removes saved follow relationships.
drop table if exists public.artist_follows;
commit;
