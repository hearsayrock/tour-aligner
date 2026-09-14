alter table public.venues
  add column profile_photo_url text,
  add column cover_photo_url text,
  add column profile_background_url text,
  add column profile_theme jsonb not null default '{}'::jsonb;

comment on column public.venues.profile_theme is
  'Versioned public venue page appearance and responsive layout configuration.';
