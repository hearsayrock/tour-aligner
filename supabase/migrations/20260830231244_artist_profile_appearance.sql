-- Give artists a small, deliberate design system for their public profile.
-- Keeping the settings in one JSON document makes it possible to add new visual
-- controls without turning the bands table into a list of presentational columns.
alter table public.bands
  add column if not exists profile_background_url text,
  add column if not exists profile_theme jsonb not null default '{"accent":"#FD6A2F","background":"paper","buttonStyle":"rounded"}'::jsonb;

alter table public.bands
  add constraint bands_profile_theme_is_object
  check (jsonb_typeof(profile_theme) = 'object') not valid;

alter table public.bands
  validate constraint bands_profile_theme_is_object;
