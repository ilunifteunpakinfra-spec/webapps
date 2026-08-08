-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Alumni Database & Networking Platform
-- Complete Supabase Schema (BRD v3.0)
-- ============================================

-- ============================================
-- 1. ENUMS & TYPES
-- ============================================
CREATE TYPE visibilitas_enum AS ENUM ('public', 'alumni_only', 'private');
CREATE TYPE mentoring_status_enum AS ENUM ('pending', 'diterima', 'selesai');
CREATE TYPE referral_status_enum AS ENUM ('pending', 'diterima', 'ditolak', 'selesai');
CREATE TYPE announcement_category_enum AS ENUM ('pencapaian', 'lowongan', 'event', 'umum');
CREATE TYPE group_type_enum AS ENUM ('angkatan', 'minat');
CREATE TYPE group_role_enum AS ENUM ('admin_grup', 'anggota');

-- ============================================
-- 2. CORE TABLES
-- ============================================

-- 2.1 Alumni
CREATE TABLE alumni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  angkatan TEXT,
  tahun_lulus INT NOT NULL,
  pekerjaan TEXT,
  perusahaan TEXT,
  alamat_tinggal TEXT,
  email TEXT UNIQUE NOT NULL,
  no_telepon TEXT,
  foto_profil TEXT,
  linkedin TEXT,
  bio_singkat TEXT,
  portofolio_url TEXT,
  resume_url TEXT,
  contribution_score INT DEFAULT 0,
  status_open_to_work BOOLEAN DEFAULT false,
  status_verifikasi BOOLEAN DEFAULT false,
  visibilitas visibilitas_enum DEFAULT 'alumni_only',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Skills
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_skill TEXT NOT NULL,
  kategori TEXT CHECK (kategori IN ('hard', 'soft'))
);

-- 2.3 Alumni Skills
CREATE TABLE alumni_skills (
  alumni_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  level INT CHECK (level BETWEEN 1 AND 5),
  tanggal_input TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (alumni_id, skill_id)
);

-- 2.4 Endorsements
CREATE TABLE endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endorser_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  alumni_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_endorsement CHECK (endorser_id != alumni_id)
);

-- 2.5 Mentor Profiles
CREATE TABLE mentor_profiles (
  alumni_id UUID PRIMARY KEY REFERENCES alumni(id) ON DELETE CASCADE,
  bidang_mentoring TEXT,
  kapasitas_mentee INT DEFAULT 3,
  status_aktif BOOLEAN DEFAULT true
);

-- 2.6 Mentoring Requests
CREATE TABLE mentoring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  status mentoring_status_enum DEFAULT 'pending',
  pesan TEXT
);

-- 2.7 Job Postings
CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID REFERENCES alumni(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  perusahaan TEXT,
  lokasi TEXT,
  skill_required TEXT[],
  link_apply TEXT,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.8 Referral Requests
CREATE TABLE referral_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  target_alumni_id UUID REFERENCES alumni(id) ON DELETE SET NULL,
  job_posting_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  perusahaan_target TEXT,
  posisi_target TEXT,
  pesan TEXT,
  status referral_status_enum DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.9 Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID REFERENCES alumni(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  isi TEXT,
  kategori announcement_category_enum DEFAULT 'umum',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.10 Groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  tipe group_type_enum,
  deskripsi TEXT,
  created_by UUID REFERENCES alumni(id) ON DELETE SET NULL
);

-- 2.11 Group Members
CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  alumni_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  role group_role_enum DEFAULT 'anggota',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, alumni_id)
);

-- 2.12 Polls
CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  deskripsi TEXT,
  created_by UUID REFERENCES alumni(id) ON DELETE CASCADE,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.13 Poll Options
CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  teks_opsi TEXT NOT NULL
);

-- 2.14 Poll Votes
CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  alumni_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT one_vote_per_user UNIQUE (poll_id, alumni_id)
);

-- 2.15 Event Gallery
CREATE TABLE event_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT,
  alumni_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  foto_url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX idx_alumni_nama ON alumni (nama);
CREATE INDEX idx_alumni_angkatan ON alumni (angkatan);
CREATE INDEX idx_alumni_tahun_lulus ON alumni (tahun_lulus);
CREATE INDEX idx_alumni_perusahaan ON alumni (perusahaan);
CREATE INDEX idx_alumni_pekerjaan ON alumni (pekerjaan);
CREATE INDEX idx_alumni_open_to_work ON alumni (status_open_to_work);
CREATE INDEX idx_alumni_verifikasi ON alumni (status_verifikasi);
CREATE INDEX idx_alumni_visibilitas ON alumni (visibilitas);
CREATE INDEX idx_alumni_skills_alumni ON alumni_skills (alumni_id);
CREATE INDEX idx_alumni_skills_skill ON alumni_skills (skill_id);
CREATE INDEX idx_endorsements_alumni ON endorsements (alumni_id);
CREATE INDEX idx_endorsements_endorser ON endorsements (endorser_id);
CREATE INDEX idx_job_postings_company ON job_postings (perusahaan);
CREATE INDEX idx_job_postings_expired ON job_postings (expired_at);
CREATE INDEX idx_referral_requester ON referral_requests (requester_id);
CREATE INDEX idx_referral_target ON referral_requests (target_alumni_id);
CREATE INDEX idx_announcements_category ON announcements (kategori);
CREATE INDEX idx_groups_type ON groups (tipe);
CREATE INDEX idx_group_members_group ON group_members (group_id);
CREATE INDEX idx_poll_options_poll ON poll_options (poll_id);
CREATE INDEX idx_poll_votes_poll ON poll_votes (poll_id);
CREATE INDEX idx_event_gallery_event ON event_gallery (event_id);

