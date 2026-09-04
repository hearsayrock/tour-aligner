-- Manual rollback: restore the prior Terms version as current.
-- Published legal-document rows are immutable and cannot be deleted, so the
-- 2026-09-04 row remains available for its existing acceptance audit trail.
begin;

update public.legal_documents
set is_current = false
where document_key = 'terms-and-conditions'
  and document_version = '2026-09-04';

update public.legal_documents
set is_current = true
where document_key = 'terms-and-conditions'
  and document_version = '2026-09-03-draft';

commit;
