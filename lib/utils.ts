// ============================================
// ILUNI FTE WebApps - Shared Utilities
// ============================================

/**
 * Base URL used for Supabase redirects (email verification,
 * password reset). Falls back to localhost for development.
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
  );
}

/**
 * Normalize a searchParams value (string or string[]) to a single
 * string, or undefined when absent.
 */
export function asString(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Format an ISO timestamp into a readable Indonesian date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "2 hari lalu" style relative time from an ISO timestamp. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Baru';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

/** Sanitize a relative path for safe redirects (prevents open redirects). */
export function safePath(value: string | undefined, fallback = '/'): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}
