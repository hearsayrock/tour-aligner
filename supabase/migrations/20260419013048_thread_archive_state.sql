alter table public.contact_threads
  add column if not exists band_archived_at timestamptz,
  add column if not exists venue_archived_at timestamptz;

create or replace function public.unarchive_contact_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.contact_threads
  set
    band_archived_at = null,
    venue_archived_at = null
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists unarchive_contact_thread_on_message on public.contact_messages;

create trigger unarchive_contact_thread_on_message
  after insert on public.contact_messages
  for each row execute procedure public.unarchive_contact_thread_on_message();

create or replace function public.archive_contact_thread(p_thread_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.contact_threads%rowtype;
  v_actor_side text;
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
  elsif v_uid = (select claimed_by_user_id from public.venues where id = v_thread.venue_id) then
    v_actor_side := 'venue';
  else
    raise exception 'You do not have access to this conversation.';
  end if;

  update public.contact_threads
  set
    band_archived_at = case when v_actor_side = 'band' then now() else band_archived_at end,
    venue_archived_at = case when v_actor_side = 'venue' then now() else venue_archived_at end
  where id = v_thread.id;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', 'archived',
    'action', 'archived'
  );
end;
$$;

create or replace function public.unarchive_contact_thread(p_thread_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.contact_threads%rowtype;
  v_actor_side text;
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
  elsif v_uid = (select claimed_by_user_id from public.venues where id = v_thread.venue_id) then
    v_actor_side := 'venue';
  else
    raise exception 'You do not have access to this conversation.';
  end if;

  update public.contact_threads
  set
    band_archived_at = case when v_actor_side = 'band' then null else band_archived_at end,
    venue_archived_at = case when v_actor_side = 'venue' then null else venue_archived_at end
  where id = v_thread.id;

  return jsonb_build_object(
    'thread_id', v_thread.id,
    'status', 'active',
    'action', 'unarchived'
  );
end;
$$;

revoke all on function public.archive_contact_thread(uuid) from public;
revoke all on function public.unarchive_contact_thread(uuid) from public;

grant execute on function public.archive_contact_thread(uuid) to authenticated;
grant execute on function public.unarchive_contact_thread(uuid) to authenticated;
