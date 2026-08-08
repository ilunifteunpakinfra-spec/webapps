// ============================================
// ILUNI FTE WebApps - Server Actions: Referrals
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/**
 * Submit a referral request. The `requester_create_referral` RLS policy
 * guarantees `requester_id = auth.uid()`, and the `referral_privacy_select`
 * policy keeps the request visible only to the requester and target.
 */
export async function createReferralRequestAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const targetAlumniId = String(formData.get('target_alumni_id') ?? '').trim();
  const jobPostingId = String(formData.get('job_posting_id') ?? '').trim() || null;
  const perusahaanTarget = String(formData.get('perusahaan_target') ?? '').trim();
  const posisiTarget = String(formData.get('posisi_target') ?? '').trim();
  const pesan = String(formData.get('pesan') ?? '').trim();

  if (!targetAlumniId) return { error: 'Pilih alumni tujuan.' };
  if (targetAlumniId === user.id) {
    return { error: 'Anda tidak dapat meminta referral ke diri sendiri.' };
  }
  if (!perusahaanTarget || !posisiTarget) {
    return { error: 'Perusahaan dan posisi tujuan wajib diisi.' };
  }
  if (!pesan) return { error: 'Pesan wajib diisi.' };

  // Confirm the target alumni exists and is visible to the requester.
  const { data: target } = await supabase
    .from('alumni')
    .select('id, nama')
    .eq('id', targetAlumniId)
    .maybeSingle();

  if (!target) {
    return { error: 'Alumni tujuan tidak ditemukan.' };
  }

  const { error } = await supabase.from('referral_requests').insert({
    requester_id: user.id,
    target_alumni_id: targetAlumniId,
    job_posting_id: jobPostingId,
    perusahaan_target: perusahaanTarget,
    posisi_target: posisiTarget,
    pesan,
  });

  if (error) return { error: error.message };

  revalidatePath('/referral/baru');
  return { success: true, message: 'Permintaan referral terkirim.' };
}
