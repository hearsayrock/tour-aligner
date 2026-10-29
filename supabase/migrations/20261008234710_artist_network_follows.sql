begin;

create table public.artist_follows (
  follower_band_id uuid not null references public.bands(id) on delete cascade,
  followed_band_id uuid not null references public.bands(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_band_id, followed_band_id),
  constraint artist_follows_no_self_follow check (follower_band_id <> followed_band_id)
);

create index artist_follows_followed_band_idx on public.artist_follows (followed_band_id, follower_band_id);
alter table public.artist_follows enable row level security;
revoke all on public.artist_follows from public, anon, authenticated;
grant select, insert, delete on public.artist_follows to authenticated;

-- Only managers of either artist can read the relationship. Following is one-way;
-- it never grants permission to send messages or bypass chat approval/blocking.
create policy "artist_follows: select participants"
  on public.artist_follows for select to authenticated
  using (
    exists (select 1 from public.bands b where b.id = follower_band_id and b.user_id = (select auth.uid()))
    or exists (select 1 from public.bands b where b.id = followed_band_id and b.user_id = (select auth.uid()))
  );

create policy "artist_follows: insert owned artist"
  on public.artist_follows for insert to authenticated
  with check (
    exists (select 1 from public.bands b where b.id = follower_band_id and b.user_id = (select auth.uid()) and b.is_active)
    and exists (select 1 from public.bands b where b.id = followed_band_id and b.is_active)
  );

create policy "artist_follows: delete owned artist"
  on public.artist_follows for delete to authenticated
  using (exists (select 1 from public.bands b where b.id = follower_band_id and b.user_id = (select auth.uid())));

-- PostgREST applies range/count to this result, keeping directory pagination in
-- the database. Reuse the existing fuzzy search and rank similar artists by the
-- number of shared genres. This function retains the caller's RLS permissions.
create function public.search_artist_directory(
  p_artist_id uuid default null,
  p_view text default 'all',
  p_query text default '',
  p_genre_id uuid default null,
  p_radius text default '',
  p_artist_type text default ''
)
returns table (band_id uuid, shared_genre_count bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to browse artists.';
  end if;
  if p_view is null or p_view not in ('all', 'similar', 'following', 'followers') then
    raise exception 'Invalid artist directory view.';
  end if;
  if p_artist_id is not null and not exists (
    select 1 from public.bands b where b.id = p_artist_id and b.user_id = auth.uid() and b.is_active
  ) then
    raise exception 'Choose an artist profile you manage.';
  end if;
  if p_view <> 'all' and p_artist_id is null then
    raise exception 'Choose an artist profile first.';
  end if;

  return query
    select b.id, shared.genre_count
    from public.bands b
    cross join lateral (
      select count(*) as genre_count
      from public.band_genres candidate
      join public.band_genres own on own.genre_id = candidate.genre_id and own.band_id = p_artist_id
      where candidate.band_id = b.id
    ) shared
    left join public.search_bands_fuzzy(p_query) fuzzy on fuzzy.id = b.id
    where b.is_active
      and b.id is distinct from p_artist_id
      and (btrim(coalesce(p_query, '')) = '' or fuzzy.id is not null)
      and (coalesce(p_radius, '') = '' or b.touring_radius = p_radius)
      and (coalesce(p_artist_type, '') = '' or b.artist_type = p_artist_type)
      and (p_genre_id is null or exists (
        select 1 from public.band_genres bg where bg.band_id = b.id and bg.genre_id = p_genre_id
      ))
      and (p_view <> 'similar' or shared.genre_count > 0)
      and (p_view <> 'following' or exists (
        select 1 from public.artist_follows f where f.follower_band_id = p_artist_id and f.followed_band_id = b.id
      ))
      and (p_view <> 'followers' or exists (
        select 1 from public.artist_follows f where f.followed_band_id = p_artist_id and f.follower_band_id = b.id
      ))
    order by
      case when p_view = 'similar' then shared.genre_count else 0 end desc,
      case when btrim(coalesce(p_query, '')) <> '' then fuzzy.rank else 0 end desc nulls last,
      b.name, b.id;
end;
$$;

revoke all on function public.search_artist_directory(uuid, text, text, uuid, text, text) from public, anon;
grant execute on function public.search_artist_directory(uuid, text, text, uuid, text, text) to authenticated;

commit;
