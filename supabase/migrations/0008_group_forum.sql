-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Forum Diskusi Grup
-- Additive migration on top of 0007_fix_group_members_recursion.sql
--
-- Fitur: forum diskusi per grup (thread + balasan), "layaknya media
-- komunikasi forum pada umumnya".
--
--   group_threads        : topik diskusi di dalam sebuah grup
--   group_thread_replies : balasan pada sebuah thread
--
-- Aturan akses:
--   - SELECT : publik (konsisten dengan halaman grup/member yang publik)
--   - INSERT : hanya anggota grup (helper is_group_member, SECURITY
--              DEFINER — pola sama seperti is_group_admin untuk menghindari
--              infinite recursion pada policy group_members)
--   - DELETE : penulis, admin_grup, atau admin dengan moderate_groups
-- ============================================

CREATE TABLE group_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  isi TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_thread_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES group_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES alumni(id) ON DELETE CASCADE,
  isi TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_group_threads_group ON group_threads (group_id, created_at DESC);
CREATE INDEX idx_group_thread_replies_thread ON group_thread_replies (thread_id, created_at);

ALTER TABLE group_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_thread_replies ENABLE ROW LEVEL SECURITY;

-- Helper: apakah user saat ini anggota grup tsb? SECURITY DEFINER agar
-- policy dapat mengecek keanggotaan tanpa memicu RLS ulang pada
-- group_members (menghindari infinite recursion, pola sama seperti
-- is_group_admin).
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id
      AND alumni_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_group_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated;

-- ============================================
-- GROUP THREADS POLICIES
-- ============================================
CREATE POLICY "public_read_group_threads"
  ON group_threads FOR SELECT
  USING (true);

CREATE POLICY "member_create_threads"
  ON group_threads FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_group_member(group_id)
  );

CREATE POLICY "author_manage_thread"
  ON group_threads FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "group_admin_manage_threads"
  ON group_threads FOR ALL
  USING (public.is_group_admin(group_id))
  WITH CHECK (public.is_group_admin(group_id));

CREATE POLICY "admin_bypass_group_threads"
  ON group_threads FOR ALL
  USING (is_admin());

-- ============================================
-- GROUP THREAD REPLIES POLICIES
-- ============================================
CREATE POLICY "public_read_group_thread_replies"
  ON group_thread_replies FOR SELECT
  USING (true);

CREATE POLICY "member_create_replies"
  ON group_thread_replies FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_group_member(
      (SELECT group_id FROM public.group_threads WHERE id = thread_id)
    )
  );

CREATE POLICY "author_manage_reply"
  ON group_thread_replies FOR ALL
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "group_admin_manage_replies"
  ON group_thread_replies FOR ALL
  USING (
    public.is_group_admin(
      (SELECT group_id FROM public.group_threads WHERE id = thread_id)
    )
  );

CREATE POLICY "admin_bypass_group_thread_replies"
  ON group_thread_replies FOR ALL
  USING (is_admin());
