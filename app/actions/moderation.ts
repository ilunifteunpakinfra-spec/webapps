// ============================================
// ILUNI FTE WebApps - Server Actions: Content Moderation
// ============================================
// Every mutation is capability-gated (see lib/constants.ts) and appended
// to the admin activity log via the admin_log_activity RPC.
//
// Moderation model (Option C — hybrid):
//   - job_postings / announcements: soft-hide via `status` column
//   - polls / groups / gallery photos / endorsements / ratings: hard delete
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, hasCapability, isAdminUser } from '@/lib/supabase/user';
import type { AdminCapability } from '@/lib/constants';
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

/** Resolve the caller and check they hold the required capability. */
async function requireCapability(cap: AdminCapability): Promise<ActionState | null> {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user) || !hasCapability(user, cap)) {
    return { error: 'Aksi ini hanya untuk admin dengan kemampuan terkait.' };
  }
  return null;
}

function readId(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

// ------------------------------------------------------------------
// Jobs (soft-hide) — capability: moderate_jobs
// ------------------------------------------------------------------

export async function hideJobAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_jobs');
  if (denied) return denied;

  const jobId = readId(formData, 'job_id');
  if (!jobId) return { error: 'Data lowongan tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('job_postings')
    .update({ status: 'hidden' })
    .eq('id', jobId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'hide_job', 'job_postings', jobId);
  revalidatePath('/lowongan');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Lowongan disembunyikan dari publik.' };
}

export async function restoreJobAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_jobs');
  if (denied) return denied;

  const jobId = readId(formData, 'job_id');
  if (!jobId) return { error: 'Data lowongan tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('job_postings')
    .update({ status: 'active' })
    .eq('id', jobId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'restore_job', 'job_postings', jobId);
  revalidatePath('/lowongan');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Lowongan dikembalikan ke publik.' };
}

// ------------------------------------------------------------------
// Announcements (soft-hide) — capability: moderate_announcements
// ------------------------------------------------------------------

export async function hideAnnouncementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_announcements');
  if (denied) return denied;

  const announcementId = readId(formData, 'announcement_id');
  if (!announcementId) return { error: 'Data pengumuman tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .update({ status: 'hidden' })
    .eq('id', announcementId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'hide_announcement', 'announcements', announcementId);
  revalidatePath('/pengumuman');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Pengumuman disembunyikan dari publik.' };
}

export async function restoreAnnouncementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_announcements');
  if (denied) return denied;

  const announcementId = readId(formData, 'announcement_id');
  if (!announcementId) return { error: 'Data pengumuman tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .update({ status: 'active' })
    .eq('id', announcementId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'restore_announcement', 'announcements', announcementId);
  revalidatePath('/pengumuman');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Pengumuman dikembalikan ke publik.' };
}

// ------------------------------------------------------------------
// Polls — capability: moderate_polls
// ------------------------------------------------------------------

/** Soft-close a poll by back-dating its expiration (keeps the data). */
export async function closePollAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_polls');
  if (denied) return denied;

  const pollId = readId(formData, 'poll_id');
  if (!pollId) return { error: 'Data polling tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('polls')
    .update({ expired_at: new Date().toISOString() })
    .eq('id', pollId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'close_poll', 'polls', pollId);
  revalidatePath('/polling');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Polling ditutup.' };
}

/** Hard-delete a poll; options and votes cascade via FK. */
export async function deletePollAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_polls');
  if (denied) return denied;

  const pollId = readId(formData, 'poll_id');
  if (!pollId) return { error: 'Data polling tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase.from('polls').delete().eq('id', pollId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'delete_poll', 'polls', pollId);
  revalidatePath('/polling');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Polling beserta semua suara dihapus.' };
}

// ------------------------------------------------------------------
// Groups — capability: moderate_groups
// ------------------------------------------------------------------

/** Hard-delete a group; memberships cascade via FK. */
export async function deleteGroupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_groups');
  if (denied) return denied;

  const groupId = readId(formData, 'group_id');
  if (!groupId) return { error: 'Data grup tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase.from('groups').delete().eq('id', groupId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'delete_group', 'groups', groupId);
  revalidatePath('/grup');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Grup dihapus.' };
}

// ------------------------------------------------------------------
// Gallery photos — capability: moderate_gallery
// ------------------------------------------------------------------

/**
 * Hard-delete a gallery photo. The row removal AND the storage object
 * removal happen inside the `admin_delete_gallery_photo` RPC (SECURITY
 * DEFINER, capability-checked) so storage RLS is never bypassed from the
 * client.
 */
export async function deleteGalleryPhotoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_gallery');
  if (denied) return denied;

  const photoId = readId(formData, 'photo_id');
  if (!photoId) return { error: 'Data foto tidak valid.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_delete_gallery_photo', {
    p_photo_id: photoId,
  });

  if (error) return { error: error.message };
  if (data !== true) return { error: 'Gagal menghapus foto.' };

  await logActivity(supabase, 'delete_gallery_photo', 'event_gallery', photoId);
  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Foto beserta file-nya dihapus.' };
}

