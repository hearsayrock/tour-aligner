with duplicate_entries as (
  select
    id,
    row_number() over (
      partition by lower(trim(email))
      order by created_at asc, id asc
    ) as row_number
  from public.artist_waitlist_entries
)
delete from public.artist_waitlist_entries
where id in (
  select id
  from duplicate_entries
  where row_number > 1
);

drop index if exists public.artist_waitlist_entries_email_idx;

create unique index artist_waitlist_entries_email_unique_idx
  on public.artist_waitlist_entries(lower(trim(email)));
