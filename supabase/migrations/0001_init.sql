-- ============================================
-- ILUNI FTE UNPAK - Alumni Database & Networking Platform
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
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
-- Super Admin & Admin roles bypass RLS for data verification and content moderation
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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