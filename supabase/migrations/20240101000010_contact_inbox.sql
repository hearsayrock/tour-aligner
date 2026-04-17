-- ============================================================
-- TourAligner - Contact inbox and direct messaging
-- Migration: 20240101000010
-- ============================================================

create table public.contact_threads (
  id                 uuid primary key default gen_random_uuid(),
  band_id            uuid not null references public.bands(id) on delete cascade,
  venue_id           uuid not null references public.venues(id) on delete cascade,
  status             text not null default 'pending'
                       check (status in ('pending', 'accepted', 'declined', 'blocked')),
  requested_by_side  text
                       check (requested_by_side in ('band', 'venue')),
  blocked_by_side    text
                       check (blocked_by_side in ('band', 'venue')),
  accepted_at        timestamptz,
  last_message_at    timestamptz,
  band_last_read_at  timestamptz,
  venue_last_read_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint contact_threads_pair_unique unique (band_id, venue_id)
);

create index contact_threads_status_idx on public.contact_threads(status);
create index contact_threads_last_message_at_idx on public.contact_threads(last_message_at desc nulls last);
create index contact_threads_band_id_idx on public.contact_threads(band_id);
create index contact_threads_venue_id_idx on public.contact_threads(venue_id);

create table public.contact_messages (
  id             uuid primary key default gen_random_uuid(),
  thread_id      uuid not null references public.contact_threads(id) on delete cascade,
  sender_side    text check (sender_side in ('band', 'venue')),
  sender_user_id uuid references public.profiles(id) on delete set null,
  kind           text not null check (kind in ('request', 'message', 'system')),
  body           text not null,
  created_at     timestamptz not null default now()
);

create index contact_messages_thread_id_idx on public.contact_messages(thread_id, created_at);

create trigger set_contact_threads_updated_at
  before update on public.contact_threads
  for each row execute procedure public.set_updated_at();

alter table public.contact_threads replica identity full;
alter table public.contact_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contact_threads'
  ) then
    execute 'alter publication supabase_realtime add table public.contact_threads';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'contact_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.contact_messages';
  end if;
end $$;

with latest_inquiry as (
  select distinct on (band_id, venue_id)
    id,
    band_id,
    venue_id,
    status,
    responded_at,
    created_at
  from public.booking_inquiries
  order by band_id, venue_id, created_at desc, id desc
)
insert into public.contact_threads (
  band_id,
  venue_id,
  status,
  requested_by_side,
  accepted_at,
  last_message_at,
  band_last_read_at,
  venue_last_read_at,
  created_at,
  updated_at
)
select
  latest_inquiry.band_id,
  latest_inquiry.venue_id,
  case
    when latest_inquiry.status = 'accepted' then 'accepted'
    when latest_inquiry.status = 'pending' then 'pending'
    else 'declined'
  end,
  'band',
  case
    when latest_inquiry.status = 'accepted' then coalesce(latest_inquiry.responded_at, latest_inquiry.created_at)
    else null
  end,
  coalesce(latest_inquiry.responded_at, latest_inquiry.created_at),
  case
    when latest_inquiry.status = 'pending' then latest_inquiry.created_at
    else coalesce(latest_inquiry.responded_at, latest_inquiry.created_at)
  end,
  case
    when latest_inquiry.status = 'pending' then null
    else coalesce(latest_inquiry.responded_at, latest_inquiry.created_at)
  end,
  latest_inquiry.created_at,
  coalesce(latest_inquiry.responded_at, latest_inquiry.created_at)
from latest_inquiry;

insert into public.contact_messages (
  thread_id,
  sender_side,
  sender_user_id,
  kind,
  body,
  created_at
)
select
  thread.id,
  'band',
  band.user_id,
  'request',
  inquiry.message,
  inquiry.created_at
from public.booking_inquiries inquiry
join public.contact_threads thread
  on thread.band_id = inquiry.band_id
 and thread.venue_id = inquiry.venue_id
join public.bands band
  on band.id = inquiry.band_id
order by inquiry.created_at, inquiry.id;

insert into public.contact_messages (
  thread_id,
  sender_side,
  sender_user_id,
  kind,
  body,
  created_at
)
select
  thread.id,
  case
    when inquiry.status = 'cancelled' then 'band'
    else 'venue'
  end,
  case
    when inquiry.status = 'cancelled' then band.user_id
    else venue.claimed_by_user_id
  end,
  'system',
  case
    when inquiry.status = 'accepted' then
      trim(both ' ' from 'Venue accepted the legacy booking inquiry.'
        || case
          when inquiry.response_message is not null and btrim(inquiry.response_message) <> ''
            then ' Note: ' || inquiry.response_message
          else ''
        end)
    when inquiry.status = 'declined' then
      trim(both ' ' from 'Venue declined the legacy booking inquiry.'
        || case
          when inquiry.response_message is not null and btrim(inquiry.response_message) <> ''
            then ' Note: ' || inquiry.response_message
          else ''
        end)
    when inquiry.status = 'cancelled' then
      'Artist cancelled the legacy booking inquiry.'
    else null
  end,
  coalesce(inquiry.responded_at, inquiry.updated_at, inquiry.created_at)
from public.booking_inquiries inquiry
join public.contact_threads thread
  on thread.band_id = inquiry.band_id
 and thread.venue_id = inquiry.venue_id
