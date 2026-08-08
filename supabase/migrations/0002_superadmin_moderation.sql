-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Superadmin Moderation (Phase 1)
-- Additive migration on top of 0001_init.sql
--
-- 1. New tables: content_reports, admin_activity_log
-- 2. Role + capabilities moved to auth.users.raw_app_meta_data
--    (server-managed; raw_user_meta_data is client-mergeable)
-- 3. is_admin() re-pointed to read raw_app_meta_data
-- 4. New SECURITY DEFINER RPCs (SET search_path = '', fully-qualified)
-- 5. RLS for the new tables
-- 6. Grants: new RPCs callable by authenticated only (never anon)
-- ============================================

-- ============================================
-- 8.1 NEW TABLES
-- ============================================

-- Community reports (any authenticated user can flag content)
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.alumni(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN
    ('job', 'announcement', 'poll', 'group', 'gallery', 'profile')),
  target_id UUID NOT NULL,
  alasan TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_by UUID REFERENCES public.alumni(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_content_reports_status
  ON content_reports (status, created_at DESC);

-- Audit trail of admin actions
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.alumni(id) ON DELETE SET NULL,
  aksi TEXT NOT NULL,          -- e.g. 'verify_alumni', 'set_role', 'ban_user'
  target_type TEXT,            -- e.g. 'alumni', 'auth.users', 'job_postings'
  target_id UUID,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created
  ON admin_activity_log (created_at DESC);

-- ============================================
-- 8.2 RE-POINT is_admin() TO APP_META
-- ============================================
-- raw_app_meta_data is server-managed only (Supabase Auth admin API /
-- RPCs). A client calling updateUser({data:{...}}) can never forge it.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_app_meta_data->>'role' IN ('super_admin', 'admin')
  );
END;
$$;

-- ============================================
-- 8.3 NEW SECURITY DEFINER RPCs
-- ============================================

