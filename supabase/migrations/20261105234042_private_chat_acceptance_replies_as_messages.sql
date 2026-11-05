create or replace function public.respond_to_private_chat_request(
  p_thread_id uuid,
  p_actor_kind text,
  p_actor_id uuid,
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
  v_thread public.private_chat_threads%rowtype;
  v_actor_owner uuid;
  v_message text;
  v_message_kind text := 'system';
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if p_action not in ('accept', 'deny', 'deny_and_block') then
    raise exception 'Invalid response action.';
  end if;

  v_actor_owner := public.private_chat_profile_owner(p_actor_kind, p_actor_id);
  if v_actor_owner is null then
    raise exception 'The acting profile could not be found.';
  end if;

  if v_actor_owner <> v_uid then
    raise exception 'You do not own this acting profile.';
  end if;

  select thread.*
    into v_thread
  from public.private_chat_threads thread
  where thread.id = p_thread_id
  for update;

  if not found then
    raise exception 'Private chat not found.';
  end if;

  if not (
    (v_thread.participant_one_kind = p_actor_kind and v_thread.participant_one_id = p_actor_id)
    or
    (v_thread.participant_two_kind = p_actor_kind and v_thread.participant_two_id = p_actor_id)
  ) then
    raise exception 'You do not have access to this private chat.';
  end if;

  if v_thread.status <> 'pending' then
    raise exception 'Only pending private chat requests can be updated.';
  end if;

  if v_thread.requested_by_kind = p_actor_kind and v_thread.requested_by_id = p_actor_id then
    raise exception 'Only the receiving profile can respond to this request.';
  end if;

  if p_action = 'accept' then
    update public.private_chat_threads
    set
      status = 'accepted',
      accepted_at = coalesce(accepted_at, v_now),
      last_message_at = v_now,
      participant_one_last_read_at = case
        when participant_one_kind = p_actor_kind and participant_one_id = p_actor_id then v_now
        else participant_one_last_read_at
      end,
      participant_two_last_read_at = case
        when participant_two_kind = p_actor_kind and participant_two_id = p_actor_id then v_now
        else participant_two_last_read_at
      end,
      participant_one_archived_at = null,
      participant_two_archived_at = null
    where id = v_thread.id
    returning *
    into v_thread;

    v_message := public.private_chat_profile_label(p_actor_kind) || ' accepted the private chat request.';
  elsif p_action = 'deny' then
    update public.private_chat_threads
    set
      status = 'declined',
      last_message_at = v_now,
      participant_one_last_read_at = case
        when participant_one_kind = p_actor_kind and participant_one_id = p_actor_id then v_now
        else participant_one_last_read_at
      end,
      participant_two_last_read_at = case
        when participant_two_kind = p_actor_kind and participant_two_id = p_actor_id then v_now
        else participant_two_last_read_at
      end,
      participant_one_archived_at = null,
      participant_two_archived_at = null
    where id = v_thread.id
    returning *
    into v_thread;

    v_message := public.private_chat_profile_label(p_actor_kind) || ' denied the private chat request for now.';
  else
    update public.private_chat_threads
    set
      status = 'blocked',
      blocked_by_kind = p_actor_kind,
      blocked_by_id = p_actor_id,
      last_message_at = v_now,
      participant_one_last_read_at = case
        when participant_one_kind = p_actor_kind and participant_one_id = p_actor_id then v_now
        else participant_one_last_read_at
      end,
      participant_two_last_read_at = case
        when participant_two_kind = p_actor_kind and participant_two_id = p_actor_id then v_now
        else participant_two_last_read_at
      end,
      participant_one_archived_at = null,
      participant_two_archived_at = null
    where id = v_thread.id
    returning *
    into v_thread;

    v_message := public.private_chat_profile_label(p_actor_kind) || ' denied the private chat request and blocked future contact.';
  end if;

  if p_action = 'accept' and v_note <> '' then
    v_message_kind := 'message';
    v_message := v_note;
  elsif v_note <> '' then
    v_message := v_message || ' Note: ' || v_note;
  end if;

  insert into public.private_chat_messages (
    thread_id,
    sender_profile_kind,
    sender_profile_id,
    sender_user_id,
    kind,
    body,
    created_at
  ) values (
    v_thread.id,
    p_actor_kind,
    p_actor_id,
    v_uid,
    v_message_kind,
    v_message,
    v_now
  );

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', p_action
  );
end;
$$;

-- Keep the original row ID, sender and timestamp for replies already in chat history.
update public.private_chat_messages as message
set
  kind = 'message',
  body = substr(message.body, length(legacy.prefix) + 1)
from (values
  ('band', 'Artist accepted the private chat request. Note: '),
  ('venue', 'Venue accepted the private chat request. Note: ')
) as legacy(profile_kind, prefix)
where message.kind = 'system'
  and message.sender_profile_kind = legacy.profile_kind
  and starts_with(message.body, legacy.prefix)
  and length(message.body) > length(legacy.prefix);
