-- ============================================
-- 0018: Moderasi galeri (pre + pasca-moderasi)
-- ============================================
-- Alur status foto event_gallery:
--   pending ─(admin: setujui)─▶ active ─(admin: sembunyikan)─▶ hidden
--   pending ─(admin: tolak)─────────────────────────────────▶ hidden
--   hidden ─(super admin: pulihkan)─▶ active
--   hidden ─(super admin: hapus permanen)─▶ baris + file storage dihapus
--
-- Aturan visibilitas (SELECT):
--   - publik/anon        : hanya 'active'
--   - pemilik            : miliknya di semua status
--   - admin moderate_gallery : 'active' + 'pending' (bukan history hidden)
--   - super admin        : SEMUA baris (keseluruhan history)
--
-- Policy lama "admin_bypass_event_gallery" (FOR ALL) dipecah menjadi
-- tulis-saja agar admin biasa tidak bisa membaca history tersembunyi.

-- 1. Helper super admin (SECURITY DEFINER; aman untuk anon -> false)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_app_meta_data->>'role' = 'super_admin'
  );
$$;

-- Policy SELECT memanggil fungsi ini, jadi anon juga butuh EXECUTE
-- (pola sama dengan is_admin(); tanpa claims JWT hasilnya false).
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;

-- 2. Kolom status: baris lama otomatis 'active' (sudah terbit),
--    upload baru default 'pending' (menunggu moderasi).
ALTER TABLE public.event_gallery
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.event_gallery
  ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.event_gallery
  ADD CONSTRAINT event_gallery_status_check
  CHECK (status IN ('pending', 'active', 'hidden'));

CREATE INDEX IF NOT EXISTS idx_event_gallery_status
  ON public.event_gallery (status, created_at DESC);

-- 3a. Helper khusus policy: boleh memoderasi galeri?
-- Terpisah dari has_admin_capability() karena fungsi itu di-REVOKE dari
-- anon (kebijakan 0002), padahal policy SELECT harus bisa dievaluasi
-- untuk role anon tanpa error "permission denied". Pola sama seperti
-- is_admin() yang sengaja tetap bisa dipanggil anon.
CREATE OR REPLACE FUNCTION public.can_moderate_gallery()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND (
        raw_app_meta_data->>'role' = 'super_admin'
        OR (
          raw_app_meta_data->>'role' = 'admin'
          AND COALESCE(raw_app_meta_data->'capabilities', '[]'::jsonb) ? 'moderate_gallery'
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_moderate_gallery() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_moderate_gallery() TO anon, authenticated;

-- 3b. SELECT tercakup (menggantikan public_read_event_gallery)
DROP POLICY IF EXISTS "public_read_event_gallery" ON public.event_gallery;
CREATE POLICY "gallery_select_scoped"
  ON public.event_gallery FOR SELECT
  USING (
    status = 'active'
    OR alumni_id = auth.uid()
    OR (public.can_moderate_gallery() AND status = 'pending')
    OR public.is_super_admin()
  );

-- 4. INSERT pemilik wajib 'pending' (anti-bypass moderasi dari klien)
DROP POLICY IF EXISTS "auth_upload_event_photos" ON public.event_gallery;
CREATE POLICY "auth_upload_event_photos"
  ON public.event_gallery FOR INSERT
  WITH CHECK (alumni_id = auth.uid() AND status = 'pending');

-- 5. Pecah bypass FOR ALL menjadi tulis-saja
DROP POLICY IF EXISTS "admin_bypass_event_gallery" ON public.event_gallery;
CREATE POLICY "admin_insert_event_gallery"
  ON public.event_gallery FOR INSERT
  WITH CHECK (is_admin());
CREATE POLICY "admin_update_event_gallery"
  ON public.event_gallery FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY "admin_delete_event_gallery"
  ON public.event_gallery FOR DELETE
  USING (is_admin());