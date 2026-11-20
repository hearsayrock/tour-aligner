begin;

create or replace function public.search_artist_directory(
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
    where b.is_active and b.page_published
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

-- Keep the published photos used by directory cards and operational views in sync.
create function public.studio_published_photos() returns trigger
language plpgsql set search_path = '' as $$
declare look jsonb := new.profile_theme->'studio';
begin
  if look ? 'avatar' then new.profile_photo_url := nullif(look->>'avatar',''); end if;
  if look ? 'cover' then new.cover_photo_url := nullif(look->>'cover',''); end if;
  if look ? 'wallpaper' then new.profile_background_url := nullif(look->>'wallpaper',''); end if;
  return new;
end $$;
create trigger studio_band_photos before update of profile_theme on public.bands
for each row execute function public.studio_published_photos();
create trigger studio_venue_photos before update of profile_theme on public.venues
for each row execute function public.studio_published_photos();
commit;
