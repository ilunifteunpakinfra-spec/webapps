// ============================================
// ILUNI FTE WebApps - Server Actions: Alumni Admin (Phase 3)
// ============================================
// Every mutation is capability-gated on `manage_alumni` (see
// lib/constants.ts) and appended to the admin activity log via the
// admin_log_activity RPC. Reads go through the admin_bypass_alumni RLS
// policy; the destructive account deletion uses the SECURITY DEFINER RPC
// admin_delete_alumni so storage + auth cleanup happens server-side.
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, hasCapability, isAdminUser } from '@/lib/supabase/user';
import type { AdminCapability } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import type { ActionState, Visibility } from '@/lib/types';

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

/** Resolve the caller and check they hold the required capability. */
async function requireCapability(cap: AdminCapability): Promise<ActionState | null> {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user) || !hasCapability(user, cap)) {
    return { error: 'Aksi ini hanya untuk admin dengan kemampuan terkait.' };
  }
  return null;
}

const VISIBILITIES: Visibility[] = ['public', 'alumni_only', 'private'];

/** Revalidate every surface where an alumni profile can appear. */
function revalidateAlumniSurfaces(alumniId: string): void {
  revalidatePath('/admin/alumni');
  revalidatePath('/direktori');
  revalidatePath('/');
  revalidatePath(`/profil/${alumniId}`);
}

// ------------------------------------------------------------------
// Edit any profile (fix typos, angkatan, verification, visibility…)
// ------------------------------------------------------------------

export async function updateAlumniAdminAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const alumniId = String(formData.get('alumni_id') ?? '').trim();
  if (!alumniId) return { error: 'Data alumni tidak valid.' };

  const nama = String(formData.get('nama') ?? '').trim();
  const tahunLulus = Number(formData.get('tahun_lulus'));
  const visibilitas = String(formData.get('visibilitas') ?? 'public') as Visibility;
  const statusOpenToWork = formData.get('status_open_to_work') === 'on';
  const statusVerifikasi = formData.get('status_verifikasi') === 'on';

  if (!nama) return { error: 'Nama wajib diisi.' };
  if (!Number.isFinite(tahunLulus) || tahunLulus < 1960 || tahunLulus > 2100) {
    return { error: 'Tahun lulus tidak valid.' };
  }
  if (!VISIBILITIES.includes(visibilitas)) {
    return { error: 'Visibilitas profil tidak valid.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('alumni')
    .update({
      nama,
      angkatan: String(formData.get('angkatan') ?? '').trim() || null,
      tahun_lulus: tahunLulus,
      pekerjaan: String(formData.get('pekerjaan') ?? '').trim() || null,
      perusahaan: String(formData.get('perusahaan') ?? '').trim() || null,
      no_telepon: String(formData.get('no_telepon') ?? '').trim() || null,
      linkedin: String(formData.get('linkedin') ?? '').trim() || null,
      bio_singkat: String(formData.get('bio_singkat') ?? '').trim() || null,
      portofolio_url: String(formData.get('portofolio_url') ?? '').trim() || null,
      visibilitas,
      status_open_to_work: statusOpenToWork,
      status_verifikasi: statusVerifikasi,
    })
    .eq('id', alumniId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'update_alumni', 'alumni', alumniId, {
    nama,
    visibilitas,
    status_open_to_work: statusOpenToWork,
    status_verifikasi: statusVerifikasi,
  });
  revalidateAlumniSurfaces(alumniId);
  return { success: true, message: 'Profil alumni diperbarui.' };
}

// ------------------------------------------------------------------
// Delete account (profile row + storage objects + auth account)
// ------------------------------------------------------------------

export async function deleteAlumniAdminAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const alumniId = String(formData.get('alumni_id') ?? '').trim();
  if (!alumniId) return { error: 'Data alumni tidak valid.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_delete_alumni', {
    p_target_uid: alumniId,
  });

  if (error) return { error: error.message };
  if (data !== true) {
    return { error: 'Gagal menghapus akun. Periksa izin atau data Anda.' };
  }

  await logActivity(supabase, 'delete_alumni', 'alumni', alumniId);
  revalidatePath('/admin/alumni');
  revalidatePath('/direktori');
  revalidatePath('/');
  return { success: true, message: 'Akun alumni beserta seluruh datanya dihapus.' };
}

// ------------------------------------------------------------------
// Verification (single + bulk)
// ------------------------------------------------------------------

export async function verifyAlumniAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const alumniId = String(formData.get('alumni_id') ?? '').trim();
  if (!alumniId) return { error: 'Data alumni tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('alumni')
    .update({ status_verifikasi: true })
    .eq('id', alumniId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'verify_alumni', 'alumni', alumniId);
  revalidateAlumniSurfaces(alumniId);
  return { success: true, message: 'Alumni diverifikasi.' };
}

export async function unverifyAlumniAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const alumniId = String(formData.get('alumni_id') ?? '').trim();
  if (!alumniId) return { error: 'Data alumni tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('alumni')
    .update({ status_verifikasi: false })
    .eq('id', alumniId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'unverify_alumni', 'alumni', alumniId);
  revalidateAlumniSurfaces(alumniId);
  return { success: true, message: 'Verifikasi alumni dicabut.' };
}

/** Bulk-verify a list of alumni ids (`ids` = JSON array in formData). */
export async function bulkVerifyAlumniAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const rawIds = String(formData.get('ids') ?? '');
  let ids: string[] = [];
  try {
    const parsed = JSON.parse(rawIds);
    ids = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
  } catch {
    return { error: 'Data alumni tidak valid.' };
  }
  if (ids.length === 0) return { error: 'Pilih minimal satu alumni.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('alumni')
    .update({ status_verifikasi: true })
    .in('id', ids);

  if (error) return { error: error.message };

  await logActivity(supabase, 'bulk_verify_alumni', 'alumni', ids[0], {
    count: ids.length,
  });
  revalidatePath('/admin/alumni');
  return { success: true, message: `${ids.length} alumni diverifikasi.` };
}

// ------------------------------------------------------------------
// Contribution score
// ------------------------------------------------------------------

export async function resetContributionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const alumniId = String(formData.get('alumni_id') ?? '').trim();
  if (!alumniId) return { error: 'Data alumni tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('alumni')
    .update({ contribution_score: 0 })
    .eq('id', alumniId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'reset_contribution', 'alumni', alumniId);
  revalidateAlumniSurfaces(alumniId);
  return { success: true, message: 'Skor kontribusi direset ke 0.' };
}
