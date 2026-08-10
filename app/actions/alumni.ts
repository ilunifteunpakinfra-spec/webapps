// ============================================
// ILUNI FTE WebApps - Server Actions: Alumni Profile
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { isAdminUser } from '@/lib/supabase/user';
import type { User } from '@supabase/supabase-js';
import type { ActionState, Visibility } from '@/lib/types';

const VISIBILITIES: Visibility[] = ['public', 'alumni_only', 'private'];

/**
 * Ensure a profile row exists in `alumni` for the given auth user.
 * Called after signup, email confirmation, and login so the profile
 * record is always present.
 */
export async function ensureAlumniProfile(user: User) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('alumni')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (existing) return existing;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const { data, error } = await supabase
    .from('alumni')
    .insert({
      id: user.id,
      nama:
        typeof metadata.nama === 'string' && metadata.nama
          ? metadata.nama
          : (user.email ?? 'Alumni'),
      angkatan: typeof metadata.angkatan === 'string' ? metadata.angkatan : null,
      tahun_lulus:
        typeof metadata.tahun_lulus === 'number'
          ? metadata.tahun_lulus
          : new Date().getFullYear(),
      pekerjaan:
        typeof metadata.pekerjaan === 'string' ? metadata.pekerjaan : null,
      no_telepon:
        typeof metadata.no_telepon === 'string' ? metadata.no_telepon : null,
      email: user.email ?? '',
      // New profiles are publicly visible so the public directory/homepage
      // reflects real registrations; users can opt out via the visibility
      // selector on the profile edit page (alumni_only / private).
      visibilitas: 'public',
    })
    .select('id')
    .single();

  if (error) return null;
  return data;
}

/** Update the authenticated user's own profile. */
export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const nama = String(formData.get('nama') ?? '').trim();
  const tahunLulus = Number(formData.get('tahun_lulus'));
  const visibilitas = String(formData.get('visibilitas') ?? 'public') as Visibility;

  if (!nama) return { error: 'Nama wajib diisi.' };
  if (!Number.isFinite(tahunLulus) || tahunLulus < 1960) {
    return { error: 'Tahun lulus tidak valid.' };
  }
  if (!VISIBILITIES.includes(visibilitas)) {
    return { error: 'Visibilitas profil tidak valid.' };
  }
  if (visibilitas === 'private' && !isAdminUser(user)) {
    return { error: 'Opsi visibilitas Pribadi hanya tersedia untuk admin.' };
  }

  const { error } = await supabase
    .from('alumni')
    .update({
      nama,
      angkatan: String(formData.get('angkatan') ?? '').trim() || null,
      tahun_lulus: tahunLulus,
      pekerjaan: String(formData.get('pekerjaan') ?? '').trim() || null,
      perusahaan: String(formData.get('perusahaan') ?? '').trim() || null,
      alamat_tinggal: String(formData.get('alamat_tinggal') ?? '').trim() || null,
      no_telepon: String(formData.get('no_telepon') ?? '').trim() || null,
      linkedin: String(formData.get('linkedin') ?? '').trim() || null,
      bio_singkat: String(formData.get('bio_singkat') ?? '').trim() || null,
      portofolio_url: String(formData.get('portofolio_url') ?? '').trim() || null,
      foto_profil: String(formData.get('foto_profil') ?? '').trim() || null,
      resume_url: String(formData.get('resume_url') ?? '').trim() || null,
      visibilitas,
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/profil/edit');
  revalidatePath('/direktori');
  revalidatePath('/');
  return { success: true, message: 'Profil berhasil diperbarui.' };
}

/** Toggle the "Open to Work" visibility flag for the current user. */
export async function toggleOpenToWorkAction(
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const nextValue = formData.get('next') === 'true';
  const { error } = await supabase
    .from('alumni')
    .update({ status_open_to_work: nextValue })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/profil/edit');
  revalidatePath('/');
  return { success: true };
}
