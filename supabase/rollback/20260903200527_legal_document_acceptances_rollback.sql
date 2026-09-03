-- Roll back 20260903200527_legal_document_acceptances.
-- This removes the acceptance ledger and should only be used if the forward
-- migration has not been relied on for compliance or audit purposes.

revoke execute on function public.record_legal_document_acceptance(text, text) from authenticated;
drop function if exists public.record_legal_document_acceptance(text, text);
drop table if exists public.legal_document_acceptances;

-- Restore the previous signup trigger function.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email
  );
  return new;
end;
$$;