join public.bands band
  on band.id = inquiry.band_id
join public.venues venue
  on venue.id = inquiry.venue_id
where inquiry.status in ('accepted', 'declined', 'cancelled');

create or replace function public.request_contact(
  p_band_id uuid,
  p_venue_id uuid,
  p_initiator_side text,
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
    last_message_at,
    band_last_read_at,
    venue_last_read_at
  ) values (
    p_band_id,
    p_venue_id,
    'pending',
    p_initiator_side,
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

  if v_note <> '' then
    v_message := v_message || ' Note: ' || v_note;
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

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', p_action
  );
end;
$$;

create or replace function public.unblock_contact_thread(p_thread_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_thread public.contact_threads%rowtype;
  v_actor_side text;
  v_actor_label text;
  v_next_status text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
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

  if v_thread.status <> 'blocked' then
    raise exception 'Only blocked conversations can be unblocked.';
  end if;

  if v_thread.blocked_by_side <> v_actor_side then
    raise exception 'Only the side that blocked this conversation can unblock it.';
  end if;

  v_next_status := case
    when v_thread.accepted_at is null then 'declined'
    else 'accepted'
  end;

  update public.contact_threads
  set
    status = v_next_status,
    blocked_by_side = null,
    last_message_at = v_now,
    band_last_read_at = case when v_actor_side = 'band' then v_now else band_last_read_at end,
    venue_last_read_at = case when v_actor_side = 'venue' then v_now else venue_last_read_at end
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
    v_actor_side,
    v_uid,
    'system',
    v_actor_label || ' unblocked this conversation.',
    v_now
  );

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'unblocked'
  );
end;
$$;

create or replace function public.block_contact_thread(
  p_thread_id uuid,
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

  if v_thread.status <> 'accepted' then
    raise exception 'Only active conversations can be blocked here.';
  end if;

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

  v_message := v_actor_label || ' blocked this conversation.';
  if v_note <> '' then
    v_message := v_message || ' Note: ' || v_note;
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

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', v_thread.status,
    'action', 'blocked'
  );
end;
$$;

create or replace function public.send_contact_message(
  p_thread_id uuid,
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
  v_thread public.contact_threads%rowtype;
  v_actor_side text;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
  end if;

  if v_body = '' then
    raise exception 'Message cannot be empty.';
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
  elsif v_uid = (select claimed_by_user_id from public.venues where id = v_thread.venue_id) then
    v_actor_side := 'venue';
  else
    raise exception 'You do not have access to this conversation.';
  end if;

  if v_thread.status <> 'accepted' then
    raise exception 'Messages can only be sent after a request is accepted.';
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
    'message',
    v_body,
    v_now
  );

  update public.contact_threads
  set
    last_message_at = v_now,
    band_last_read_at = case when v_actor_side = 'band' then v_now else band_last_read_at end,
    venue_last_read_at = case when v_actor_side = 'venue' then v_now else venue_last_read_at end
  where id = v_thread.id;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', 'accepted',
    'action', 'sent'
  );
end;
$$;

create or replace function public.mark_contact_thread_read(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.contact_threads%rowtype;
begin
  if v_uid is null then
    raise exception 'You must be signed in.';
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
    update public.contact_threads
    set band_last_read_at = greatest(coalesce(band_last_read_at, '-infinity'::timestamptz), coalesce(last_message_at, now()))
    where id = v_thread.id;
  elsif v_uid = (select claimed_by_user_id from public.venues where id = v_thread.venue_id) then
    update public.contact_threads
    set venue_last_read_at = greatest(coalesce(venue_last_read_at, '-infinity'::timestamptz), coalesce(last_message_at, now()))
    where id = v_thread.id;
  else
    raise exception 'You do not have access to this conversation.';
  end if;
end;
$$;

revoke all on function public.request_contact(uuid, uuid, text, text) from public;
revoke all on function public.respond_to_contact_request(uuid, text, text) from public;
revoke all on function public.unblock_contact_thread(uuid) from public;
revoke all on function public.block_contact_thread(uuid, text) from public;
revoke all on function public.send_contact_message(uuid, text) from public;
revoke all on function public.mark_contact_thread_read(uuid) from public;

grant execute on function public.request_contact(uuid, uuid, text, text) to authenticated;
grant execute on function public.respond_to_contact_request(uuid, text, text) to authenticated;
grant execute on function public.unblock_contact_thread(uuid) to authenticated;
grant execute on function public.block_contact_thread(uuid, text) to authenticated;
grant execute on function public.send_contact_message(uuid, text) to authenticated;
grant execute on function public.mark_contact_thread_read(uuid) to authenticated;

alter table public.contact_threads enable row level security;
alter table public.contact_messages enable row level security;

create policy "contact_threads: select participants"
  on public.contact_threads for select
  to authenticated
  using (
    auth.uid() = (select user_id from public.bands where id = band_id)
    or
    auth.uid() = (select claimed_by_user_id from public.venues where id = venue_id)
  );

create policy "contact_messages: select participants"
  on public.contact_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.contact_threads thread
      where thread.id = thread_id
        and (
          auth.uid() = (select user_id from public.bands where id = thread.band_id)
          or
          auth.uid() = (select claimed_by_user_id from public.venues where id = thread.venue_id)
        )
    )
  );