-- ============================================
-- 4. TRIGGERS (updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_alumni_updated_at
  BEFORE UPDATE ON alumni
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentoring_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_gallery ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5.1 ALUMNI POLICIES
-- ============================================

-- Public can view profiles with visibilitas = 'public'
CREATE POLICY "public_view_public_alumni"
  ON alumni FOR SELECT
  USING (visibilitas = 'public');

-- Authenticated users can view alumni_only profiles
CREATE POLICY "auth_view_alumni_only"
  ON alumni FOR SELECT
  USING (visibilitas = 'alumni_only' AND auth.role() = 'authenticated');

-- Users can view their own private profile
CREATE POLICY "owner_view_private"
  ON alumni FOR SELECT
  USING (id = auth.uid());

-- Users can only UPDATE their own profile
CREATE POLICY "owner_update_own_profile"
  ON alumni FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can INSERT their own profile
CREATE POLICY "owner_insert_own_profile"
  ON alumni FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- 5.2 SKILLS POLICIES
-- ============================================
CREATE POLICY "public_read_skills"
  ON skills FOR SELECT
  USING (true);

CREATE POLICY "auth_insert_skills"
  ON skills FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 5.3 ALUMNI SKILLS POLICIES
-- ============================================
CREATE POLICY "public_read_alumni_skills"
  ON alumni_skills FOR SELECT
  USING (true);

CREATE POLICY "owner_manage_own_skills"
  ON alumni_skills FOR ALL
  USING (alumni_id = auth.uid())
  WITH CHECK (alumni_id = auth.uid());

-- ============================================
-- 5.4 ENDORSEMENTS POLICIES
-- ============================================
CREATE POLICY "public_read_endorsements"
  ON endorsements FOR SELECT
  USING (true);

CREATE POLICY "auth_create_endorsement"
  ON endorsements FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND endorser_id = auth.uid()
    AND endorser_id != alumni_id  -- prevents self-endorsement
  );

-- ============================================
-- 5.5 MENTOR PROFILES POLICIES
-- ============================================
CREATE POLICY "public_read_mentor_profiles"
  ON mentor_profiles FOR SELECT
  USING (true);

CREATE POLICY "owner_manage_mentor_profile"
  ON mentor_profiles FOR ALL
  USING (alumni_id = auth.uid())
  WITH CHECK (alumni_id = auth.uid());

-- ============================================
-- 5.6 MENTORING REQUESTS POLICIES
-- ============================================
CREATE POLICY "participant_read_mentoring"
  ON mentoring_requests FOR SELECT
  USING (mentee_id = auth.uid() OR mentor_id = auth.uid());

CREATE POLICY "mentee_create_request"
  ON mentoring_requests FOR INSERT
  WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "mentor_update_status"
  ON mentoring_requests FOR UPDATE
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- ============================================
-- 5.7 JOB POSTINGS POLICIES
-- ============================================
CREATE POLICY "public_read_job_postings"
  ON job_postings FOR SELECT
  USING (true);

-- Only verified alumni can post jobs
CREATE POLICY "verified_alumni_post_jobs"
  ON job_postings FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM alumni
      WHERE id = auth.uid() AND status_verifikasi = true
    )
  );

CREATE POLICY "owner_manage_job_posting"
  ON job_postings FOR ALL
  USING (posted_by = auth.uid())
  WITH CHECK (posted_by = auth.uid());

-- ============================================
-- 5.8 REFERRAL REQUESTS POLICIES (PRIVACY)
-- ============================================
-- Can ONLY be viewed by requester_id OR target_alumni_id
CREATE POLICY "referral_privacy_select"
  ON referral_requests FOR SELECT
  USING (requester_id = auth.uid() OR target_alumni_id = auth.uid());

CREATE POLICY "requester_create_referral"
  ON referral_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "target_update_referral"
  ON referral_requests FOR UPDATE
  USING (target_alumni_id = auth.uid())
  WITH CHECK (target_alumni_id = auth.uid());

-- ============================================
-- 5.9 ANNOUNCEMENTS POLICIES
-- ============================================
CREATE POLICY "public_read_announcements"
  ON announcements FOR SELECT
  USING (true);

