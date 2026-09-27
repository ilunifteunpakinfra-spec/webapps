// ============================================
// ILUNI FTE WebApps - Shared Constants
// ============================================

/** Supabase Storage bucket names. */
export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  resumes: 'resumes',
  gallery: 'gallery',
} as const;

/** Maximum PDF resume size (2MB per BRD non-functional requirement). */
export const MAX_RESUME_BYTES = 2 * 1024 * 1024;

/** Avatar image compression settings. */
export const AVATAR_MAX_DIMENSION = 512;
export const AVATAR_QUALITY = 0.8;

/** Event gallery photo compression settings. */
export const GALLERY_MAX_DIMENSION = 1280;
export const GALLERY_QUALITY = 0.85;

/** Directory pagination size (server-side). */
export const DIRECTORY_PAGE_SIZE = 12;

/** Jika jumlah lowongan aktif <= ambang ini, card statistik beranda jadi CTA ajakan. */
export const JOB_CTA_THRESHOLD = 0;

/** Jika jumlah mentor aktif <= ambang ini, card statistik beranda menampilkan CTA kecil. */
export const MENTOR_CTA_THRESHOLD = 2;

/** Roles that bypass RLS and can access the admin dashboard. */
export const ADMIN_ROLES = ['super_admin', 'admin'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Roles that can manage other users (promote/demote/ban) and view audits. */
export const SUPER_ADMIN_ROLES = ['super_admin'] as const;

export type SuperAdminRole = (typeof SUPER_ADMIN_ROLES)[number];

/**
 * Capability catalog for delegated admins. `super_admin` implicitly holds
 * every capability; a regular `admin` holds exactly what the superadmin
 * granted at promotion time. Stored in `raw_app_meta_data` (server-managed).
 */
export const ADMIN_CAPABILITIES = [
  'manage_users', // promote/demote/ban (in practice super_admin only)
  'manage_alumni', // edit/delete alumni records, bulk verify
  'moderate_jobs', // delete/close job postings
  'moderate_announcements', // delete announcements
  'moderate_polls', // delete/close polls
  'moderate_groups', // delete groups / remove members
  'moderate_gallery', // approve/reject pending photos, hide active ones
  'moderate_skills', // approve/reject free-text skill requests
  'moderate_reports', // resolve/dismiss community reports
  'view_audit', // read admin activity log
  'import_export', // CSV import/export
] as const;

export type AdminCapability = (typeof ADMIN_CAPABILITIES)[number];

/** Capabilities granted by default when promoting a user to `admin`. */
export const DEFAULT_ADMIN_CAPABILITIES: readonly AdminCapability[] =
  ADMIN_CAPABILITIES.filter((cap) => cap !== 'manage_users');

/** Content types that can be reported through the community report flow. */
export const REPORT_TARGETS = [
  'job',
  'announcement',
  'poll',
  'group',
  'gallery',
  'profile',
] as const;

export type ReportTarget = (typeof REPORT_TARGETS)[number];

// ============================================
// Job Board — structured vacancy vocabulary
// Mirrors the enums in supabase/migrations/0004_job_postings_structured.sql
// ============================================

export const JOB_TYPES = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'freelance',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Penuh Waktu',
  part_time: 'Paruh Waktu',
  contract: 'Kontrak',
  internship: 'Magang',
  freelance: 'Freelance',
};

export const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const;

export type WorkMode = (typeof WORK_MODES)[number];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: 'Onsite',
  hybrid: 'Hybrid',
  remote: 'Remote',
};

export const EXPERIENCE_LEVELS = [
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'principal',
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  intern: 'Intern',
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
  principal: 'Principal',
};

export const SALARY_PERIODS = ['hourly', 'monthly', 'yearly'] as const;

export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  hourly: 'per jam',
  monthly: 'per bulan',
  yearly: 'per tahun',
};

/** Moderation lifecycle of a vacancy posting. */
export const JOB_STATUSES = [
  'pending',
  'active',
  'hidden',
  'rejected',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Menunggu Review',
  active: 'Aktif',
  hidden: 'Disembunyikan',
  rejected: 'Ditolak',
};

/**
 * Sort order for the admin moderation queue: what needs a decision first.
 * Lower number sorts first.
 */
export const JOB_STATUS_SORT_ORDER: Record<JobStatus, number> = {
  pending: 0,
  active: 1,
  hidden: 2,
  rejected: 3,
};

/** Salary bounds (IDR) offered by the "minimum salary" filter. */
export const SALARY_FILTER_STEPS = [
  { label: 'Semua', value: null },
  { label: '≥ 5 jt', value: 5_000_000 },
  { label: '≥ 10 jt', value: 10_000_000 },
  { label: '≥ 15 jt', value: 15_000_000 },
  { label: '≥ 25 jt', value: 25_000_000 },
  { label: '≥ 50 jt', value: 50_000_000 },
] as const;

/** Maximum number of skill chips rendered on a card before collapsing. */
export const JOB_CARD_SKILL_LIMIT = 4;

/** Directory pagination size (server-side). */
export const JOBS_PAGE_SIZE = 8;
