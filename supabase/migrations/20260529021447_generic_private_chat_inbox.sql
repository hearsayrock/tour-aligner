-- ============================================================
-- TourAligner - Generic private chat inbox
-- Migration: 20260529021447
-- ============================================================

create table public.private_chat_threads (
  id                              uuid primary key default gen_random_uuid(),
  participant_one_kind            text not null check (participant_one_kind in ('band', 'venue')),
  participant_one_id              uuid not null,
  participant_two_kind            text not null check (participant_two_kind in ('band', 'venue')),
  participant_two_id              uuid not null,
  status                          text not null default 'pending'
                                    check (status in ('pending', 'accepted', 'declined', 'blocked')),
  requested_by_kind               text check (requested_by_kind in ('band', 'venue')),
  requested_by_id                 uuid,
  blocked_by_kind                 text check (blocked_by_kind in ('band', 'venue')),
  blocked_by_id                   uuid,
  accepted_at                     timestamptz,
  last_message_at                 timestamptz,
  participant_one_last_read_at    timestamptz,
  participant_two_last_read_at    timestamptz,
  participant_one_archived_at     timestamptz,
  participant_two_archived_at     timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  constraint private_chat_threads_pair_unique unique (
    participant_one_kind,
    participant_one_id,
    participant_two_kind,
    participant_two_id
  ),
  constraint private_chat_threads_distinct_participants check (
    not (
      participant_one_kind = participant_two_kind
      and participant_one_id = participant_two_id
    )
  ),
  constraint private_chat_threads_requested_by_consistency check (
    (requested_by_kind is null and requested_by_id is null)
    or
    (requested_by_kind is not null and requested_by_id is not null)
  ),
  constraint private_chat_threads_blocked_by_consistency check (
    (blocked_by_kind is null and blocked_by_id is null)
    or
    (blocked_by_kind is not null and blocked_by_id is not null)
  )
);

create index private_chat_threads_status_idx
  on public.private_chat_threads(status);

create index private_chat_threads_last_message_at_idx
  on public.private_chat_threads(last_message_at desc nulls last);

create index private_chat_threads_participant_one_idx
  on public.private_chat_threads(participant_one_kind, participant_one_id);

create index private_chat_threads_participant_two_idx
  on public.private_chat_threads(participant_two_kind, participant_two_id);

create table public.private_chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  thread_id           uuid not null references public.private_chat_threads(id) on delete cascade,
  sender_profile_kind text check (sender_profile_kind in ('band', 'venue')),
  sender_profile_id   uuid,
  sender_user_id      uuid references public.profiles(id) on delete set null,
  kind                text not null check (kind in ('request', 'message', 'system')),
  body                text not null,
  created_at          timestamptz not null default now(),
  constraint private_chat_messages_sender_consistency check (
    (sender_profile_kind is null and sender_profile_id is null)
    or
    (sender_profile_kind is not null and sender_profile_id is not null)
  )
);

create index private_chat_messages_thread_id_idx
  on public.private_chat_messages(thread_id, created_at);

create trigger set_private_chat_threads_updated_at
  before update on public.private_chat_threads
  for each row execute procedure public.set_updated_at();

alter table public.private_chat_threads replica identity full;
alter table public.private_chat_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'private_chat_threads'
  ) then
    execute 'alter publication supabase_realtime add table public.private_chat_threads';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'private_chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.private_chat_messages';
  end if;
end $$;

