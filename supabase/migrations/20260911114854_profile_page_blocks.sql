create table public.profile_page_blocks (
  id uuid primary key default gen_random_uuid(),
  band_id uuid references public.bands(id) on delete cascade,
  venue_id uuid references public.venues(id) on delete cascade,
  block_type text not null,
  schema_version integer not null default 1,
  content jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_page_blocks_one_profile check (num_nonnulls(band_id, venue_id) = 1),
  constraint profile_page_blocks_known_type check (
    block_type in ('custom', 'gallery', 'video', 'quote', 'booking_cta', 'divider')
  ),
  constraint profile_page_blocks_content_object check (jsonb_typeof(content) = 'object'),
  constraint profile_page_blocks_settings_object check (jsonb_typeof(settings) = 'object')
);

create index profile_page_blocks_band_idx on public.profile_page_blocks(band_id);
create index profile_page_blocks_venue_idx on public.profile_page_blocks(venue_id);

create trigger set_profile_page_blocks_updated_at
  before update on public.profile_page_blocks
  for each row execute procedure public.set_updated_at();

alter table public.profile_page_blocks enable row level security;

create policy "Public can view active profile page blocks"
  on public.profile_page_blocks for select
  using (
    exists (
      select 1 from public.bands
      where bands.id = profile_page_blocks.band_id
        and (bands.is_active or bands.user_id = auth.uid())
    )
    or exists (
      select 1 from public.venues
      where venues.id = profile_page_blocks.venue_id
        and ((venues.is_active and not venues.is_unlisted) or venues.claimed_by_user_id = auth.uid())
    )
  );

create policy "Profile owners can insert page blocks"
  on public.profile_page_blocks for insert
  with check (
    exists (
      select 1 from public.bands
      where bands.id = profile_page_blocks.band_id
        and bands.user_id = auth.uid()
    )
    or exists (
      select 1 from public.venues
      where venues.id = profile_page_blocks.venue_id
        and venues.claimed_by_user_id = auth.uid()
    )
  );

create policy "Profile owners can update page blocks"
  on public.profile_page_blocks for update
  using (
    exists (
      select 1 from public.bands
      where bands.id = profile_page_blocks.band_id
        and bands.user_id = auth.uid()
    )
    or exists (
      select 1 from public.venues
      where venues.id = profile_page_blocks.venue_id
        and venues.claimed_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bands
      where bands.id = profile_page_blocks.band_id
        and bands.user_id = auth.uid()
    )
    or exists (
      select 1 from public.venues
      where venues.id = profile_page_blocks.venue_id
        and venues.claimed_by_user_id = auth.uid()
    )
  );

create policy "Profile owners can delete page blocks"
  on public.profile_page_blocks for delete
  using (
    exists (
      select 1 from public.bands
      where bands.id = profile_page_blocks.band_id
        and bands.user_id = auth.uid()
    )
    or exists (
      select 1 from public.venues
      where venues.id = profile_page_blocks.venue_id
        and venues.claimed_by_user_id = auth.uid()
    )
  );
