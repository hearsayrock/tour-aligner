create table public.band_lyrics (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index band_lyrics_band_id_sort_order_idx
  on public.band_lyrics(band_id, sort_order, created_at);

create trigger set_band_lyrics_updated_at
  before update on public.band_lyrics
  for each row execute procedure public.set_updated_at();

alter table public.band_lyrics enable row level security;

create policy "band_lyrics: select public active band"
  on public.band_lyrics for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.bands
      where bands.id = band_lyrics.band_id
        and bands.is_active = true
    )
  );

create policy "band_lyrics: owner manage"
  on public.band_lyrics for all
  to authenticated
  using (
    auth.uid() = (
      select user_id
      from public.bands
      where bands.id = band_lyrics.band_id
    )
  )
  with check (
    auth.uid() = (
      select user_id
      from public.bands
      where bands.id = band_lyrics.band_id
    )
  );

grant select on public.band_lyrics to anon, authenticated;
grant insert, update, delete on public.band_lyrics to authenticated;