CREATE POLICY "verified_alumni_post_announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM alumni
      WHERE id = auth.uid() AND status_verifikasi = true
    )
  );

-- ============================================
-- 5.10 GROUPS POLICIES
-- ============================================
CREATE POLICY "public_read_groups"
  ON groups FOR SELECT
  USING (true);

CREATE POLICY "auth_create_groups"
  ON groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "creator_manage_group"
  ON groups FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- 5.11 GROUP MEMBERS POLICIES
-- ============================================
CREATE POLICY "public_read_group_members"
  ON group_members FOR SELECT
  USING (true);

CREATE POLICY "auth_join_groups"
  ON group_members FOR INSERT
  WITH CHECK (alumni_id = auth.uid());

CREATE POLICY "admin_manage_members"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.alumni_id = auth.uid()
        AND gm.role = 'admin_grup'
    )
  );

-- ============================================
-- 5.12 POLLS POLICIES
-- ============================================
CREATE POLICY "public_read_polls"
  ON polls FOR SELECT
  USING (true);

CREATE POLICY "auth_create_polls"
  ON polls FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "creator_manage_poll"
  ON polls FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================
-- 5.13 POLL OPTIONS POLICIES
-- ============================================
CREATE POLICY "public_read_poll_options"
  ON poll_options FOR SELECT
  USING (true);

CREATE POLICY "auth_create_poll_options"
  ON poll_options FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 5.14 POLL VOTES POLICIES (1-vote-per-user)
-- ============================================
CREATE POLICY "public_read_poll_votes"
  ON poll_votes FOR SELECT
  USING (true);

CREATE POLICY "auth_vote_once"
  ON poll_votes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND alumni_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM poll_votes pv
      WHERE pv.poll_id = poll_votes.poll_id
        AND pv.alumni_id = auth.uid()
    )
  );

-- ============================================
-- 5.15 EVENT GALLERY POLICIES
-- ============================================
CREATE POLICY "public_read_event_gallery"
  ON event_gallery FOR SELECT
  USING (true);

CREATE POLICY "auth_upload_event_photos"
  ON event_gallery FOR INSERT
  WITH CHECK (alumni_id = auth.uid());

-- ============================================
-- 6. ADMIN ROLES (Bypass RLS)
-- ============================================
-- Super Admin & Admin roles bypass RLS for data verification and content moderation.
-- Role + capabilities live in raw_app_meta_data (server-managed only);
-- raw_user_meta_data is client-mergeable and never trusted for authz.
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

-- Admin bypass policies (applied to all tables)
CREATE POLICY "admin_bypass_alumni" ON alumni FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_skills" ON skills FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_alumni_skills" ON alumni_skills FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_endorsements" ON endorsements FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_mentor_profiles" ON mentor_profiles FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_mentoring" ON mentoring_requests FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_jobs" ON job_postings FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_referrals" ON referral_requests FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_announcements" ON announcements FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_groups" ON groups FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_group_members" ON group_members FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_polls" ON polls FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_poll_options" ON poll_options FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_poll_votes" ON poll_votes FOR ALL USING (is_admin());
CREATE POLICY "admin_bypass_event_gallery" ON event_gallery FOR ALL USING (is_admin());

-- ============================================
-- 7. SEED DATA (Sample Skills)
-- ============================================
INSERT INTO skills (nama_skill, kategori) VALUES
  ('SCADA', 'hard'),
  ('Power Systems', 'hard'),
  ('IoT', 'hard'),
  ('Embedded Systems', 'hard'),
  ('PLC Programming', 'hard'),
  ('Circuit Design', 'hard'),
  ('Python', 'hard'),
  ('MATLAB', 'hard'),
  ('Networking', 'hard'),
  ('Project Management', 'soft'),
  ('Leadership', 'soft'),
  ('Communication', 'soft'),
  ('Problem Solving', 'soft'),
  ('Teamwork', 'soft'),
  ('Mentoring', 'soft');

-- ============================================
-- 8. SUPERADMIN MODERATION (Phase 1)
-- ============================================
-- Mirrors supabase/migrations/0002_superadmin_moderation.sql so the
-- canonical schema stays 1:1 with the live database.

-- 8.1 NEW TABLES
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

-- 8.3 NEW SECURITY DEFINER RPCs
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

-- 8.4 NEW-USER ROLE SYNC (auth.users INSERT trigger)
-- SECURITY INVOKER: the INSERT is performed by the auth service / service
-- role, so no DEFINER escalation is needed. Never trusts client metadata.
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

-- 8.5 RLS FOR NEW TABLES
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

-- 8.6 GRANTS
-- New admin RPCs: authenticated only (never anon). REVOKE FROM PUBLIC is
-- required — Supabase auto-grants new functions to anon/authenticated/
-- service_role, and a plain REVOKE FROM anon does not override PUBLIC.
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

-- 8.7 BACKFILL EXISTING USERS (idempotent)
SELECT public.admin_migrate_roles();