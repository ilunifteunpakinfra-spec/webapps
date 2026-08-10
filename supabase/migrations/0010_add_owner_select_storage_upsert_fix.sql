-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Restore owner-scoped SELECT policies on storage.objects
-- Additive migration (fix foto upload RLS error 42501)
--
-- Bug: "Edit Profil -> Unggah Foto" gagal dengan notifikasi:
--   new row violates row-level security policy for table "objects"
--
-- Penyebab: migration `security_hardening_search_path_storage_listing`
-- sebelumnya menghapus SEMUA policy SELECT di storage.objects untuk meredam
-- lint 0025 (public_bucket_allows_listing). Padahal upload avatar/resume
-- memakai storage.upload(..., { upsert: true }) yang mengeksekusi
-- INSERT ... ON CONFLICT -- PostgreSQL butuh policy SELECT agar baris yang
-- konflik terlihat oleh role yang sama; tanpa itu upsert gagal (42501).
--
-- Fix: tambahkan kembali policy SELECT yang scoped ke folder milik user
-- (bucket_id + folder pertama = auth.uid()). Policy ini TIDAK membuka
-- listing publik -- hanya pemilik folder yang bisa melihat objeknya sendiri,
-- sehingga lint 0025 tetap bersih.
-- ============================================

-- ---------- avatars ----------
DROP POLICY IF EXISTS "auth_select_own_avatars" ON storage.objects;
CREATE POLICY "auth_select_own_avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- resumes ----------
DROP POLICY IF EXISTS "auth_select_own_resumes" ON storage.objects;
CREATE POLICY "auth_select_own_resumes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- gallery ----------
DROP POLICY IF EXISTS "auth_select_own_gallery" ON storage.objects;
CREATE POLICY "auth_select_own_gallery"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
