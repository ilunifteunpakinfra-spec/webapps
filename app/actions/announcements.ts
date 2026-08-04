// ============================================
// ILUNI FTE WebApps - Server Actions: Announcements
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/** Valid announcement categories (announcement_category_enum). */
const ANNOUNCEMENT_CATEGORIES = ['pencapaian', 'lowongan', 'event', 'umum'] as const;
type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

/**
 * Post a community announcement. The `verified_alumni_post_announcements`
 * RLS policy restricts inserts to alumni with `status_verifikasi = true`.
 */
export async function createAnnouncementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const judul = String(formData.get('judul') ?? '').trim();
  const isi = String(formData.get('isi') ?? '').trim();
  const kategori = String(formData.get('kategori') ?? 'umum').trim();

  if (!judul) return { error: 'Judul pengumuman wajib diisi.' };
  if (!ANNOUNCEMENT_CATEGORIES.includes(kategori as AnnouncementCategory)) {
    return { error: 'Kategori pengumuman tidak valid.' };
  }

  const { error } = await supabase.from('announcements').insert({
    posted_by: user.id,
    judul,
    isi: isi || null,
    kategori: kategori as AnnouncementCategory,
  });

  if (error) {
    if (error.code === '42501') {
      return {
        error:
          'Hanya alumni dengan status terverifikasi yang dapat membuat pengumuman.',
      };
    }
    return { error: error.message };
  }

  revalidatePath('/pengumuman');
  return { success: true, message: 'Pengumuman berhasil dipublikasikan.' };
}
