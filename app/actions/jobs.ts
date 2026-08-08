// ============================================
// ILUNI FTE WebApps - Server Actions: Job Board
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/**
 * Create a new job posting. Only verified alumni may post jobs;
 * the RLS policy `verified_alumni_post_jobs` enforces this at the
 * database level as well.
 */
export async function createJobAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const judul = String(formData.get('judul') ?? '').trim();
  const perusahaan = String(formData.get('perusahaan') ?? '').trim();
  const lokasi = String(formData.get('lokasi') ?? '').trim();
  const deskripsi = String(formData.get('deskripsi') ?? '').trim();
  const linkApply = String(formData.get('link_apply') ?? '').trim();
  const expiredRaw = String(formData.get('expired_at') ?? '').trim();

  const skillsRaw = String(formData.get('skill_required') ?? '').trim();
  const skill_required = skillsRaw
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  if (!judul) return { error: 'Judul lowongan wajib diisi.' };
  if (!perusahaan) return { error: 'Perusahaan wajib diisi.' };

  // Date input returns YYYY-MM-DD; interpret it as end of day.
  const expired_at = expiredRaw
    ? new Date(`${expiredRaw}T23:59:59`).toISOString()
    : null;

  const { data: profile } = await supabase
    .from('alumni')
    .select('status_verifikasi')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.status_verifikasi) {
    return { error: 'Hanya alumni terverifikasi yang dapat memasang lowongan.' };
  }

  const { error } = await supabase.from('job_postings').insert({
    posted_by: user.id,
    judul,
    deskripsi: deskripsi || null,
    perusahaan,
    lokasi: lokasi || null,
    skill_required: skill_required.length > 0 ? skill_required : null,
    link_apply: linkApply || null,
    expired_at,
  });

  if (error) return { error: error.message };

  revalidatePath('/lowongan');
  return { success: true, message: 'Lowongan berhasil dipasang.' };
}