-- Capability check (defense in depth; mirrors is_admin pattern).
-- super_admin implicitly holds every capability.
CREATE OR REPLACE FUNCTION public.has_admin_capability(cap TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meta jsonb;
BEGIN
  SELECT raw_app_meta_data INTO meta FROM auth.users WHERE id = auth.uid();
  IF meta->>'role' = 'super_admin' THEN RETURN true; END IF;
  RETURN COALESCE(meta->'capabilities', '[]'::jsonb) ? cap;
END;
$$;

-- Promote/demote + grant capabilities. super_admin ONLY (checked inside
-- the function against the caller's own app_meta role).
CREATE OR REPLACE FUNCTION public.admin_set_role(
  target_uid UUID,
  new_role TEXT,
  capabilities TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role TEXT;
  target_meta jsonb;
  valid_caps TEXT[] := ARRAY[
    'manage_users', 'manage_alumni', 'moderate_jobs',
    'moderate_announcements', 'moderate_polls', 'moderate_groups',
    'moderate_gallery', 'moderate_reports', 'view_audit', 'import_export'
  ];
  effective_caps TEXT[];
BEGIN
  SELECT raw_app_meta_data->>'role' INTO caller_role
  FROM auth.users WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'super_admin' THEN RETURN false; END IF;

  IF new_role NOT IN ('super_admin', 'admin', 'alumni') THEN RETURN false; END IF;

  SELECT raw_app_meta_data INTO target_meta FROM auth.users WHERE id = target_uid;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Never demote the last remaining super_admin.
  IF (target_meta->>'role') = 'super_admin' AND new_role <> 'super_admin' THEN
    IF (SELECT count(*) FROM auth.users
        WHERE raw_app_meta_data->>'role' = 'super_admin') <= 1 THEN
      RETURN false;
    END IF;
  END IF;

  -- Strip capabilities not in the whitelist; non-admins get none.
  IF new_role = 'admin' THEN
    SELECT ARRAY(SELECT unnest(capabilities) WHERE unnest = ANY(valid_caps))
      INTO effective_caps;
  ELSE
    effective_caps := ARRAY[]::TEXT[];
  END IF;

  UPDATE auth.users SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', new_role, 'capabilities', to_jsonb(effective_caps))
  WHERE id = target_uid;
  RETURN FOUND;
END;
$$;

-- Ban / unban accounts. Requires super_admin or the manage_users capability.
-- banned_until is enforced by Supabase Auth itself at login time.
CREATE OR REPLACE FUNCTION public.admin_ban_user(target_uid UUID, until_ts TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_capability('manage_users') THEN RETURN false; END IF;
  UPDATE auth.users SET banned_until = until_ts WHERE id = target_uid;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unban_user(target_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_capability('manage_users') THEN RETURN false; END IF;
  UPDATE auth.users SET banned_until = NULL WHERE id = target_uid;
  RETURN FOUND;
END;
$$;

-- Audit log writer (any admin; appends to admin_activity_log).
CREATE OR REPLACE FUNCTION public.admin_log_activity(
  p_aksi TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_detail JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN false; END IF;
  INSERT INTO public.admin_activity_log (admin_id, aksi, target_type, target_id, detail)
  VALUES (auth.uid(), p_aksi, p_target_type, p_target_id, p_detail);
  RETURN true;
END;
$$;

-- List auth.users joined with alumni (admins only) for the users page.
CREATE OR REPLACE FUNCTION public.admin_list_users(p_search TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  email TEXT,
  nama TEXT,
  angkatan TEXT,
  role TEXT,
  capabilities TEXT[],
  status_verifikasi BOOLEAN,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN; END IF;
  RETURN QUERY
  SELECT u.id,
         u.email::TEXT,
         a.nama,
         a.angkatan,
         u.raw_app_meta_data->>'role' AS role,
         ARRAY(SELECT jsonb_array_elements_text(u.raw_app_meta_data->'capabilities')) AS capabilities,
         a.status_verifikasi,
         u.banned_until,
         u.created_at
  FROM auth.users u
  LEFT JOIN public.alumni a ON a.id = u.id
  WHERE p_search = ''
     OR u.email ILIKE '%' || p_search || '%'
     OR a.nama ILIKE '%' || p_search || '%'
  ORDER BY u.created_at DESC;
END;
$$;

-- One-time migration: copy existing role claims from user_meta -> app_meta.
-- Called at the end of this migration; idempotent.
CREATE OR REPLACE FUNCTION public.admin_migrate_roles()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, raw_user_meta_data->>'role' AS role
    FROM auth.users
    WHERE raw_app_meta_data->>'role' IS NULL
      AND raw_user_meta_data->>'role' IS NOT NULL
  LOOP
    UPDATE auth.users SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', r.role, 'capabilities', to_jsonb(ARRAY[]::TEXT[]))
    WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- ============================================
-- 8.4 NEW-USER ROLE SYNC (auth.users INSERT trigger)
-- ============================================
-- Every new signup gets app_meta role 'alumni' (never trusts client-
-- supplied metadata). Admin API users that already carry app_metadata
-- role are left untouched. SECURITY INVOKER: the INSERT is performed by
-- the auth service / service role, so no DEFINER escalation is needed.
CREATE OR REPLACE FUNCTION public.auth_sync_app_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.raw_app_meta_data IS NULL OR NEW.raw_app_meta_data->>'role' IS NULL THEN
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', 'alumni', 'capabilities', to_jsonb(ARRAY[]::TEXT[]));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_sync_app_role ON auth.users;
CREATE TRIGGER trg_auth_sync_app_role
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auth_sync_app_role();

-- ============================================
-- 8.5 RLS FOR NEW TABLES
-- ============================================

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_report_content" ON public.content_reports;
CREATE POLICY "auth_report_content"
  ON public.content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_reports" ON public.content_reports;
CREATE POLICY "admin_manage_reports"
  ON public.content_reports FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "reporter_view_own" ON public.content_reports;
CREATE POLICY "reporter_view_own"
  ON public.content_reports FOR SELECT
  USING (reporter_id = auth.uid());

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_activity" ON public.admin_activity_log;
CREATE POLICY "admin_read_activity"
  ON public.admin_activity_log FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_write_activity" ON public.admin_activity_log;
CREATE POLICY "admin_write_activity"
  ON public.admin_activity_log FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================
-- 8.6 GRANTS
-- ============================================
-- New admin RPCs: authenticated only (never anon). The functions still
-- enforce their own admin/super_admin checks internally.
-- Note: REVOKE FROM PUBLIC is required — Supabase auto-grants new
-- functions to anon/authenticated/service_role, and a plain
-- `REVOKE ... FROM anon` does not override the PUBLIC grant.
-- is_admin() intentionally keeps anon EXECUTE (15 RLS policies depend on it).

REVOKE EXECUTE ON FUNCTION public.has_admin_capability(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_capability(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_role(UUID, TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(UUID, TEXT, TEXT[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_ban_user(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ban_user(UUID, TIMESTAMPTZ) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_unban_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unban_user(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_log_activity(TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_log_activity(TEXT, TEXT, UUID, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(TEXT) TO authenticated;

-- One-time maintenance RPC: service role only.
REVOKE EXECUTE ON FUNCTION public.admin_migrate_roles() FROM PUBLIC, anon, authenticated;

-- ============================================
-- 8.7 BACKFILL EXISTING USERS
-- ============================================
-- Copies the current raw_user_meta_data role claims into
-- raw_app_meta_data so existing admins keep their access.
SELECT public.admin_migrate_roles();
