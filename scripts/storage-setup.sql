-- ================================================
-- Supabase Storage Setup for Report Images
-- Run this in Supabase SQL Editor
-- ================================================

-- Create the storage bucket for report images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-images',
  'report-images',
  true,  -- Public bucket so images can be viewed
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');

-- Policy: Allow service role to upload (for API routes)
CREATE POLICY "Allow service role uploads"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'report-images');

-- Policy: Allow anyone to view images (public bucket)
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-images');

-- Policy: Allow service role to delete (for cleanup)
CREATE POLICY "Allow service role delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'report-images');
