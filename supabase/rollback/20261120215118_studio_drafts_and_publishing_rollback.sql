begin;
-- Preserve working drafts, uploads, and the publication state for manual recovery.
-- Redeploy the matching previous application before using this rollback.
create schema if not exists studio_recovery;
revoke all on schema studio_recovery from public,anon,authenticated;
create table studio_recovery.publication_20261120215118 as select id,is_active,page_published from public.bands;
alter table public.studio_drafts set schema studio_recovery;
revoke all on studio_recovery.studio_drafts from public,anon,authenticated;
drop policy "Studio owners read drafts" on studio_recovery.studio_drafts;
drop policy "Studio owner uploads" on storage.objects;
drop policy "Studio versioned media read" on storage.objects;
drop function public.studio_media_visible(text);
drop function public.create_studio_artist(uuid,text,jsonb);
drop function public.write_studio(text,uuid,bigint,text,jsonb);
drop function public.studio_owner(text,uuid);
drop trigger studio_locked_artist on public.bands;
drop function public.lock_artist_identity();
-- The previous app uses is_active for public visibility. Keep private artists private.
update public.bands set is_active=false where not page_published and is_active;
alter table public.bands drop column page_published;
-- Keep the private bucket for recovery. Supabase requires the Storage API to
-- remove a bucket, even when it is empty. Both application policies are gone.
commit;
