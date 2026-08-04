// ============================================
// ILUNI FTE WebApps - Server Actions: Authentication
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ensureAlumniProfile } from '@/app/actions/alumni';
import type { ActionState } from '@/lib/types';

/** Sign in with email + password and ensure the alumni profile exists. */
export async function signInAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Email atau password salah.' };
  }

  await ensureAlumniProfile(data.user);
  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Register a new alumni account. When email confirmation is enabled the
 * profile row is created after the user confirms their email (see the
 * auth callback route); otherwise it is created immediately.
 */
export async function signUpAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const nama = String(formData.get('nama') ?? '').trim();
  const angkatan = String(formData.get('angkatan') ?? '').trim();
  const tahunLulus = Number(formData.get('tahun_lulus'));
  const pekerjaan = String(formData.get('pekerjaan') ?? '').trim();
  const noTelepon = String(formData.get('no_telepon') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!nama) return { error: 'Nama lengkap wajib diisi.' };
  if (!email || !email.includes('@')) return { error: 'Email tidak valid.' };
  if (!Number.isFinite(tahunLulus) || tahunLulus < 1960) {
    return { error: 'Tahun lulus tidak valid.' };
  }
  if (password.length < 6) {
    return { error: 'Password minimal 6 karakter.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'alumni',
        nama,
        angkatan,
        tahun_lulus: tahunLulus,
        pekerjaan,
        no_telepon: noTelepon,
      },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/profil/edit`,
    },
  });

  if (error) return { error: error.message };

  // When email confirmation is disabled, a session is returned immediately.
  if (data.session?.user) {
    await ensureAlumniProfile(data.session.user);
    revalidatePath('/', 'layout');
    return { success: true };
  }

  return {
    success: true,
    message: 'Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.',
  };
}

/** Sign the current user out and return to the landing page. */
export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/** Send a password reset link to the given email. */
export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();

  if (!email) return { error: 'Email wajib diisi.' };

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/reset-password`,
  });

  if (error) return { error: error.message };

  return {
    success: true,
    message: 'Tautan reset password telah dikirim ke email Anda.',
  };
}
