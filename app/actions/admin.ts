// ============================================
// ILUNI FTE WebApps - Server Actions: Admin
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/supabase/user';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/**
 * Approve an alumni's verification status. Only users with the
 * `super_admin` or `admin` role (which bypass RLS) can perform this.
 */
export async function verifyAlumniAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    return { error: 'Aksi ini hanya untuk administrator.' };
  }

  const alumniId = String(formData.get('alumni_id') ?? '');
  if (!alumniId) return { error: 'Data alumni tidak valid.' };

  const { error } = await supabase
    .from('alumni')
    .update({ status_verifikasi: true })
    .eq('id', alumniId);

  if (error) return { error: error.message };

  revalidatePath('/admin');
  return { success: true };
}
