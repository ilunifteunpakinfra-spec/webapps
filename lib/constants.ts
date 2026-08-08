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
  'moderate_gallery', // delete gallery photos (incl. storage object)
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
