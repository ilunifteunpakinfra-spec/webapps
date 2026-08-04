// ============================================
// ILUNI FTE WebApps - Server Actions: Polls
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/**
 * Create a poll with its options. `auth_create_polls` requires
 * `created_by = auth.uid()`; options are inserted in a single call.
 */
export async function createPollAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const judul = String(formData.get('judul') ?? '').trim();
  const deskripsi = String(formData.get('deskripsi') ?? '').trim();
  const expiredRaw = String(formData.get('expired_at') ?? '').trim();

  const optionTexts = [1, 2, 3, 4].map((i) =>
    String(formData.get(`opsi_${i}`) ?? '').trim()
  );
  const options = optionTexts.filter(Boolean);

  if (!judul) return { error: 'Judul polling wajib diisi.' };
  if (options.length < 2) {
    return { error: 'Minimal dua opsi jawaban wajib diisi.' };
  }

  const expired_at = expiredRaw
    ? new Date(`${expiredRaw}T23:59:59`).toISOString()
    : null;

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      judul,
      deskripsi: deskripsi || null,
      created_by: user.id,
      expired_at,
    })
    .select('id')
    .single();

  if (pollError) return { error: pollError.message };

  const { error: optionsError } = await supabase.from('poll_options').insert(
    options.map((teks) => ({ poll_id: poll.id, teks_opsi: teks }))
  );

  if (optionsError) return { error: optionsError.message };

  revalidatePath('/polling');
  return { success: true, message: 'Polling berhasil dibuat.' };
}

/**
 * Cast a vote on a poll. The `auth_vote_once` RLS policy enforces
 * 1 vote per user at the database level (with a unique constraint).
 */
export async function votePollAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const pollId = String(formData.get('poll_id') ?? '').trim();
  const optionId = String(formData.get('option_id') ?? '').trim();

  if (!pollId || !optionId) return { error: 'Data polling tidak valid.' };

  const { error } = await supabase.from('poll_votes').insert({
    poll_id: pollId,
    option_id: optionId,
    alumni_id: user.id,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'Anda sudah memberikan suara pada polling ini.' };
    }
    return { error: error.message };
  }

  revalidatePath('/polling');
  return { success: true };
}
