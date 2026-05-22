-- TourAligner - Event and Backstage workflow

create table public.events (
  id                          uuid primary key default gen_random_uuid(),
  venue_id                    uuid not null references public.venues(id) on delete cascade,
  created_by_user_id          uuid references public.profiles(id) on delete set null,
  title                       text not null,
  slug                        text not null unique,
  event_date                  date not null,
  start_time                  time not null,
  artist_need_description     text not null,
  description                 text not null,
  attendee_capacity           integer not null check (attendee_capacity > 0),
  needed_artist_count         integer not null check (needed_artist_count > 0),
  is_public                   boolean not null default false,
  is_accepting_artists        boolean not null default true,
  status                      text not null default 'draft'
                                check (status in ('draft', 'active', 'completed', 'cancelled')),
  lineup_published            boolean not null default false,
  migrated_booking_group_key  text unique,
  logistics_load_in           text,
  logistics_soundcheck        text,
  logistics_set_times         text,
  logistics_backline          text,
  logistics_artist_should_bring text,
  logistics_parking_access    text,
  logistics_notes             text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index events_venue_id_idx on public.events(venue_id, event_date);
create index events_public_discovery_idx
  on public.events(is_public, is_accepting_artists, status, event_date);
create index events_migrated_booking_group_key_idx
  on public.events(migrated_booking_group_key)
  where migrated_booking_group_key is not null;

create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

create table public.event_genres (
  event_id uuid not null references public.events(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (event_id, genre_id)
);

create index event_genres_genre_id_idx on public.event_genres(genre_id, event_id);

create table public.event_artist_memberships (
  id                         uuid primary key default gen_random_uuid(),
  event_id                   uuid not null references public.events(id) on delete cascade,
  band_id                    uuid not null references public.bands(id) on delete cascade,
  status                     text not null
                               check (status in ('applied', 'invited', 'accepted', 'declined', 'removed', 'removal_requested')),
  source                     text not null default 'application'
                               check (source in ('application', 'invitation', 'migration', 'manual')),
  application_note           text,
  invite_note                text,
  removal_note               text,
  applied_at                 timestamptz,
  invited_at                 timestamptz,
  accepted_at                timestamptz,
  declined_at                timestamptz,
  removed_at                 timestamptz,
  removal_requested_at       timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint event_artist_memberships_unique unique (event_id, band_id)
);

create index event_artist_memberships_event_status_idx
  on public.event_artist_memberships(event_id, status, updated_at desc);
create index event_artist_memberships_band_status_idx
  on public.event_artist_memberships(band_id, status, updated_at desc);

create trigger set_event_artist_memberships_updated_at
  before update on public.event_artist_memberships
  for each row execute procedure public.set_updated_at();

create table public.backstage_messages (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  sender_user_id  uuid references public.profiles(id) on delete set null,
  sender_kind     text not null check (sender_kind in ('venue', 'artist', 'system')),
  sender_band_id  uuid references public.bands(id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index backstage_messages_event_created_idx
  on public.backstage_messages(event_id, created_at);

create table public.backstage_read_states (
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.events enable row level security;
alter table public.event_genres enable row level security;
alter table public.event_artist_memberships enable row level security;
alter table public.backstage_messages enable row level security;
alter table public.backstage_read_states enable row level security;

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

create policy "events: insert claimed venue owner"
  on public.events for insert
  to authenticated
  with check (
    auth.uid() = created_by_user_id
    and auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

create policy "events: update claimed venue owner"
  on public.events for update
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  )
  with check (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
    or public.is_admin()
  );

create policy "events: delete claimed venue owner"
  on public.events for delete
  to authenticated
  using (
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
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

create or replace function public.accept_event_invite(p_membership_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_membership public.event_artist_memberships%rowtype;
  v_event public.events%rowtype;
  v_band public.bands%rowtype;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select *
    into v_membership
  from public.event_artist_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'Event invite not found.';
  end if;

  select *
    into v_band
  from public.bands
  where id = v_membership.band_id;

  if v_band.user_id <> v_uid then
    raise exception 'You do not own this artist profile.';
  end if;

  if v_membership.status <> 'invited' then
    raise exception 'Only invited artists can accept this invite.';
  end if;

  select *
    into v_event
  from public.events
  where id = v_membership.event_id;

  update public.event_artist_memberships
  set
    status = 'accepted',
    accepted_at = v_now
  where id = p_membership_id;

  insert into public.backstage_messages (
    event_id,
    sender_user_id,
    sender_kind,
    sender_band_id,
    body,
    created_at
  ) values (
    v_membership.event_id,
    v_uid,
    'artist',
    v_membership.band_id,
    v_band.name || ' accepted the invite and joined Backstage.',
    v_now
  );

  return jsonb_build_object(
    'event_id', v_event.id,
    'slug', v_event.slug,
    'action', 'invite_accepted'
  );
end;
$$;

create or replace function public.request_event_removal(
  p_membership_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_membership public.event_artist_memberships%rowtype;
  v_event public.events%rowtype;
  v_band public.bands%rowtype;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  select *
    into v_membership
  from public.event_artist_memberships
  where id = p_membership_id
  for update;

  if not found then
    raise exception 'Event membership not found.';
  end if;

  select *
    into v_band
  from public.bands
  where id = v_membership.band_id;

  if v_band.user_id <> v_uid then
    raise exception 'You do not own this artist profile.';
  end if;

  if v_membership.status <> 'accepted' then
    raise exception 'Only accepted artists can request removal.';
  end if;

  select *
    into v_event
  from public.events
  where id = v_membership.event_id;

  update public.event_artist_memberships
  set
    status = 'removal_requested',
    removal_requested_at = v_now,
    removal_note = v_note
  where id = p_membership_id;

  insert into public.backstage_messages (
    event_id,
    sender_user_id,
    sender_kind,
    sender_band_id,
    body,
    created_at
  ) values (
    v_membership.event_id,
    v_uid,
    'artist',
    v_membership.band_id,
    case
      when v_note is null then v_band.name || ' requested removal from this Backstage.'
      else v_band.name || ' requested removal from this Backstage. Note: ' || v_note
    end,
    v_now
  );

  return jsonb_build_object(
    'event_id', v_event.id,
    'slug', v_event.slug,
    'action', 'removal_requested'
  );
end;
$$;

revoke all on function public.accept_event_invite(uuid) from public;
revoke all on function public.request_event_removal(uuid, text) from public;
grant execute on function public.accept_event_invite(uuid) to authenticated;
grant execute on function public.request_event_removal(uuid, text) to authenticated;

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

create policy "backstage_read_states: select own"
  on public.backstage_read_states for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

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
