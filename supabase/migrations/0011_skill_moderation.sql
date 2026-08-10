-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Skill Moderation Workflow
-- Additive migration on top of 0010_add_owner_select_storage_upsert_fix.sql
--
-- 1. skills: status / requested_by / created_at columns
-- 2. RLS: public reads only approved skills; authenticated users may only
--    submit NEW pending requests attributed to themselves
-- 3. request_skill() SECURITY DEFINER RPC for the free-text request flow
-- 4. New capability: moderate_skills (whitelisted in admin_set_role)
-- ============================================

-- ------------------------------------------------------------------
-- 1. SCHEMA
-- ------------------------------------------------------------------
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CONSTRAINT skills_status_check CHECK (status IN ('approved', 'pending', 'rejected')),
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES public.alumni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_skills_status ON public.skills (status, nama_skill);

-- ------------------------------------------------------------------
-- 2. RLS POLICIES
-- ------------------------------------------------------------------
-- Public can only see approved skills (directory filter, profile dropdown).
DROP POLICY IF EXISTS "public_read_skills" ON public.skills;
CREATE POLICY "public_read_skills"
  ON public.skills FOR SELECT
  USING (status = 'approved');

-- Authenticated users may only submit NEW pending requests for themselves.
-- Approving/rejecting is an admin action (existing admin_bypass_skills).
DROP POLICY IF EXISTS "auth_insert_skills" ON public.skills;
CREATE POLICY "auth_insert_skills"
  ON public.skills FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND status = 'pending'
    AND requested_by = auth.uid()
  );

-- ------------------------------------------------------------------
-- 3. request_skill() RPC
-- ------------------------------------------------------------------
-- Handles the free-text skill request flow server-side:
--   - existing approved skill  -> rate it directly on the user's profile
--   - existing pending request -> inform that it awaits moderation
--   - existing rejected skill  -> inform that the name was rejected
--   - otherwise                -> create a new pending request
-- SECURITY DEFINER with empty search_path; callable by authenticated only.
CREATE OR REPLACE FUNCTION public.request_skill(
  p_nama TEXT,
  p_kategori TEXT,
  p_level INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nama TEXT;
  v_skill_id UUID;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Silakan masuk terlebih dahulu.');
  END IF;

  v_nama := trim(regexp_replace(p_nama, '\s+', ' ', 'g'));
  IF char_length(v_nama) < 2 OR char_length(v_nama) > 60 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Nama keahlian harus 2-60 karakter.');
  END IF;
  IF p_kategori NOT IN ('hard', 'soft') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Kategori keahlian tidak valid.');
  END IF;
  IF p_level < 1 OR p_level > 5 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Level keahlian harus antara 1 dan 5.');
  END IF;

  SELECT id, status INTO v_skill_id, v_status
  FROM public.skills
  WHERE nama_skill ILIKE v_nama
  ORDER BY CASE status WHEN 'approved' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END
  LIMIT 1;

  -- New skill request (pending moderation).
  IF v_skill_id IS NULL THEN
    INSERT INTO public.skills (nama_skill, kategori, status, requested_by)
    VALUES (v_nama, p_kategori, 'pending', auth.uid())
    RETURNING id INTO v_skill_id;
    RETURN jsonb_build_object(
      'ok', true, 'action', 'pending',
      'message', 'Permintaan keahlian dikirim dan sedang menunggu moderasi admin.'
    );
  END IF;

  IF v_status = 'pending' THEN
    RETURN jsonb_build_object(
      'ok', true, 'action', 'pending',
      'message', 'Keahlian ini sudah diajukan dan sedang menunggu moderasi admin.'
    );
  END IF;

  IF v_status = 'rejected' THEN
    RETURN jsonb_build_object(
      'ok', false, 'action', 'rejected',
      'message', 'Nama keahlian ini sebelumnya ditolak admin. Gunakan nama lain.'
    );
  END IF;

  -- Approved: attach to the caller's profile with the chosen level.
  INSERT INTO public.alumni_skills (alumni_id, skill_id, level)
  VALUES (auth.uid(), v_skill_id, p_level)
  ON CONFLICT (alumni_id, skill_id) DO UPDATE SET level = EXCLUDED.level;
  RETURN jsonb_build_object(
    'ok', true, 'action', 'rated',
    'message', 'Keahlian ditambahkan ke profil Anda.'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_skill(TEXT, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_skill(TEXT, TEXT, INT) TO authenticated;

-- ------------------------------------------------------------------
-- 4. CAPABILITY: moderate_skills
-- ------------------------------------------------------------------
-- Extend the admin_set_role whitelist so superadmins can grant the new
-- capability to delegated admins. CREATE OR REPLACE keeps grants intact.
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
    'moderate_gallery', 'moderate_reports', 'view_audit', 'import_export',
    'moderate_skills'
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
    SELECT ARRAY(SELECT cap FROM unnest(capabilities) AS t(cap)
                 WHERE t.cap = ANY(valid_caps))
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
