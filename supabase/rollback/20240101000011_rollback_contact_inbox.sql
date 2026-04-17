-- ============================================================
-- TourAligner - Roll back contact inbox and direct messaging
-- Migration: 20240101000011
-- Notes:
-- - This removes the inbox/contact schema introduced in 20240101000010.
-- - It does not restore or modify application code.
-- - It preserves legacy public.booking_inquiries data.
-- - It will delete any live data stored in contact_threads/contact_messages.
-- ============================================================

revoke execute on function public.request_contact(uuid, uuid, text, text) from authenticated;
revoke execute on function public.respond_to_contact_request(uuid, text, text) from authenticated;
revoke execute on function public.unblock_contact_thread(uuid) from authenticated;
revoke execute on function public.block_contact_thread(uuid, text) from authenticated;
revoke execute on function public.send_contact_message(uuid, text) from authenticated;
revoke execute on function public.mark_contact_thread_read(uuid) from authenticated;

drop function if exists public.request_contact(uuid, uuid, text, text);
drop function if exists public.respond_to_contact_request(uuid, text, text);
drop function if exists public.unblock_contact_thread(uuid);
drop function if exists public.block_contact_thread(uuid, text);
drop function if exists public.send_contact_message(uuid, text);
drop function if exists public.mark_contact_thread_read(uuid);

drop policy if exists "contact_messages: select participants" on public.contact_messages;
drop policy if exists "contact_threads: select participants" on public.contact_threads;

drop trigger if exists set_contact_threads_updated_at on public.contact_threads;

do $$
begin
  begin
    execute 'alter publication supabase_realtime drop table public.contact_messages';
  exception
    when undefined_object then
      null;
    when invalid_parameter_value then
      null;
  end;
end $$;

do $$
begin
  begin
    execute 'alter publication supabase_realtime drop table public.contact_threads';
  exception
    when undefined_object then
      null;
    when invalid_parameter_value then
      null;
  end;
end $$;

drop table if exists public.contact_messages;
drop table if exists public.contact_threads;
