-- ============================================================
-- TourAligner — Request contact working date
-- Migration: 20260417180038
-- ============================================================

create or replace function public.request_contact(
  p_band_id uuid,
  p_venue_id uuid,
  p_initiator_side text,
  p_body text,
  p_show_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_body text := btrim(coalesce(p_body, ''));
  v_thread public.contact_threads%rowtype;
  v_band_owner uuid;
  v_venue_owner uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if p_initiator_side not in ('band', 'venue') then
    raise exception 'Invalid initiator side.';
  end if;

  if v_body = '' then
    raise exception 'A short introduction is required.';
  end if;

  select user_id
    into v_band_owner
  from public.bands
  where id = p_band_id
    and is_active = true;

  if v_band_owner is null then
    raise exception 'Band not found.';
  end if;

  select claimed_by_user_id
    into v_venue_owner
  from public.venues
  where id = p_venue_id
    and is_active = true;

  if v_venue_owner is null then
    raise exception 'Only claimed venues can use inbox contact requests.';
  end if;

  if v_band_owner = v_venue_owner then
    raise exception 'You cannot start a conversation with yourself.';
  end if;

  if p_initiator_side = 'band' and v_band_owner <> v_uid then
    raise exception 'You do not own this band.';
  end if;

  if p_initiator_side = 'venue' and v_venue_owner <> v_uid then
    raise exception 'You do not own this venue.';
  end if;

  select *
    into v_thread
  from public.contact_threads
  where band_id = p_band_id
    and venue_id = p_venue_id
  for update;

  if found then
    if v_thread.status = 'blocked' then
      raise exception 'Contact is currently blocked for this artist and venue.';
    end if;

    if v_thread.status = 'accepted' then
      return jsonb_build_object(
        'thread_id', v_thread.id,
        'status', v_thread.status,
        'action', 'existing'
      );
    end if;

    if v_thread.status = 'pending' then
      if v_thread.requested_by_side = p_initiator_side then
        raise exception 'A contact request is already pending.';
      end if;

      return jsonb_build_object(
        'thread_id', v_thread.id,
        'status', v_thread.status,
        'action', 'incoming_pending'
      );
    end if;

    update public.contact_threads
    set
      status = 'pending',
      requested_by_side = p_initiator_side,
      blocked_by_side = null,
      working_date = coalesce(p_show_date, working_date),
      last_message_at = v_now,
      band_last_read_at = case
        when p_initiator_side = 'band' then v_now
        else v_thread.band_last_read_at
      end,
      venue_last_read_at = case
        when p_initiator_side = 'venue' then v_now
        else v_thread.venue_last_read_at
      end
    where id = v_thread.id
    returning *
    into v_thread;

    insert into public.contact_messages (
      thread_id,
      sender_side,
      sender_user_id,
      kind,
      body,
      created_at
    ) values (
      v_thread.id,
      p_initiator_side,
      v_uid,
      'request',
      v_body,
      v_now
    );

    return jsonb_build_object(
      'thread_id', v_thread.id,
      'status', v_thread.status,
      'action', 'reopened'
    );
  end if;

  insert into public.contact_threads (
    band_id,
    venue_id,
    status,
    requested_by_side,
    working_date,
    last_message_at,
    band_last_read_at,
    venue_last_read_at
  ) values (
    p_band_id,
    p_venue_id,
    'pending',
    p_initiator_side,
    p_show_date,
    v_now,
    case when p_initiator_side = 'band' then v_now else null end,
    case when p_initiator_side = 'venue' then v_now else null end
  )
  returning *
  into v_thread;

  insert into public.contact_messages (
    thread_id,
    sender_side,
    sender_user_id,
    kind,
    body,
    created_at
  ) values (
    v_thread.id,
    p_initiator_side,
    v_uid,
    'request',
    v_body,
    v_now
  );

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'created'
  );
end;
$$;

revoke all on function public.request_contact(uuid, uuid, text, text, date) from public;
grant execute on function public.request_contact(uuid, uuid, text, text, date) to authenticated;
