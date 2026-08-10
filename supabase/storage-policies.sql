-- ============================================
-- ILUNI FTE WebApps - Storage Bucket Policies
-- ============================================
-- Apply AFTER supabase/schema.sql (buckets must
-- already exist: avatars, resumes, gallery).
-- Idempotent: safe to re-run (policies are
-- dropped before being recreated).
--
-- App upload paths (client-side, anon key):
--   avatars: <uid>/avatar.jpg   (upsert)
--   resumes: <uid>/resume.pdf   (upsert, private)
--   gallery: <uid>/<timestamp>.jpg
-- ============================================

-- ------------------------------------------------------------
-- 1. avatars (public bucket)
--    Object URLs are CDN-served (no public listing — lint 0025).
--    Owner-scoped SELECT is REQUIRED for upsert: storage.upload with
--    { upsert: true } runs INSERT ... ON CONFLICT, which fails (42501)
--    when the conflicting row is not visible to the role.
--    Own-folder write (INSERT/UPDATE/DELETE)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "auth_select_own_avatars" ON storage.objects;
CREATE POLICY "auth_select_own_avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_upload_avatars" ON storage.objects;
CREATE POLICY "auth_upload_avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_update_avatars" ON storage.objects;
CREATE POLICY "auth_update_avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_delete_avatars" ON storage.objects;
CREATE POLICY "auth_delete_avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 2. resumes (private bucket - NO public read)
--    Own-folder write only; owner-scoped SELECT for upsert (see avatars).
--    Resume is shown as a status badge;
--    add a signed-URL route before making it downloadable.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "auth_select_own_resumes" ON storage.objects;
CREATE POLICY "auth_select_own_resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_upload_resumes" ON storage.objects;
CREATE POLICY "auth_upload_resumes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_update_resumes" ON storage.objects;
CREATE POLICY "auth_update_resumes"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 3. gallery (public bucket)
--    Object URLs are CDN-served (no public listing — lint 0025).
--    Owner-scoped SELECT for upsert-capable clients (see avatars).
--    Own-folder insert (no update/delete yet)
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "auth_select_own_gallery" ON storage.objects;
CREATE POLICY "auth_select_own_gallery"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "auth_upload_gallery" ON storage.objects;
CREATE POLICY "auth_upload_gallery"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
