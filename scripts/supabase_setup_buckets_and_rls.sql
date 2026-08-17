-- =========================================================================
-- CAMPUSBF - SUPABASE STORAGE & RLS SETUP SCRIPT
-- Project URL: https://xgwmqrinncjoqtiueyln.supabase.co
-- Purpose: Configure 'uploads', 'documents', 'assignments', 'videos' buckets
-- and grant Read, Download, and Upload permissions to Student & Teacher roles.
-- =========================================================================

-- 1. Create or update Storage Buckets with public access enabled
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('uploads', 'uploads', true, 52428800, NULL),
  ('documents', 'documents', true, 52428800, NULL),
  ('assignments', 'assignments', true, 52428800, NULL),
  ('videos', 'videos', true, 524288000, NULL)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable Row Level Security (RLS) on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop previous conflicting policies if any
DROP POLICY IF EXISTS "Public and Authenticated Students Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload for Authenticated and Public Users" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update on Uploads and Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete on Uploads and Documents" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for Students" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload for Students and Teachers" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update on Storage Objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete on Storage Objects" ON storage.objects;

-- 4. READ/DOWNLOAD POLICY:
-- Allows students, teachers, and public users to read and download any document or assignment
CREATE POLICY "Public and Authenticated Students Read Access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 5. UPLOAD POLICY:
-- Allows authenticated students and teachers (as well as anon public clients) to upload files
CREATE POLICY "Allow Upload for Authenticated and Public Users"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 6. UPDATE POLICY:
-- Allows updating files/metadata in these buckets
CREATE POLICY "Allow Update on Uploads and Documents"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));

-- 7. DELETE POLICY:
-- Allows deletion of files in these buckets
CREATE POLICY "Allow Delete on Uploads and Documents"
ON storage.objects FOR DELETE
USING (bucket_id IN ('uploads', 'documents', 'assignments', 'videos'));
