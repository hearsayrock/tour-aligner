begin;

alter table public.events
  add column cover_photo_path text
    check (cover_photo_path ~ ('^' || id::text || '/[0-9a-f-]{36}[.]jpg$')),
  add column accent_color text check (accent_color ~ '^#[0-9A-Fa-f]{6}$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-covers', 'event-covers', false, 5242880, array['image/jpeg']);

create policy "event covers: read published or participating event cover"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.events event
      where event.cover_photo_path = storage.objects.name
        and (
          event.is_public
          or public.event_is_managed_by_user(event.id, (select auth.uid()))
          or public.event_artist_membership_exists_for_user(
            event.id, (select auth.uid()), array['invited', 'accepted', 'removal_requested']
          )
        )
    )
  );

create policy "event covers: upload as host"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.events event
      where storage.objects.name ~ ('^' || event.id::text || '/[0-9a-f-]{36}[.]jpg$')
        and public.event_is_managed_by_user(event.id, (select auth.uid()))
    )
  );

commit;
