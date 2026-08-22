// ============================================
// ILUNI FTE WebApps - Server Actions: Event Gallery
// ============================================
// Alur moderasi foto galeri (lihat docs/GALLERY_MODERATION_PLAN.md):
//   upload -> pending -> (admin setujui) active -> (admin sembunyikan) hidden
//   pending -> (admin tolak) hidden
//   hidden -> (super admin) pulihkan | hapus permanen (baris + storage)
//
// Visibilitas dikendalikan RLS policy "gallery_select_scoped":
// publik hanya 'active'; pemilik melihat miliknya; admin moderate_gallery
// melihat pending; super admin melihat SEMUA baris (history).

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, hasCapability, isAdminUser, isSuperAdmin } from '@/lib/supabase/user';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/** Append a row to the admin activity log (admin-gated RPC). */
async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  aksi: string,
  targetId: string,
  detail?: Record<string, unknown>
): Promise<void> {
  await supabase.rpc('admin_log_activity', {
    p_aksi: aksi,
    p_target_type: 'event_gallery',
    p_target_id: targetId,
    p_detail: detail ?? null,
  });
}

/**
 * Record an uploaded event photo in `event_gallery`. The image itself is
 * compressed client-side and uploaded to Supabase Storage before this action
 * runs; this action only persists the reference. New uploads are stored as
 * `pending` and only become public after an admin approves them
 * (pre-moderation; enforced by the auth_upload_event_photos RLS policy).
 */
export async function addGalleryPhotoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const fotoUrl = String(formData.get('foto_url') ?? '').trim();
  const eventId = String(formData.get('event_id') ?? '').trim();
  const caption = String(formData.get('caption') ?? '').trim();

  if (!fotoUrl) return { error: 'Foto belum diunggah.' };

  const { error } = await supabase.from('event_gallery').insert({
    event_id: eventId || null,
    alumni_id: user.id,
    foto_url: fotoUrl,
    caption: caption || null,
    status: 'pending',
  });

  if (error) return { error: error.message };

  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return {
    success: true,
    message: 'Foto terkirim dan menunggu persetujuan admin.',
  };
}

/** Resolve the caller; admins must hold the given capability. */
async function requireGalleryCapability(): Promise<ActionState | null> {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user) || !hasCapability(user, 'moderate_gallery')) {
    return { error: 'Aksi ini hanya untuk admin dengan kemampuan moderasi galeri.' };
  }
  return null;
}

/** Resolve the caller; only the top-level super admin may proceed. */
async function requireSuperAdmin(): Promise<ActionState | null> {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) {
    return { error: 'Aksi ini hanya untuk super admin.' };
  }
  return null;
}

function readPhotoId(formData: FormData): string {
  return String(formData.get('photo_id') ?? '').trim();
}

/**
 * Setujui foto pending agar tampil publik. Guard `.eq('status', 'pending')`
 * menjaga alur: hanya pending yang bisa di-approve.
 */
export async function approveGalleryPhotoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireGalleryCapability();
  if (denied) return denied;

  const photoId = readPhotoId(formData);
  if (!photoId) return { error: 'Data foto tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('event_gallery')
    .update({ status: 'active' })
    .eq('id', photoId)
    .eq('status', 'pending');

  if (error) return { error: error.message };

  await logActivity(supabase, 'approve_gallery_photo', photoId);
  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Foto disetujui dan tampil di galeri.' };
}

/** Tolak foto pending (soft delete): tersembunyi dari publik. */
export async function rejectGalleryPhotoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireGalleryCapability();
  if (denied) return denied;

  const photoId = readPhotoId(formData);
  if (!photoId) return { error: 'Data foto tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('event_gallery')
    .update({ status: 'hidden' })
    .eq('id', photoId)
    .eq('status', 'pending');

  if (error) return { error: error.message };

  await logActivity(supabase, 'reject_gallery_photo', photoId);
  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Foto ditolak dan disembunyikan dari galeri.' };
}

/** Sembunyikan foto aktif kapan saja (pasca-moderasi, soft delete). */
export async function hideGalleryPhotoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireGalleryCapability();
  if (denied) return denied;

  const photoId = readPhotoId(formData);
  if (!photoId) return { error: 'Data foto tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('event_gallery')
    .update({ status: 'hidden' })
    .eq('id', photoId)
    .eq('status', 'active');

  if (error) return { error: error.message };

  await logActivity(supabase, 'hide_gallery_photo', photoId);
  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Foto disembunyikan dari galeri.' };
}

/** Pulihkan foto tersembunyi — hanya super admin (pemilik history). */
export async function restoreGalleryPhotoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const photoId = readPhotoId(formData);
  if (!photoId) return { error: 'Data foto tidak valid.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('event_gallery')
    .update({ status: 'active' })
    .eq('id', photoId)
    .eq('status', 'hidden');

  if (error) return { error: error.message };

  await logActivity(supabase, 'restore_gallery_photo', photoId);
  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Foto dipulihkan ke galeri.' };
}

/**
 * Hapus permanen (baris + file storage) — hanya super admin.
 * Memakai RPC SECURITY DEFINER admin_delete_gallery_photo sehingga
 * storage RLS tidak pernah dilewati dari klien.
 */
export async function deleteGalleryPhotoAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireSuperAdmin();
  if (denied) return denied;

  const photoId = readPhotoId(formData);
  if (!photoId) return { error: 'Data foto tidak valid.' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_delete_gallery_photo', {
    p_photo_id: photoId,
  });

  if (error) return { error: error.message };
  if (data !== true) return { error: 'Gagal menghapus foto.' };

  await logActivity(supabase, 'delete_gallery_photo', photoId);
  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Foto beserta file-nya dihapus permanen.' };
}