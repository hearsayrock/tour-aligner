-- Reverts 20260830231244_artist_profile_appearance.
alter table public.bands
  drop constraint if exists bands_profile_theme_is_object,
  drop column if exists profile_theme,
  drop column if exists profile_background_url;
