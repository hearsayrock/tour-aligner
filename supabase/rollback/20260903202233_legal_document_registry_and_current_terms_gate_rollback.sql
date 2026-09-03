-- Roll back 20260903202233_legal_document_registry_and_current_terms_gate.
-- Do not use after relying on these acceptance records for an audit.

alter table public.legal_document_acceptances
  drop constraint if exists legal_document_acceptances_document_version_fkey,
  drop column if exists document_content_hash;

drop trigger if exists prevent_legal_document_deletion on public.legal_documents;
drop function if exists public.prevent_legal_document_deletion();
drop trigger if exists prevent_legal_document_content_changes on public.legal_documents;
drop function if exists public.prevent_legal_document_content_changes();
drop table if exists public.legal_documents;

create or replace function public.record_legal_document_acceptance(
  p_document_key text,
  p_document_version text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record legal acceptance';
  end if;

  insert into public.legal_document_acceptances (user_id, document_key, document_version)
  values (auth.uid(), p_document_key, p_document_version)
  on conflict (user_id, document_key, document_version) do nothing;
end;
$$;

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

  if nullif(new.raw_user_meta_data ->> 'terms_document_version', '') is not null then
    insert into public.legal_document_acceptances (user_id, document_key, document_version)
    values (
      new.id,
      'terms-and-conditions',
      new.raw_user_meta_data ->> 'terms_document_version'
    )
    on conflict (user_id, document_key, document_version) do nothing;
  end if;

  return new;
end;
$$;
