-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Skill Moderation: attach approved skills
-- Additive migration on top of 0011_skill_moderation.sql
--
-- 1. skills.requested_level: the level the requester chose at submission
-- 2. request_skill(): stores requested_level on new pending requests and
--    refreshes it when the same user re-submits an already-pending name
-- 3. admin_approve_skill(): approve a pending skill AND attach it to the
--    requester's profile (alumni_skills) so it appears on their profile
--    immediately after moderation
-- ============================================

-- ------------------------------------------------------------------
-- 1. SCHEMA
-- ------------------------------------------------------------------
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS requested_level INT
    CONSTRAINT skills_requested_level_check CHECK (requested_level BETWEEN 1 AND 5);

-- ------------------------------------------------------------------
-- 2. request_skill(): persist the requested level
-- ------------------------------------------------------------------
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
    INSERT INTO public.skills (nama_skill, kategori, status, requested_by, requested_level)
    VALUES (v_nama, p_kategori, 'pending', auth.uid(), p_level)
    RETURNING id INTO v_skill_id;
    RETURN jsonb_build_object(
      'ok', true, 'action', 'pending',
      'message', 'Permintaan keahlian dikirim dan sedang menunggu moderasi admin.'
    );
  END IF;

  IF v_status = 'pending' THEN
    -- Refresh the requester's intended level so approval attaches with it.
    UPDATE public.skills
       SET requested_level = p_level
     WHERE id = v_skill_id
       AND requested_by = auth.uid();
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

-- ------------------------------------------------------------------
-- 3. admin_approve_skill(): approve + attach to requester's profile
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_approve_skill(p_skill_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requester UUID;
  v_level INT;
BEGIN
  IF NOT public.has_admin_capability('moderate_skills') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Aksi ini hanya untuk admin dengan kemampuan terkait.');
  END IF;

  SELECT requested_by, COALESCE(requested_level, 3)
    INTO v_requester, v_level
  FROM public.skills WHERE id = p_skill_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Keahlian tidak ditemukan.');
  END IF;

  UPDATE public.skills
     SET status = 'approved'
   WHERE id = p_skill_id;

  IF v_requester IS NOT NULL THEN
    INSERT INTO public.alumni_skills (alumni_id, skill_id, level)
    VALUES (v_requester, p_skill_id, v_level)
    ON CONFLICT (alumni_id, skill_id) DO UPDATE SET level = EXCLUDED.level;
  END IF;

  RETURN jsonb_build_object('ok', true, 'message', 'Keahlian disetujui dan muncul untuk semua alumni.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_approve_skill(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_skill(UUID) TO authenticated;
