-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Fix bypass keanggotaan pada policy forum
-- Additive migration on top of 0008_group_forum.sql
--
-- Bug (ditemukan saat RLS smoke test): non-anggota grup berhasil membuat
-- thread. Penyebab: policy "author_manage_thread" / "author_manage_reply"
-- berjenis FOR ALL dengan WITH CHECK (author_id = auth.uid()). Untuk
-- perintah INSERT, Postgres meng-OR semua policy, sehingga policy author
-- mengizinkan siapa pun meng-insert thread/balasan atas namanya sendiri —
-- cek keanggotaan pada "member_create_*" menjadi tidak efektif.
--
-- Perbaikan:
--   1. Policy author & admin_grup dibatasi ke DELETE saja (tidak ada UI
--      edit, jadi UPDATE tidak diperlukan).
--   2. WITH CHECK pada "member_create_*" ditambah author_id = auth.uid()
--      agar penulis konten tidak bisa di-spoof via PostgREST langsung.
-- ============================================

-- ---------- group_threads ----------
DROP POLICY IF EXISTS "author_manage_thread" ON group_threads;
DROP POLICY IF EXISTS "group_admin_manage_threads" ON group_threads;
DROP POLICY IF EXISTS "member_create_threads" ON group_threads;

CREATE POLICY "member_create_threads"
  ON group_threads FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND author_id = auth.uid()
    AND public.is_group_member(group_id)
  );

CREATE POLICY "author_delete_thread"
  ON group_threads FOR DELETE
  USING (author_id = auth.uid());

CREATE POLICY "group_admin_delete_threads"
  ON group_threads FOR DELETE
  USING (public.is_group_admin(group_id));

-- ---------- group_thread_replies ----------
DROP POLICY IF EXISTS "author_manage_reply" ON group_thread_replies;
DROP POLICY IF EXISTS "group_admin_manage_replies" ON group_thread_replies;
DROP POLICY IF EXISTS "member_create_replies" ON group_thread_replies;

CREATE POLICY "member_create_replies"
  ON group_thread_replies FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND author_id = auth.uid()
    AND public.is_group_member(
      (SELECT group_id FROM public.group_threads WHERE id = thread_id)
    )
  );

CREATE POLICY "author_delete_reply"
  ON group_thread_replies FOR DELETE
  USING (author_id = auth.uid());

CREATE POLICY "group_admin_delete_replies"
  ON group_thread_replies FOR DELETE
  USING (
    public.is_group_admin(
      (SELECT group_id FROM public.group_threads WHERE id = thread_id)
    )
  );
