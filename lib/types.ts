// ============================================
// ILUNI FTE WebApps - Shared Types
// ============================================

export type Visibility = 'public' | 'alumni_only' | 'private';

/** Row shape of the `alumni` table. */
export type AlumniRow = {
  id: string;
  nama: string;
  angkatan: string | null;
  tahun_lulus: number;
  pekerjaan: string | null;
  perusahaan: string | null;
  alamat_tinggal: string | null;
  email: string | null;
  no_telepon: string | null;
  foto_profil: string | null;
  linkedin: string | null;
  bio_singkat: string | null;
  portofolio_url: string | null;
  resume_url: string | null;
  contribution_score: number | null;
  status_open_to_work: boolean | null;
  status_verifikasi: boolean | null;
  visibilitas: Visibility | null;
  created_at?: string;
  updated_at?: string;
};

/** Row shape of the `skills` table. */
export type SkillRow = {
  id: string;
  nama_skill: string;
  kategori: 'hard' | 'soft' | null;
};

/** Alumni skill entry joined with its skill definition. */
export type AlumniSkillRow = {
  skill_id: string;
  level: number;
  skills: Pick<SkillRow, 'id' | 'nama_skill' | 'kategori'> | null;
};

/** Alumni row joined with skills for directory/profile listing. */
export type AlumniWithSkills = AlumniRow & {
  alumni_skills: AlumniSkillRow[];
};

/** Row shape of the `job_postings` table. */
export type JobPostingRow = {
  id: string;
  posted_by: string;
  judul: string;
  deskripsi: string | null;
  perusahaan: string | null;
  lokasi: string | null;
  skill_required: string[] | null;
  link_apply: string | null;
  expired_at: string | null;
  created_at?: string;
};

/** Row shape returned by the `admin_list_users` RPC (users page). */
export type AdminUserRow = {
  id: string;
  email: string | null;
  nama: string | null;
  angkatan: string | null;
  role: string | null;
  capabilities: string[];
  status_verifikasi: boolean | null;
  banned_until: string | null;
  created_at: string;
};

/** Return shape shared by all server action stateful functions. */
export type ActionState = {
  error?: string;
  success?: boolean;
  message?: string;
};
