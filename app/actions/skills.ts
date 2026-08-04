// ============================================
// ILUNI FTE WebApps - Server Actions: Skills
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/** Add or update a self-rated skill (level 1-5) on the user's own profile. */
export async function rateSkillAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const skillId = String(formData.get('skill_id') ?? '');
  const level = Number(formData.get('level'));

  if (!skillId) return { error: 'Pilih keahlian terlebih dahulu.' };
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return { error: 'Level keahlian harus antara 1 dan 5.' };
  }

  const { error } = await supabase
    .from('alumni_skills')
    .upsert(
      { alumni_id: user.id, skill_id: skillId, level },
      { onConflict: 'alumni_id,skill_id' }
    );

  if (error) return { error: error.message };

  revalidatePath('/profil/edit');
  return { success: true };
}

/** Remove a skill from the user's own profile. */
export async function removeSkillAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const skillId = String(formData.get('skill_id') ?? '');
  if (!skillId) return { error: 'Data keahlian tidak valid.' };

  const { error } = await supabase
    .from('alumni_skills')
    .delete()
    .eq('alumni_id', user.id)
    .eq('skill_id', skillId);

  if (error) return { error: error.message };

  revalidatePath('/profil/edit');
  return { success: true };
}

/**
 * Endorse another alumni's skill. RLS also rejects self-endorsements
 * (`endorser_id != alumni_id`), so this is enforced twice.
 */
export async function endorseSkillAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const alumniId = String(formData.get('alumni_id') ?? '');
  const skillId = String(formData.get('skill_id') ?? '');

  if (!alumniId || !skillId) return { error: 'Data tidak valid.' };
  if (alumniId === user.id) {
    return { error: 'Anda tidak dapat mendukung keahlian Anda sendiri.' };
  }

  // Prevent duplicate endorsements (also guarded by a unique index).
  const { data: existing } = await supabase
    .from('endorsements')
    .select('id')
    .eq('endorser_id', user.id)
    .eq('alumni_id', alumniId)
    .eq('skill_id', skillId)
    .maybeSingle();

  if (existing) {
    return { error: 'Anda sudah mendukung keahlian ini.' };
  }

  const { error } = await supabase.from('endorsements').insert({
    endorser_id: user.id,
    alumni_id: alumniId,
    skill_id: skillId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/profil/${alumniId}`);
  return { success: true };
}
