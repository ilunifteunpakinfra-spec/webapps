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
