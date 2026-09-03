-- ============================================================
-- TourAligner — Legal Document Registry and Current Terms Gate
-- Migration: 20260903202233
-- ============================================================

create table public.legal_documents (
  document_key text not null,
  document_version text not null,
  title text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  is_current boolean not null default false,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (document_key, document_version)
);

create unique index legal_documents_one_current_version_idx
  on public.legal_documents (document_key)
  where is_current;

-- This hash is calculated from the published Terms source for the version
-- identified below. A revised Terms document must be a new row/version.
insert into public.legal_documents (
  document_key,
  document_version,
  title,
  content_hash,
  is_current
)
values (
  'terms-and-conditions',
  '2026-09-03-draft',
  'TourAligner Terms and Conditions',
  '00ae4f2012cb6e849c26a249ef51c9568ca48428c80e05768180edb29dec6929',
  true
);

alter table public.legal_documents enable row level security;

create policy "legal_documents: public read"
  on public.legal_documents for select
  to anon, authenticated
  using (true);

-- Legal text and its version are immutable after publication. The only
-- permitted change is switching which version is current for a document key.
create or replace function public.prevent_legal_document_content_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.document_key is distinct from old.document_key
    or new.document_version is distinct from old.document_version
    or new.title is distinct from old.title
    or new.content_hash is distinct from old.content_hash
    or new.published_at is distinct from old.published_at
  then
    raise exception 'Published legal document content is immutable; create a new version instead';
  end if;

  return new;
end;
$$;

create trigger prevent_legal_document_content_changes
  before update on public.legal_documents
  for each row execute procedure public.prevent_legal_document_content_changes();

create or replace function public.prevent_legal_document_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Published legal documents cannot be deleted';
end;
$$;

create trigger prevent_legal_document_deletion
  before delete on public.legal_documents
  for each row execute procedure public.prevent_legal_document_deletion();

alter table public.legal_document_acceptances
  add column document_content_hash text;

update public.legal_document_acceptances acceptance
set document_content_hash = document.content_hash
from public.legal_documents document
where document.document_key = acceptance.document_key
  and document.document_version = acceptance.document_version;

alter table public.legal_document_acceptances
  alter column document_content_hash set not null,
  add constraint legal_document_acceptances_document_version_fkey
    foreign key (document_key, document_version)
    references public.legal_documents (document_key, document_version)
    on delete restrict;

create or replace function public.record_legal_document_acceptance(
  p_document_key text,
  p_document_version text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_content_hash text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to record legal acceptance';
  end if;

  select content_hash
  into v_content_hash
  from public.legal_documents
  where document_key = p_document_key
    and document_version = p_document_version
    and is_current;

  if v_content_hash is null then
    raise exception 'Only the current published legal document can be accepted';
  end if;

  insert into public.legal_document_acceptances (
    user_id,
    document_key,
    document_version,
    document_content_hash
  )
  values (auth.uid(), p_document_key, p_document_version, v_content_hash)
  on conflict (user_id, document_key, document_version) do nothing;
end;
$$;

-- Keep email-confirmation sign-ups on the same authoritative current version
-- path as social sign-ups. If code and the published registry get out of sync,
-- no acceptance is created and middleware will send the user to the gate.
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

  insert into public.legal_document_acceptances (
    user_id,
    document_key,
    document_version,
    document_content_hash
  )
  select
    new.id,
    document.document_key,
    document.document_version,
    document.content_hash
  from public.legal_documents document
  where document.document_key = 'terms-and-conditions'
    and document.document_version = new.raw_user_meta_data ->> 'terms_document_version'
    and document.is_current
  on conflict (user_id, document_key, document_version) do nothing;

  return new;
end;
$$;
