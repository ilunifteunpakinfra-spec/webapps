// ============================================
// ILUNI FTE WebApps - Server Actions: User Management
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getCurrentUser,
  hasCapability,
  isSuperAdmin,
} from '@/lib/supabase/user';
import { ADMIN_CAPABILITIES } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Append a row to the admin activity log (admin-gated RPC). */
async function logActivity(
  supabase: SupabaseClient,
  aksi: string,
  targetType: string,
  targetId: string,
  detail?: Record<string, unknown>
): Promise<void> {
  await supabase.rpc('admin_log_activity', {
    p_aksi: aksi,
    p_target_type: targetType,
    p_target_id: targetId,
    p_detail: detail ?? null,
  });
}

/**
 * Set a user's role, granting a chosen subset of capabilities when the
 * target becomes an admin. Only the super admin can perform this; the
 * `admin_set_role` RPC enforces it again at the database level.
 */
export async function setUserRoleAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const caller = await getCurrentUser();
  if (!isSuperAdmin(caller)) {
    return { error: 'Hanya super admin yang dapat mengubah peran pengguna.' };
  }

  const targetUid = String(formData.get('target_uid') ?? '').trim();
  const role = String(formData.get('role') ?? '').trim();
  if (!targetUid) return { error: 'Data pengguna tidak valid.' };
  if (!['super_admin', 'admin', 'alumni'].includes(role)) {
    return { error: 'Peran tidak valid.' };
  }
  if (targetUid === caller!.id) {
    return { error: 'Anda tidak dapat mengubah peran akun Anda sendiri.' };
  }

  const capabilities = ADMIN_CAPABILITIES.filter(
    (cap) => formData.get(`cap_${cap}`) === 'on'
  );
  const effectiveCaps = role === 'admin' ? capabilities : [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_set_role', {
    target_uid: targetUid,
    new_role: role,
    capabilities: effectiveCaps,
  });

  if (error) return { error: error.message };
  if (data !== true) {
    return { error: 'Gagal mengubah peran. Periksa izin Anda.' };
  }

  await logActivity(supabase, 'set_role', 'auth.users', targetUid, {
    role,
    capabilities: effectiveCaps,
  });
  revalidatePath('/admin/users');
  return { success: true, message: `Peran berhasil diubah menjadi ${role}.` };
}

/**
 * Block a user from signing in. `banned_until` is enforced by Supabase
 * Auth itself. Requires super_admin or the `manage_users` capability.
 */
export async function banUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const caller = await getCurrentUser();
  if (!isSuperAdmin(caller) && !hasCapability(caller, 'manage_users')) {
    return { error: 'Aksi ini hanya untuk super admin.' };
  }

  const targetUid = String(formData.get('target_uid') ?? '').trim();
  if (!targetUid) return { error: 'Data pengguna tidak valid.' };
  if (targetUid === caller!.id) {
    return { error: 'Anda tidak dapat memblokir akun Anda sendiri.' };
  }

  // Permanent ban: 100 years from now.
  const until = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_ban_user', {
    target_uid: targetUid,
    until_ts: until,
  });

  if (error) return { error: error.message };
  if (data !== true) return { error: 'Gagal memblokir pengguna.' };

  await logActivity(supabase, 'ban_user', 'auth.users', targetUid, { until });
  revalidatePath('/admin/users');
  return { success: true, message: 'Pengguna berhasil diblokir.' };
}

/** Lift a user's ban. Requires super_admin or the `manage_users` capability. */
export async function unbanUserAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const caller = await getCurrentUser();
  if (!isSuperAdmin(caller) && !hasCapability(caller, 'manage_users')) {
    return { error: 'Aksi ini hanya untuk super admin.' };
  }

  const targetUid = String(formData.get('target_uid') ?? '').trim();
  if (!targetUid) return { error: 'Data pengguna tidak valid.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_unban_user', {
    target_uid: targetUid,
  });

  if (error) return { error: error.message };
  if (data !== true) return { error: 'Gagal membatalkan blokir.' };

  await logActivity(supabase, 'unban_user', 'auth.users', targetUid);
  revalidatePath('/admin/users');
  return { success: true, message: 'Blokir pengguna dicabut.' };
}
