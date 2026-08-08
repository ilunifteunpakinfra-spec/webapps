// ============================================
// ILUNI FTE WebApps - Server Actions: Groups
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/**
 * Create a community group. The creator is inserted as `admin_grup` in
 * `group_members` so they can manage the group (RLS `admin_manage_members`).
 */
export async function createGroupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const nama = String(formData.get('nama') ?? '').trim();
  const tipe = String(formData.get('tipe') ?? '').trim();
  const deskripsi = String(formData.get('deskripsi') ?? '').trim();

  if (!nama) return { error: 'Nama grup wajib diisi.' };
  if (tipe !== 'angkatan' && tipe !== 'minat') {
    return { error: 'Tipe grup harus angkatan atau minat.' };
  }

  const { data: group, error: insertError } = await supabase
    .from('groups')
    .insert({ nama, tipe, deskripsi: deskripsi || null, created_by: user.id })
    .select('id')
    .single();

  if (insertError) return { error: insertError.message };

  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: group.id,
    alumni_id: user.id,
    role: 'admin_grup',
  });

  if (memberError) return { error: memberError.message };

  revalidatePath('/grup');
  return { success: true, message: 'Grup berhasil dibuat.' };
}

/** Join a group as a regular member (idempotent via PK conflict). */
export async function joinGroupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const groupId = String(formData.get('group_id') ?? '').trim();
  if (!groupId) return { error: 'Data grup tidak valid.' };

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    alumni_id: user.id,
    role: 'anggota',
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Anda sudah bergabung dengan grup ini.' };
    }
    return { error: error.message };
  }

  revalidatePath('/grup');
  revalidatePath(`/grup/${groupId}`);
  return { success: true, message: 'Berhasil bergabung dengan grup.' };
}
