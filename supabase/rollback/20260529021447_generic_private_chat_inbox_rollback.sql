-- Manual rollback for 20260529021447_generic_private_chat_inbox.sql.
-- This removes the generic private chat inbox schema and RPCs.

revoke execute on function public.request_private_chat(text, uuid, text, uuid, text) from authenticated;
revoke execute on function public.respond_to_private_chat_request(uuid, text, uuid, text, text) from authenticated;
revoke execute on function public.send_private_chat_message(uuid, text, uuid, text) from authenticated;
revoke execute on function public.mark_private_chat_read(uuid, text, uuid) from authenticated;
revoke execute on function public.archive_private_chat_thread(uuid, text, uuid) from authenticated;
revoke execute on function public.unarchive_private_chat_thread(uuid, text, uuid) from authenticated;
revoke execute on function public.block_private_chat_thread(uuid, text, uuid, text) from authenticated;
revoke execute on function public.unblock_private_chat_thread(uuid, text, uuid) from authenticated;

drop policy if exists "private_chat_messages: select participants" on public.private_chat_messages;
drop policy if exists "private_chat_threads: select participants" on public.private_chat_threads;

drop trigger if exists set_private_chat_threads_updated_at on public.private_chat_threads;

drop function if exists public.request_private_chat(text, uuid, text, uuid, text);
drop function if exists public.respond_to_private_chat_request(uuid, text, uuid, text, text);
drop function if exists public.send_private_chat_message(uuid, text, uuid, text);
drop function if exists public.mark_private_chat_read(uuid, text, uuid);
drop function if exists public.archive_private_chat_thread(uuid, text, uuid);
drop function if exists public.unarchive_private_chat_thread(uuid, text, uuid);
drop function if exists public.block_private_chat_thread(uuid, text, uuid, text);
drop function if exists public.unblock_private_chat_thread(uuid, text, uuid);
drop function if exists public.private_chat_profile_sort_key(text, uuid);
drop function if exists public.private_chat_profile_label(text);
drop function if exists public.private_chat_profile_name(text, uuid);
drop function if exists public.private_chat_profile_owner(text, uuid);

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'private_chat_messages'
  ) then
    execute 'alter publication supabase_realtime drop table public.private_chat_messages';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'private_chat_threads'
  ) then
    execute 'alter publication supabase_realtime drop table public.private_chat_threads';
  end if;
end $$;

drop table if exists public.private_chat_messages;
drop table if exists public.private_chat_threads;
