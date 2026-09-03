-- ============================================================
-- TourAligner — Fix Legal Acceptance RPC Permissions
-- Migration: 20260903204406
-- ============================================================

-- The acceptance table deliberately has no client insert policy. This narrowly
-- scoped function therefore runs with the owner's table privileges, but it can
-- only write the current authenticated user's acceptance for a current document.
create or replace function public.record_legal_document_acceptance(
  p_document_key text,
  p_document_version text
)
returns void
language plpgsql
security definer
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

revoke all on function public.record_legal_document_acceptance(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.record_legal_document_acceptance(text, text) to authenticated;
