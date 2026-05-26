drop policy if exists "events: select public or participants" on public.events;
drop policy if exists "event_genres: select visible events" on public.event_genres;
drop policy if exists "event_genres: manage claimed venue events" on public.event_genres;
drop policy if exists "event_artist_memberships: select participants" on public.event_artist_memberships;
drop policy if exists "event_artist_memberships: insert applications or invites" on public.event_artist_memberships;
drop policy if exists "event_artist_memberships: update venue owner" on public.event_artist_memberships;
drop policy if exists "event_artist_memberships: delete venue owner" on public.event_artist_memberships;
drop policy if exists "backstage_messages: select accepted members" on public.backstage_messages;
drop policy if exists "backstage_messages: insert accepted members" on public.backstage_messages;
drop policy if exists "backstage_read_states: upsert own participant" on public.backstage_read_states;

create policy "events: select public or participants"
  on public.events for select
  using (
    is_public
    or auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or exists (
      select 1
      from public.event_artist_memberships member
      join public.bands band on band.id = member.band_id
      where member.event_id = events.id
        and band.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "event_genres: select visible events"
  on public.event_genres for select
  using (
    exists (
      select 1
      from public.events event
      where event.id = event_id
        and (
          event.is_public
          or auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
          or exists (
            select 1
            from public.event_artist_memberships member
            join public.bands band on band.id = member.band_id
            where member.event_id = event.id
              and band.user_id = auth.uid()
          )
          or public.is_admin()
        )
    )
  );

create policy "event_genres: manage claimed venue events"
  on public.event_genres for all
  to authenticated
  using (
    exists (
      select 1
      from public.events event
      where event.id = event_id
        and (
          auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
          or public.is_admin()
        )
    )
  )
  with check (
    exists (
      select 1
      from public.events event
      where event.id = event_id
        and (
          auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
          or public.is_admin()
        )
    )
  );

create policy "event_artist_memberships: select participants"
  on public.event_artist_memberships for select
  to authenticated
  using (
    auth.uid() = (select user_id from public.bands where id = band_id)
    or exists (
      select 1
      from public.events event
      where event.id = event_id
        and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
    )
    or public.is_admin()
  );

create policy "event_artist_memberships: insert applications or invites"
  on public.event_artist_memberships for insert
  to authenticated
  with check (
    (
      status = 'applied'
      and source = 'application'
      and auth.uid() = (select user_id from public.bands where id = band_id)
      and exists (
        select 1
        from public.events event
        where event.id = event_id
          and event.is_public
          and event.is_accepting_artists
          and event.status in ('draft', 'active')
      )
    )
    or
    (
      status = 'invited'
      and source = 'invitation'
      and exists (
        select 1
        from public.events event
        where event.id = event_id
          and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
      )
    )
    or public.is_admin()
  );

create policy "event_artist_memberships: update venue owner"
  on public.event_artist_memberships for update
  to authenticated
  using (
    exists (
      select 1
      from public.events event
      where event.id = event_id
        and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1
      from public.events event
      where event.id = event_id
        and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
    )
    or public.is_admin()
  );

create policy "event_artist_memberships: delete venue owner"
  on public.event_artist_memberships for delete
  to authenticated
  using (
    exists (
      select 1
      from public.events event
      where event.id = event_id
        and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
    )
    or public.is_admin()
  );

create policy "backstage_messages: select accepted members"
  on public.backstage_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.events event
      where event.id = event_id
        and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
    )
    or exists (
      select 1
      from public.event_artist_memberships member
      join public.bands band on band.id = member.band_id
      where member.event_id = event_id
        and member.status in ('accepted', 'removal_requested')
        and band.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "backstage_messages: insert accepted members"
  on public.backstage_messages for insert
  to authenticated
  with check (
    body <> ''
    and (
      (
        sender_kind = 'venue'
        and sender_user_id = auth.uid()
        and sender_band_id is null
        and exists (
          select 1
          from public.events event
          where event.id = event_id
            and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
        )
      )
      or
      (
        sender_kind = 'artist'
        and sender_user_id = auth.uid()
        and sender_band_id is not null
        and exists (
          select 1
          from public.event_artist_memberships member
          join public.bands band on band.id = member.band_id
          where member.event_id = event_id
            and member.band_id = sender_band_id
            and member.status in ('accepted', 'removal_requested')
            and band.user_id = auth.uid()
        )
      )
      or
      (
        sender_kind = 'system'
        and sender_user_id = auth.uid()
        and sender_band_id is null
        and exists (
          select 1
          from public.events event
          where event.id = event_id
            and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
        )
      )
      or public.is_admin()
    )
  );

create policy "backstage_read_states: upsert own participant"
  on public.backstage_read_states for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1
        from public.events event
        where event.id = event_id
          and auth.uid() = (select claimed_by_user_id from public.venues where id = event.venue_id)
      )
      or exists (
        select 1
        from public.event_artist_memberships member
        join public.bands band on band.id = member.band_id
        where member.event_id = event_id
          and member.status in ('accepted', 'removal_requested')
          and band.user_id = auth.uid()
      )
      or public.is_admin()
    )
  );

drop function if exists public.event_artist_membership_exists_for_user(uuid, uuid, text[]);
drop function if exists public.event_accepts_artist_applications(uuid);
drop function if exists public.event_is_managed_by_user(uuid, uuid);
drop function if exists public.event_is_visible_to_user(uuid, uuid, boolean, uuid);
