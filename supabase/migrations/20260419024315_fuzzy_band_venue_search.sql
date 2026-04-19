create extension if not exists pg_trgm with schema extensions;

create index if not exists bands_name_trgm_idx
on public.bands
using gin (lower(name) extensions.gin_trgm_ops);

create index if not exists bands_tagline_trgm_idx
on public.bands
using gin (lower(coalesce(tagline, '')) extensions.gin_trgm_ops);

create index if not exists bands_location_city_trgm_idx
on public.bands
using gin (lower(coalesce(location_city, '')) extensions.gin_trgm_ops);

create index if not exists venues_name_trgm_idx
on public.venues
using gin (lower(name) extensions.gin_trgm_ops);

create index if not exists venues_location_city_trgm_idx
on public.venues
using gin (lower(coalesce(location_city, '')) extensions.gin_trgm_ops);

create or replace function public.search_bands_fuzzy(p_query text)
returns table (id uuid, rank real)
language sql
stable
security definer
set search_path = ''
as $$
  with normalized as (
    select lower(trim(p_query)) as q
  )
  select
    b.id,
    greatest(
      case when lower(b.name) like '%' || normalized.q || '%' then 1.0 else 0 end,
      extensions.similarity(lower(b.name), normalized.q) * 1.35,
      extensions.word_similarity(normalized.q, lower(b.name)) * 1.5,
      extensions.similarity(lower(coalesce(b.tagline, '')), normalized.q) * 0.6,
      extensions.word_similarity(normalized.q, lower(coalesce(b.tagline, ''))) * 0.75,
      extensions.similarity(lower(coalesce(b.location_city, '')), normalized.q) * 0.45
    )::real as rank
  from public.bands b
  cross join normalized
  where
    b.is_active = true
    and normalized.q <> ''
    and (
      lower(b.name) like '%' || normalized.q || '%'
      or lower(coalesce(b.tagline, '')) like '%' || normalized.q || '%'
      or lower(coalesce(b.location_city, '')) like '%' || normalized.q || '%'
      or extensions.similarity(lower(b.name), normalized.q) >= 0.22
      or extensions.word_similarity(normalized.q, lower(b.name)) >= 0.5
      or extensions.similarity(lower(coalesce(b.tagline, '')), normalized.q) >= 0.3
      or extensions.word_similarity(normalized.q, lower(coalesce(b.tagline, ''))) >= 0.55
      or extensions.similarity(lower(coalesce(b.location_city, '')), normalized.q) >= 0.35
    )
  order by rank desc, b.name asc
  limit 250;
$$;

grant execute on function public.search_bands_fuzzy(text) to anon, authenticated;

create or replace function public.search_venues_fuzzy(p_query text)
returns table (id uuid, rank real)
language sql
stable
security definer
set search_path = ''
as $$
  with normalized as (
    select lower(trim(p_query)) as q
  )
  select
    v.id,
    greatest(
      case when lower(v.name) like '%' || normalized.q || '%' then 1.0 else 0 end,
      extensions.similarity(lower(v.name), normalized.q) * 1.35,
      extensions.word_similarity(normalized.q, lower(v.name)) * 1.5,
      extensions.similarity(lower(coalesce(v.location_city, '')), normalized.q) * 0.55,
      extensions.word_similarity(normalized.q, lower(coalesce(v.location_city, ''))) * 0.7
    )::real as rank
  from public.venues v
  cross join normalized
  where
    v.is_active = true
    and normalized.q <> ''
    and (
      lower(v.name) like '%' || normalized.q || '%'
      or lower(coalesce(v.location_city, '')) like '%' || normalized.q || '%'
      or extensions.similarity(lower(v.name), normalized.q) >= 0.22
      or extensions.word_similarity(normalized.q, lower(v.name)) >= 0.5
      or extensions.similarity(lower(coalesce(v.location_city, '')), normalized.q) >= 0.35
    )
  order by rank desc, v.name asc
  limit 250;
$$;

grant execute on function public.search_venues_fuzzy(text) to anon, authenticated;
