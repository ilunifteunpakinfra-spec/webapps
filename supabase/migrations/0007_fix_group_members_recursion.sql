-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Fix RLS infinite recursion on group_members
-- Additive migration on top of 0006_fix_admin_set_role_unnest.sql
--
-- Bug: membuat/bergabung grup gagal dengan
--   ERROR 42P17: infinite recursion detected in policy for relation "group_members"
--
-- Policy "admin_manage_members" (FOR ALL) memuat subquery ke tabel yang
-- sama (SELECT ... FROM group_members), sehingga saat dievaluasi — mis.
-- saat INSERT anggota baru (creator sebagai admin_grup) — Postgres
-- mengevaluasi ulang policy yang sama di dalam subquery tanpa henti.
--
-- Perbaikan: cek keanggotaan admin_grup dipindah ke fungsi helper
-- SECURITY DEFINER (pola sama seperti is_admin()). Fungsi berjalan sebagai
-- pemilik tabel sehingga membaca group_members tanpa memicu RLS ulang.
-- ============================================

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND alumni_id = auth.uid()
      AND role = 'admin_grup'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_admin(UUID) TO authenticated;

DROP POLICY IF EXISTS "admin_manage_members" ON group_members;
CREATE POLICY "admin_manage_members"
  ON group_members FOR ALL
  USING (public.is_group_admin(group_id))
  WITH CHECK (public.is_group_admin(group_id));
