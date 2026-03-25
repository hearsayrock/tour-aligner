-- Add profile photo, cover photo, artist type, and set length to bands
ALTER TABLE bands
  ADD COLUMN IF NOT EXISTS profile_photo_url  TEXT,
  ADD COLUMN IF NOT EXISTS cover_photo_url    TEXT,
  ADD COLUMN IF NOT EXISTS artist_type        TEXT CHECK (artist_type IN ('solo', 'band')),
  ADD COLUMN IF NOT EXISTS set_length_min     INTEGER CHECK (set_length_min > 0);

-- ─────────────────────────────────────────────────────────────
-- Storage bucket for band images
-- ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('band-images', 'band-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "band_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'band-images');

-- Authenticated users can upload
CREATE POLICY "band_images_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'band-images' AND auth.role() = 'authenticated');

-- Authenticated users can update (upsert)
CREATE POLICY "band_images_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'band-images' AND auth.role() = 'authenticated');

-- Authenticated users can delete their own uploads
CREATE POLICY "band_images_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'band-images' AND auth.role() = 'authenticated');