// ------------------------------------------------------------------
// Skills (moderation queue) — capability: moderate_skills
// ------------------------------------------------------------------
// Free-text skill requests are created as `pending` by authenticated users;
// an admin approves (publishes) or rejects them here. Approving publishes the
// skill AND attaches it to the requester's profile via the admin_approve_skill
// RPC (SECURITY DEFINER), so it appears on their profile immediately.

export async function approveSkillAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_skills');
  if (denied) return denied;

  const skillId = readId(formData, 'skill_id');
  if (!skillId) return { error: 'Data keahlian tidak valid.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_approve_skill', {
    p_skill_id: skillId,
  });
  if (error) return { error: error.message };

  const result = (data ?? {}) as { ok?: boolean; message?: string };
  if (result.ok === false) {
    return { error: result.message ?? 'Gagal menyetujui keahlian.' };
  }

  await logActivity(supabase, 'approve_skill', 'skills', skillId);
  revalidatePath('/admin/moderation');
  revalidatePath('/profil/edit');
  revalidatePath('/direktori');
  return { success: true, message: result.message ?? 'Keahlian disetujui.' };
}

export async function rejectSkillAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('moderate_skills');
  if (denied) return denied;

  const skillId = readId(formData, 'skill_id');
  if (!skillId) return { error: 'Data keahlian tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('skills')
    .update({ status: 'rejected' })
    .eq('id', skillId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'reject_skill', 'skills', skillId);
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Permintaan keahlian ditolak.' };
}

// ------------------------------------------------------------------
// Endorsements & self-ratings (admin override) — capability: manage_alumni
// ------------------------------------------------------------------

/** Remove a specific endorsement (e.g. abusive/duplicate endorsements). */
export async function deleteEndorsementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const endorsementId = readId(formData, 'endorsement_id');
  if (!endorsementId) return { error: 'Data dukungan tidak valid.' };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from('endorsements')
    .select('alumni_id')
    .eq('id', endorsementId)
    .maybeSingle();

  if (!row) return { error: 'Dukungan tidak ditemukan.' };

  const { error } = await supabase
    .from('endorsements')
    .delete()
    .eq('id', endorsementId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'delete_endorsement', 'endorsements', endorsementId);
  revalidatePath(`/profil/${row.alumni_id}`);
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Dukungan keahlian dihapus.' };
}

/** Admin override: remove a user's self-rated skill entry. */
export async function forceDeleteSkillAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('manage_alumni');
  if (denied) return denied;

  const alumniId = readId(formData, 'alumni_id');
  const skillId = readId(formData, 'skill_id');
  if (!alumniId || !skillId) return { error: 'Data keahlian tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('alumni_skills')
    .delete()
    .eq('alumni_id', alumniId)
    .eq('skill_id', skillId);

  if (error) return { error: error.message };

  await logActivity(supabase, 'delete_skill_rating', 'alumni_skills', alumniId, {
    skill_id: skillId,
  });
  revalidatePath(`/profil/${alumniId}`);
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Penilaian keahlian dihapus.' };
}
