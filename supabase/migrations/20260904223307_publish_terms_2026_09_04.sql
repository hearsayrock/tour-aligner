-- Publish the completed Utah-governed Terms as a new immutable version.
-- Previous acceptance records remain tied to the prior version and users must
-- accept this version before passing the Terms gate.
begin;

update public.legal_documents
set is_current = false
where document_key = 'terms-and-conditions'
  and is_current;

insert into public.legal_documents (
  document_key,
  document_version,
  title,
  content_hash,
  is_current
)
values (
  'terms-and-conditions',
  '2026-09-04',
  'TourAligner Terms and Conditions',
  '19919c898590fdf32d4eff659c270599b84d0c6612954d47ca2fcac0ccd6de6c',
  true
);

commit;
