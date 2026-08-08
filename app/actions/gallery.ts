// ============================================
// ILUNI FTE WebApps - Server Actions: Event Gallery
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/**
 * Record an uploaded event photo in `event_gallery`. The image itself is
 * compressed client-side and uploaded to Supabase Storage before this action
 * runs; this action only persists the reference. The `auth_upload_event_photos`
 * RLS policy enforces `alumni_id = auth.uid()`.
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
  });

  if (error) return { error: error.message };

  revalidatePath('/galeri');
  return { success: true, message: 'Foto berhasil ditambahkan ke galeri.' };
}
