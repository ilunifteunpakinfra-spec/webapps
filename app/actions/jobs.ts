// ============================================
// ILUNI FTE WebApps - Server Actions: Job Board
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { parseSkillInput, validateSalary } from '@/lib/jobs/format';
import {
  JOB_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  SALARY_PERIODS,
  type JobType,
  type WorkMode,
  type ExperienceLevel,
  type SalaryPeriod,
} from '@/lib/constants';
import type { ActionState } from '@/lib/types';

/** Read an optional enum field, returning null when absent/invalid. */
function readEnum<T extends string>(
  formData: FormData,
  key: string,
  allowed: readonly T[]
): T | null {
  const raw = String(formData.get(key) ?? '').trim();
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/** Read a positive integer, or null when blank/invalid. */
function readInt(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Parse the repeated `contact_*` inputs into the `contacts` JSONB shape. */
function readContacts(formData: FormData): { label: string; value: string; type: string }[] {
  const values = formData.getAll('contact_value').map((v) => String(v).trim());
  const types = formData.getAll('contact_type').map((v) => String(v).trim());
  const out: { label: string; value: string; type: string }[] = [];
  values.forEach((value, i) => {
    if (!value) return;
    out.push({ label: types[i] || 'Kontak', value, type: types[i] || 'other' });
  });
  return out;
}

/**
 * Create a new job posting. Only verified alumni may post jobs;
 * the RLS policy `verified_alumni_post_jobs` enforces this at the
 * database level as well.
 *
 * The row is inserted as `pending`: the guard trigger in migration 0004
 * forces this regardless of what the client sends, so a new vacancy is never
 * public before an admin has seen it.
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
  const education = String(formData.get('education') ?? '').trim();
  const expiredRaw = String(formData.get('expired_at') ?? '').trim();

  const jobType = readEnum<JobType>(formData, 'job_type', JOB_TYPES);
  const workMode = readEnum<WorkMode>(formData, 'work_mode', WORK_MODES);
  const experience = readEnum<ExperienceLevel>(formData, 'experience', EXPERIENCE_LEVELS);
  const salaryPeriod = readEnum<SalaryPeriod>(formData, 'salary_period', SALARY_PERIODS);

  const skill_required = parseSkillInput(
    String(formData.get('skill_required') ?? '')
  );
  const salaryMin = readInt(formData, 'salary_min');
  const salaryMax = readInt(formData, 'salary_max');

  if (!judul) return { error: 'Judul lowongan wajib diisi.' };
  if (!perusahaan) return { error: 'Perusahaan wajib diisi.' };
  if (!jobType) return { error: 'Tipe pekerjaan wajib dipilih.' };
  if (!workMode) return { error: 'Mode kerja wajib dipilih.' };
  if (!experience) return { error: 'Level pengalaman wajib dipilih.' };

  const salaryCheck = validateSalary(salaryMin, salaryMax);
  if (salaryCheck.error) return { error: salaryCheck.error };

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
    education: education || null,
    skill_required: skill_required.length > 0 ? skill_required : null,
    link_apply: linkApply || null,
    expired_at,
    job_type: jobType,
    work_mode: workMode,
    experience,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_period: salaryPeriod,
    contacts: readContacts(formData),
    // Explicit, even though the trigger forces it: keeps intent obvious and
    // protects against a migration that has not been applied yet.
    status: 'pending',
  });

  if (error) return { error: error.message };

  revalidatePath('/lowongan');
  revalidatePath('/lowongan/saya');
  return {
    success: true,
    message: 'Lowongan terkirim dan sedang ditinjau admin.',
  };
}

/**
 * Edit one of the caller's own postings. Only `hidden`/`rejected` rows are
 * editable, which keeps the change scoped to "fix and resubmit"; the DB guard
 * trigger blocks any attempt to self-approve.
 */
export async function updateOwnJobAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const jobId = String(formData.get('job_id') ?? '').trim();
  if (!jobId) return { error: 'Data lowongan tidak valid.' };

  const { data: existing } = await supabase
    .from('job_postings')
    .select('id, posted_by, status')
    .eq('id', jobId)
    .maybeSingle();

  if (!existing || existing.posted_by !== user.id) {
    return { error: 'Lowongan tidak ditemukan.' };
  }

  const status = existing.status as string | null;
  if (status !== 'hidden' && status !== 'rejected') {
    return {
      error: 'Hanya lowongan yang disembunyikan atau ditolak yang dapat diubah.',
    };
  }

  const judul = String(formData.get('judul') ?? '').trim();
  const deskripsi = String(formData.get('deskripsi') ?? '').trim();
  if (!judul) return { error: 'Judul lowongan wajib diisi.' };

  const { error } = await supabase
    .from('job_postings')
    .update({ judul, deskripsi: deskripsi || null })
    .eq('id', jobId)
    .eq('posted_by', user.id);

  if (error) return { error: error.message };

  revalidatePath('/lowongan/saya');
  revalidatePath(`/lowongan/${jobId}`);
  return { success: true, message: 'Perubahan disimpan. Lowongan akan ditinjau kembali.' };
}

