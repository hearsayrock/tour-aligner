begin;

alter table public.events
  add column page_layout jsonb check (jsonb_typeof(page_layout) = 'object'),
  add column page_background_color text check (page_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column background_photo_path text
    check (background_photo_path ~ ('^' || id::text || '/[0-9a-f-]{36}[.]jpg$')),
  add column background_photo_opacity smallint not null default 40
    check (background_photo_opacity between 0 and 100);

alter policy "event covers: read published or participating event cover"
  on storage.objects using (
    bucket_id = 'event-covers'
    and exists (
      select 1 from public.events event
      where storage.objects.name in (event.cover_photo_path, event.background_photo_path)
        and (
          event.is_public
          or public.event_is_managed_by_user(event.id, (select auth.uid()))
          or public.event_artist_membership_exists_for_user(
            event.id, (select auth.uid()), array['invited', 'accepted', 'removal_requested']
          )
        )
    )
  );

commit;
