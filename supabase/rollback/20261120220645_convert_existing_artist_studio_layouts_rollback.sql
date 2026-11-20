begin;
-- Restore the exact pre-conversion design alongside later Studio edits. The
-- preceding app reads the legacy keys and ignores the nested Studio settings.
update public.bands b set profile_theme = coalesce(a.profile_theme,'{}'::jsonb) ||
  case when b.profile_theme ? 'studio' then jsonb_build_object('studio',b.profile_theme->'studio') else '{}'::jsonb end
from studio_recovery.artist_looks_20261120220645 a where b.id=a.id;
-- Old clients cannot resolve Studio media routes. Restore their previous images
-- and retain new media references in the Studio look for subsequent recovery.
update public.bands b set
  profile_photo_url=case when b.profile_photo_url like '/studio-media/%' then a.profile_photo_url else b.profile_photo_url end,
  cover_photo_url=case when b.cover_photo_url like '/studio-media/%' then a.cover_photo_url else b.cover_photo_url end,
  profile_background_url=case when b.profile_background_url like '/studio-media/%' then a.profile_background_url else b.profile_background_url end
from studio_recovery.artist_looks_20261120220645 a where b.id=a.id;
drop table studio_recovery.artist_looks_20261120220645;
commit;