create or replace function public.private_chat_profile_owner(
  p_profile_kind text,
  p_profile_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if p_profile_kind = 'band' then
    select band.user_id
      into v_owner
    from public.bands band
    where band.id = p_profile_id
      and band.is_active = true;
  elsif p_profile_kind = 'venue' then
    select venue.claimed_by_user_id
      into v_owner
    from public.venues venue
    where venue.id = p_profile_id
      and venue.is_active = true;
  else
    raise exception 'Invalid profile kind.';
  end if;

  return v_owner;
end;
$$;

create or replace function public.private_chat_profile_name(
  p_profile_kind text,
  p_profile_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if p_profile_kind = 'band' then
    select band.name
      into v_name
    from public.bands band
    where band.id = p_profile_id
      and band.is_active = true;
  elsif p_profile_kind = 'venue' then
    select venue.name
      into v_name
    from public.venues venue
    where venue.id = p_profile_id
      and venue.is_active = true;
  else
    raise exception 'Invalid profile kind.';
  end if;

  return v_name;
end;
$$;

create or replace function public.private_chat_profile_label(p_profile_kind text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_profile_kind = 'band' then 'Artist'
    when p_profile_kind = 'venue' then 'Venue'
    else 'Profile'
  end;
$$;

create or replace function public.private_chat_profile_sort_key(
  p_profile_kind text,
  p_profile_id uuid
)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_profile_kind || ':' || p_profile_id::text;
$$;

create or replace function public.request_private_chat(
  p_sender_kind text,
  p_sender_id uuid,
  p_recipient_kind text,
  p_recipient_id uuid,
  p_body text
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
  v_sender_owner uuid;
  v_recipient_owner uuid;
  v_sender_key text;
  v_recipient_key text;
  v_thread public.private_chat_threads%rowtype;
  v_one_kind text;
  v_one_id uuid;
  v_two_kind text;
  v_two_id uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if p_sender_kind not in ('band', 'venue') or p_recipient_kind not in ('band', 'venue') then
    raise exception 'Invalid profile kind.';
  end if;

  if p_sender_kind = p_recipient_kind and p_sender_id = p_recipient_id then
    raise exception 'You cannot start a private chat with the same profile.';
  end if;

  if v_body = '' then
    raise exception 'A short introduction is required.';
  end if;

  v_sender_owner := public.private_chat_profile_owner(p_sender_kind, p_sender_id);
  if v_sender_owner is null then
    raise exception 'The sending profile could not be found.';
  end if;

  if v_sender_owner <> v_uid then
    raise exception 'You do not own this sending profile.';
  end if;

  v_recipient_owner := public.private_chat_profile_owner(p_recipient_kind, p_recipient_id);
  if v_recipient_owner is null then
    raise exception 'The receiving profile could not be found.';
  end if;

  v_sender_key := public.private_chat_profile_sort_key(p_sender_kind, p_sender_id);
  v_recipient_key := public.private_chat_profile_sort_key(p_recipient_kind, p_recipient_id);

  if v_sender_key <= v_recipient_key then
    v_one_kind := p_sender_kind;
    v_one_id := p_sender_id;
    v_two_kind := p_recipient_kind;
    v_two_id := p_recipient_id;
  else
    v_one_kind := p_recipient_kind;
    v_one_id := p_recipient_id;
    v_two_kind := p_sender_kind;
    v_two_id := p_sender_id;
  end if;

  select thread.*
    into v_thread
  from public.private_chat_threads thread
  where thread.participant_one_kind = v_one_kind
    and thread.participant_one_id = v_one_id
    and thread.participant_two_kind = v_two_kind
    and thread.participant_two_id = v_two_id
  for update;

  if found then
    if v_thread.status = 'blocked' then
      raise exception 'Private chat is currently blocked for these profiles.';
    end if;

    if v_thread.status = 'accepted' then
      return jsonb_build_object(
        'thread_id', v_thread.id,
        'status', v_thread.status,
        'action', 'existing'
      );
    end if;

    if v_thread.status = 'pending' then
      if v_thread.requested_by_kind = p_sender_kind and v_thread.requested_by_id = p_sender_id then
        raise exception 'A private chat request is already pending.';
      end if;

      return jsonb_build_object(
        'thread_id', v_thread.id,
        'status', v_thread.status,
        'action', 'incoming_pending'
      );
    end if;

    update public.private_chat_threads
    set
      status = 'pending',
      requested_by_kind = p_sender_kind,
      requested_by_id = p_sender_id,
      blocked_by_kind = null,
      blocked_by_id = null,
      last_message_at = v_now,
      participant_one_last_read_at = case
        when participant_one_kind = p_sender_kind and participant_one_id = p_sender_id then v_now
        else participant_one_last_read_at
      end,
      participant_two_last_read_at = case
        when participant_two_kind = p_sender_kind and participant_two_id = p_sender_id then v_now
        else participant_two_last_read_at
      end,
      participant_one_archived_at = null,
      participant_two_archived_at = null
    where id = v_thread.id
    returning *
    into v_thread;

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
      p_sender_kind,
      p_sender_id,
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

  insert into public.private_chat_threads (
    participant_one_kind,
    participant_one_id,
    participant_two_kind,
    participant_two_id,
    status,
    requested_by_kind,
    requested_by_id,
    last_message_at,
    participant_one_last_read_at,
    participant_two_last_read_at
  ) values (
    v_one_kind,
    v_one_id,
    v_two_kind,
    v_two_id,
    'pending',
    p_sender_kind,
    p_sender_id,
    v_now,
    case when v_one_kind = p_sender_kind and v_one_id = p_sender_id then v_now else null end,
    case when v_two_kind = p_sender_kind and v_two_id = p_sender_id then v_now else null end
  )
  returning *
  into v_thread;

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
    p_sender_kind,
    p_sender_id,
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

  if v_note <> '' then
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
    'system',
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

create or replace function public.send_private_chat_message(
  p_thread_id uuid,
  p_sender_kind text,
  p_sender_id uuid,
  p_body text
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
  v_thread public.private_chat_threads%rowtype;
  v_sender_owner uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if v_body = '' then
    raise exception 'Message cannot be empty.';
  end if;

  v_sender_owner := public.private_chat_profile_owner(p_sender_kind, p_sender_id);
  if v_sender_owner is null then
    raise exception 'The sending profile could not be found.';
  end if;

  if v_sender_owner <> v_uid then
    raise exception 'You do not own this sending profile.';
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
    (v_thread.participant_one_kind = p_sender_kind and v_thread.participant_one_id = p_sender_id)
    or
    (v_thread.participant_two_kind = p_sender_kind and v_thread.participant_two_id = p_sender_id)
  ) then
    raise exception 'You do not have access to this private chat.';
  end if;

  if v_thread.status <> 'accepted' then
    raise exception 'Messages can only be sent after a request is accepted.';
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
    p_sender_kind,
    p_sender_id,
    v_uid,
    'message',
    v_body,
    v_now
  );

  update public.private_chat_threads
  set
    last_message_at = v_now,
    participant_one_last_read_at = case
      when participant_one_kind = p_sender_kind and participant_one_id = p_sender_id then v_now
      else participant_one_last_read_at
    end,
    participant_two_last_read_at = case
      when participant_two_kind = p_sender_kind and participant_two_id = p_sender_id then v_now
      else participant_two_last_read_at
    end,
    participant_one_archived_at = null,
    participant_two_archived_at = null
  where id = v_thread.id;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', 'accepted',
    'action', 'sent'
  );
end;
$$;

create or replace function public.mark_private_chat_read(
  p_thread_id uuid,
  p_actor_kind text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.private_chat_threads%rowtype;
  v_actor_owner uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
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

  if v_thread.participant_one_kind = p_actor_kind and v_thread.participant_one_id = p_actor_id then
    update public.private_chat_threads
    set participant_one_last_read_at = greatest(
      coalesce(participant_one_last_read_at, '-infinity'::timestamptz),
      coalesce(last_message_at, now())
    )
    where id = v_thread.id;
  elsif v_thread.participant_two_kind = p_actor_kind and v_thread.participant_two_id = p_actor_id then
    update public.private_chat_threads
    set participant_two_last_read_at = greatest(
      coalesce(participant_two_last_read_at, '-infinity'::timestamptz),
      coalesce(last_message_at, now())
    )
    where id = v_thread.id;
  else
    raise exception 'You do not have access to this private chat.';
  end if;
end;
$$;

create or replace function public.archive_private_chat_thread(
  p_thread_id uuid,
  p_actor_kind text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_thread public.private_chat_threads%rowtype;
  v_actor_owner uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
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

  if v_thread.participant_one_kind = p_actor_kind and v_thread.participant_one_id = p_actor_id then
    update public.private_chat_threads
    set participant_one_archived_at = v_now
    where id = v_thread.id
    returning *
    into v_thread;
  elsif v_thread.participant_two_kind = p_actor_kind and v_thread.participant_two_id = p_actor_id then
    update public.private_chat_threads
    set participant_two_archived_at = v_now
    where id = v_thread.id
    returning *
    into v_thread;
  else
    raise exception 'You do not have access to this private chat.';
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'archived'
  );
end;
$$;

create or replace function public.unarchive_private_chat_thread(
  p_thread_id uuid,
  p_actor_kind text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.private_chat_threads%rowtype;
  v_actor_owner uuid;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
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

  if v_thread.participant_one_kind = p_actor_kind and v_thread.participant_one_id = p_actor_id then
    update public.private_chat_threads
    set participant_one_archived_at = null
    where id = v_thread.id
    returning *
    into v_thread;
  elsif v_thread.participant_two_kind = p_actor_kind and v_thread.participant_two_id = p_actor_id then
    update public.private_chat_threads
    set participant_two_archived_at = null
    where id = v_thread.id
    returning *
    into v_thread;
  else
    raise exception 'You do not have access to this private chat.';
  end if;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'unarchived'
  );
end;
$$;

create or replace function public.block_private_chat_thread(
  p_thread_id uuid,
  p_actor_kind text,
  p_actor_id uuid,
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
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
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

  if v_thread.status <> 'accepted' then
    raise exception 'Only active private chats can be blocked here.';
  end if;

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

  v_message := public.private_chat_profile_label(p_actor_kind) || ' blocked this private chat.';
  if v_note <> '' then
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
    'system',
    v_message,
    v_now
  );

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'blocked'
  );
end;
$$;

create or replace function public.unblock_private_chat_thread(
  p_thread_id uuid,
  p_actor_kind text,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_thread public.private_chat_threads%rowtype;
  v_actor_owner uuid;
  v_next_status text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
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

  if v_thread.status <> 'blocked' then
    raise exception 'Only blocked private chats can be unblocked.';
  end if;

  if v_thread.blocked_by_kind <> p_actor_kind or v_thread.blocked_by_id <> p_actor_id then
    raise exception 'Only the profile that blocked this private chat can unblock it.';
  end if;

  v_next_status := case
    when v_thread.accepted_at is null then 'declined'
    else 'accepted'
  end;

  update public.private_chat_threads
  set
    status = v_next_status,
    blocked_by_kind = null,
    blocked_by_id = null,
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
    'system',
    public.private_chat_profile_label(p_actor_kind) || ' unblocked this private chat.',
    v_now
  );

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'unblocked'
  );
end;
$$;

revoke all on function public.private_chat_profile_owner(text, uuid) from public;
revoke all on function public.private_chat_profile_name(text, uuid) from public;
revoke all on function public.request_private_chat(text, uuid, text, uuid, text) from public;
revoke all on function public.respond_to_private_chat_request(uuid, text, uuid, text, text) from public;
revoke all on function public.send_private_chat_message(uuid, text, uuid, text) from public;
revoke all on function public.mark_private_chat_read(uuid, text, uuid) from public;
revoke all on function public.archive_private_chat_thread(uuid, text, uuid) from public;
revoke all on function public.unarchive_private_chat_thread(uuid, text, uuid) from public;
revoke all on function public.block_private_chat_thread(uuid, text, uuid, text) from public;
revoke all on function public.unblock_private_chat_thread(uuid, text, uuid) from public;

grant execute on function public.private_chat_profile_owner(text, uuid) to authenticated;
grant execute on function public.request_private_chat(text, uuid, text, uuid, text) to authenticated;
grant execute on function public.respond_to_private_chat_request(uuid, text, uuid, text, text) to authenticated;
grant execute on function public.send_private_chat_message(uuid, text, uuid, text) to authenticated;
grant execute on function public.mark_private_chat_read(uuid, text, uuid) to authenticated;
grant execute on function public.archive_private_chat_thread(uuid, text, uuid) to authenticated;
grant execute on function public.unarchive_private_chat_thread(uuid, text, uuid) to authenticated;
grant execute on function public.block_private_chat_thread(uuid, text, uuid, text) to authenticated;
grant execute on function public.unblock_private_chat_thread(uuid, text, uuid) to authenticated;

alter table public.private_chat_threads enable row level security;
alter table public.private_chat_messages enable row level security;

create policy "private_chat_threads: select participants"
  on public.private_chat_threads for select
  to authenticated
  using (
    auth.uid() = public.private_chat_profile_owner(participant_one_kind, participant_one_id)
    or
    auth.uid() = public.private_chat_profile_owner(participant_two_kind, participant_two_id)
  );

create policy "private_chat_messages: select participants"
  on public.private_chat_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.private_chat_threads thread
      where thread.id = private_chat_messages.thread_id
        and (
          auth.uid() = public.private_chat_profile_owner(thread.participant_one_kind, thread.participant_one_id)
          or
          auth.uid() = public.private_chat_profile_owner(thread.participant_two_kind, thread.participant_two_id)
        )
    )
  );
