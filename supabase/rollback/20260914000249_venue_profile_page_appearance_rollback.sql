alter table public.venues
  drop column if exists profile_theme,
  drop column if exists profile_background_url,
  drop column if exists cover_photo_url,
  drop column if exists profile_photo_url;
