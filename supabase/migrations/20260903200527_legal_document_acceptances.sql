-- ============================================================
-- TourAligner — Legal Document Acceptances
-- Migration: 20260903200527
-- ============================================================

create table public.legal_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_key text not null,
  document_version text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, document_key, document_version)
);

create index legal_document_acceptances_user_id_idx
  on public.legal_document_acceptances (user_id, accepted_at desc);

alter table public.legal_document_acceptances enable row level security;

create policy "legal_document_acceptances: users read own"
  on public.legal_document_acceptances for select
  to authenticated
  using (user_id = auth.uid());

-- Acceptance is recorded through this function so the user ID and timestamp
-- always come from the authenticated database session.
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

grant execute on function public.record_legal_document_acceptance(text, text) to authenticated;
revoke execute on function public.record_legal_document_acceptance(text, text) from public;

-- Email sign-ups include the version selected in the sign-up form. Capturing it
-- in the auth trigger also works when email confirmation delays the first session.
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
