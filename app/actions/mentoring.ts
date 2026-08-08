// ============================================
// ILUNI FTE WebApps - Server Actions: Mentoring
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/**
 * Submit a mentoring request to a mentor. The `mentee_create_request`
 * RLS policy guarantees `mentee_id = auth.uid()`.
 */
export async function createMentoringRequestAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const mentorId = String(formData.get('mentor_id') ?? '');
  const pesan = String(formData.get('pesan') ?? '').trim();

  if (!mentorId) return { error: 'Data mentor tidak valid.' };
  if (mentorId === user.id) {
    return { error: 'Anda tidak dapat mengajukan mentoring ke diri sendiri.' };
  }
  if (!pesan) return { error: 'Pesan wajib diisi.' };

  // Confirm the target is actually an active mentor.
  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('alumni_id, status_aktif')
    .eq('alumni_id', mentorId)
    .maybeSingle();

  if (!mentor?.status_aktif) {
    return { error: 'Mentor tidak ditemukan atau tidak aktif.' };
  }

  const { error } = await supabase.from('mentoring_requests').insert({
    mentee_id: user.id,
    mentor_id: mentorId,
    pesan,
  });

  if (error) return { error: error.message };

  revalidatePath('/mentoring');
  return { success: true, message: 'Permintaan mentoring terkirim.' };
}

/**
 * Register (or update) the current user's mentor profile. Upserts on
 * `alumni_id` so re-registering simply refreshes bidang/capacity.
 */
export async function registerMentorAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const bidang = String(formData.get('bidang_mentoring') ?? '').trim();
  const kapasitasRaw = Number(formData.get('kapasitas_mentee'));
  const aktif = formData.get('status_aktif') === 'on';

  if (!bidang) return { error: 'Bidang mentoring wajib diisi.' };
  if (!Number.isInteger(kapasitasRaw) || kapasitasRaw < 1 || kapasitasRaw > 20) {
    return { error: 'Kapasitas mentee harus antara 1 dan 20.' };
  }

  const { error } = await supabase.from('mentor_profiles').upsert(
    {
      alumni_id: user.id,
      bidang_mentoring: bidang,
      kapasitas_mentee: kapasitasRaw,
      status_aktif: aktif,
    },
    { onConflict: 'alumni_id' }
  );

  if (error) return { error: error.message };

  revalidatePath('/mentoring');
  revalidatePath('/profil/edit');
  return { success: true, message: 'Profil mentor berhasil disimpan.' };
}
