// ============================================
// ILUNI FTE WebApps - Auth Helpers
// ============================================

import { createClient } from '@/lib/supabase/server';
import { ADMIN_ROLES } from '@/lib/constants';
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

/** Whether the user holds a role that bypasses RLS (super_admin / admin). */
export function isAdminUser(user: User | null): boolean {
  const role = user?.user_metadata?.role as string | undefined;
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}
