// ============================================
// ILUNI FTE WebApps - Auth Helpers
// ============================================

import { createClient } from '@/lib/supabase/server';
import {
  ADMIN_ROLES,
  SUPER_ADMIN_ROLES,
  type AdminCapability,
} from '@/lib/constants';
import type { User } from '@supabase/supabase-js';

/**
 * Resolve the currently authenticated user (verifies the JWT server-side).
 * Returns null when there is no active session.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Role claims are server-managed in `raw_app_meta_data` (set only via the
 * `admin_set_role` RPC / Supabase Auth admin API). `raw_user_meta_data` is
 * client-mergeable through `updateUser()` and is never used for
 * authorization.
 */
function roleOf(user: User | null): string | undefined {
  return user?.app_metadata?.role as string | undefined;
}

/** Whether the user holds a role that bypasses RLS (super_admin / admin). */
export function isAdminUser(user: User | null): boolean {
  return ADMIN_ROLES.includes(roleOf(user) as (typeof ADMIN_ROLES)[number]);
}

/** Whether the user is the top-level super admin. */
export function isSuperAdmin(user: User | null): boolean {
  return SUPER_ADMIN_ROLES.includes(
    roleOf(user) as (typeof SUPER_ADMIN_ROLES)[number]
  );
}

export type AdminLevel = 'super_admin' | 'admin';

/** The admin level of the user, or null for regular alumni. */
export function getAdminLevel(user: User | null): AdminLevel | null {
  const role = roleOf(user);
  if (role === 'super_admin' || role === 'admin') return role;
  return null;
}

/**
 * Whether the user holds a specific admin capability. `super_admin`
 * implicitly holds every capability; a regular admin must have it in
 * their granted `capabilities` list.
 */
export function hasCapability(
  user: User | null,
  capability: AdminCapability
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (getAdminLevel(user) !== 'admin') return false;
  const caps = user.app_metadata?.capabilities as string[] | undefined;
  return Array.isArray(caps) && caps.includes(capability);
}
