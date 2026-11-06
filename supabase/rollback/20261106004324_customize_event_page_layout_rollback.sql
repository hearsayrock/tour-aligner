-- Export custom layouts and background settings before rollback if they need to be retained.
-- Background files stay in Storage and lose their read policy when the references are removed.
begin;

alter policy "event covers: read published or participating event cover"
  on storage.objects using (
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

alter table public.events
  drop column page_layout,
  drop column page_background_color,
  drop column background_photo_path,
  drop column background_photo_opacity;

commit;
