create or replace function public.respond_to_contact_request(
  p_thread_id uuid,
  p_action text,
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
  v_note text := btrim(coalesce(p_note, ''));
  v_thread public.contact_threads%rowtype;
  v_actor_side text;
  v_actor_label text;
  v_message text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if p_action not in ('accept', 'decline_retry_later', 'decline_and_block') then
    raise exception 'Invalid response action.';
  end if;

  select thread.*
    into v_thread
  from public.contact_threads thread
  where thread.id = p_thread_id
  for update;

  if not found then
    raise exception 'Conversation not found.';
  end if;

  if v_uid = (select user_id from public.bands where id = v_thread.band_id) then
    v_actor_side := 'band';
    v_actor_label := 'Artist';
  elsif v_uid = (select claimed_by_user_id from public.venues where id = v_thread.venue_id) then
    v_actor_side := 'venue';
    v_actor_label := 'Venue';
  else
    raise exception 'You do not have access to this conversation.';
  end if;

  if v_thread.status <> 'pending' then
    raise exception 'Only pending contact requests can be updated.';
  end if;

  if v_thread.requested_by_side = v_actor_side then
    raise exception 'Only the receiving side can respond to this request.';
  end if;

  if p_action = 'accept' then
    update public.contact_threads
    set
      status = 'accepted',
      accepted_at = coalesce(accepted_at, v_now),
      last_message_at = v_now,
      band_last_read_at = case when v_actor_side = 'band' then v_now else band_last_read_at end,
      venue_last_read_at = case when v_actor_side = 'venue' then v_now else venue_last_read_at end
    where id = v_thread.id
    returning *
    into v_thread;

    v_message := v_actor_label || ' accepted the contact request.';
  elsif p_action = 'decline_retry_later' then
    update public.contact_threads
    set
      status = 'declined',
      last_message_at = v_now,
      band_last_read_at = case when v_actor_side = 'band' then v_now else band_last_read_at end,
      venue_last_read_at = case when v_actor_side = 'venue' then v_now else venue_last_read_at end
    where id = v_thread.id
    returning *
    into v_thread;

    v_message := v_actor_label || ' declined the contact request for now.';
  else
    update public.contact_threads
    set
      status = 'blocked',
      blocked_by_side = v_actor_side,
      last_message_at = v_now,
      band_last_read_at = case when v_actor_side = 'band' then v_now else band_last_read_at end,
      venue_last_read_at = case when v_actor_side = 'venue' then v_now else venue_last_read_at end
    where id = v_thread.id
    returning *
    into v_thread;

    v_message := v_actor_label || ' declined the contact request and blocked future contact.';
  end if;

  insert into public.contact_messages (
    thread_id,
    sender_side,
    sender_user_id,
    kind,
    body,
    created_at
  ) values (
    v_thread.id,
    v_actor_side,
    v_uid,
    'system',
    v_message,
    v_now
  );

  if v_note <> '' then
    insert into public.contact_messages (
      thread_id,
      sender_side,
      sender_user_id,
      kind,
      body,
      created_at
    ) values (
      v_thread.id,
      v_actor_side,
      v_uid,
      'message',
      v_note,
      v_now
    );
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', p_action
  );
end;
$$;
