-- Extend profiles with fields needed for user profile & settings
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS primary_role      TEXT CHECK (primary_role IN ('artist', 'venue', 'both')),
  ADD COLUMN IF NOT EXISTS location_city     TEXT,
  ADD COLUMN IF NOT EXISTS location_state    TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'email' CHECK (preferred_contact IN ('email', 'phone')),
  ADD COLUMN IF NOT EXISTS notif_new_inquiry        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_inquiry_response   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_marketing          BOOLEAN DEFAULT FALSE;

-- Storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
