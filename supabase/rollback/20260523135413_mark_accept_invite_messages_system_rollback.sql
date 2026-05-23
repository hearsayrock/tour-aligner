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

update public.backstage_messages message
set
  sender_kind = 'artist',
  sender_band_id = band.id
from public.bands band
where message.sender_kind = 'system'
  and message.sender_user_id = band.user_id
  and message.sender_band_id is null
  and message.body = band.name || ' accepted the invite and joined Backstage.';
