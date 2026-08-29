drop index if exists public.artist_waitlist_entries_email_unique_idx;

create index artist_waitlist_entries_email_idx
  on public.artist_waitlist_entries(lower(email));

-- Rows removed by the forward migration cannot be safely restored.
