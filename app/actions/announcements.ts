// ============================================
// ILUNI FTE WebApps - Server Actions: Announcements
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { RICH_TEXT_MAX_LENGTH } from '@/lib/content/rich-text';
import type { ActionState } from '@/lib/types';

/** Valid announcement categories (announcement_category_enum). */
const ANNOUNCEMENT_CATEGORIES = ['pencapaian', 'lowongan', 'event', 'umum'] as const;
type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

/** Compensating controls (C1) — see proposal §4.3. */
const MAX_IMAGES_PER_ANNOUNCEMENT = 6;
const MAX_IMAGES_PER_DAY = 20;

/** One uploaded image as submitted by the client uploader. */
type StagedImage = {
  storagePath: string;
  publicUrl: string;
  caption: string | null;
  altText: string;
};

function parseStagedImages(raw: string | null): {
  images: StagedImage[];
  error: string | null;
} {
  if (!raw) return { images: [], error: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { images: [], error: 'Data gambar tidak valid.' };
  }
  if (!Array.isArray(parsed)) {
    return { images: [], error: 'Data gambar tidak valid.' };
  }
  if (parsed.length > MAX_IMAGES_PER_ANNOUNCEMENT) {
    return {
      images: [],
      error: `Maksimal ${MAX_IMAGES_PER_ANNOUNCEMENT} gambar per pengumuman.`,
    };
  }

  const images: StagedImage[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') {
      return { images: [], error: 'Data gambar tidak valid.' };
    }
    const e = entry as Record<string, unknown>;
    const storagePath = String(e.storagePath ?? '').trim();
    const publicUrl = String(e.publicUrl ?? '').trim();
    const altText = String(e.altText ?? '').trim();
    const caption = String(e.caption ?? '').trim();

    if (!storagePath || !publicUrl) {
      return { images: [], error: 'Data gambar tidak lengkap.' };
    }
    // alt_text is NOT NULL in the schema and is an accessibility requirement:
    // an announcement image carries meaning, so there is no decorative path.
    if (altText.length < 3) {
      return { images: [], error: 'Teks alternatif (alt) wajib diisi untuk setiap gambar.' };
    }
    // The uploader writes into our own bucket; refuse anything else so a
    // crafted form cannot make the app embed an arbitrary remote host.
    if (!publicUrl.startsWith('https://')) {
      return { images: [], error: 'URL gambar tidak valid.' };
    }
    if (!storagePath.startsWith('announcement-images/')) {
      return { images: [], error: 'Lokasi penyimpanan gambar tidak valid.' };
    }
    images.push({
      storagePath,
      publicUrl,
      caption: caption || null,
      altText,
    });
  }
  return { images, error: null };
}


/**
 * Post a community announcement. The `verified_alumni_post_announcements`
 * RLS policy restricts inserts to alumni with `status_verifikasi = true`.
 *
 * Images are stored in `announcement_images` and auto-mirrored into
 * `event_gallery` with status='active' (maintainer decision — proposal §4.3
 * Option A). That BYPASSES the `moderate_gallery` queue for these images, so
 * the caps, the daily rate limit, the audit log, and the report/hide path are
 * the compensating controls. If abuse appears, flip the two `status` values
 * below to 'pending' and the queue is restored.
 */
export async function createAnnouncementAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const judul = String(formData.get('judul') ?? '').trim();
  const isi = String(formData.get('isi') ?? '').trim();
  const kategori = String(formData.get('kategori') ?? 'umum').trim();

  if (!judul) return { error: 'Judul pengumuman wajib diisi.' };
  if (judul.length > 120) {
    return { error: 'Judul maksimal 120 karakter.' };
  }
  if (ANNOUNCEMENT_CATEGORIES.indexOf(kategori as AnnouncementCategory) === -1) {
    return { error: 'Kategori pengumuman tidak valid.' };
  }
  if (isi.length > RICH_TEXT_MAX_LENGTH) {
    return { error: 'Isi pengumuman terlalu panjang.' };
  }

  const { images, error: imageError } = parseStagedImages(
    String(formData.get('images') ?? '')
  );
  if (imageError) return { error: imageError };

  // C1: bound the number of auto-published gallery rows one account can
  // create per day, since these skip the moderation queue.
  if (images.length > 0) {
    const { data: todayCount } = await supabase.rpc(
      'announcement_image_daily_count',
      { p_uid: user.id }
    );
    const used = typeof todayCount === 'number' ? todayCount : 0;
    if (used + images.length > MAX_IMAGES_PER_DAY) {
      return {
        error: `Batas ${MAX_IMAGES_PER_DAY} gambar per hari tercapai. Coba lagi besok.`,
      };
    }
  }

  const { data: inserted, error } = await supabase
    .from('announcements')
    .insert({
      posted_by: user.id,
      judul,
      isi: isi || null,
      kategori: kategori as AnnouncementCategory,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '42501') {
      return {
        error:
          'Hanya alumni dengan status terverifikasi yang dapat membuat pengumuman.',
      };
    }
    return { error: error.message };
  }

  const announcementId = inserted.id;

  for (const [index, image] of images.entries()) {
    await supabase.from('announcement_images').insert({
      announcement_id: announcementId,
      storage_path: image.storagePath,
      public_url: image.publicUrl,
      caption: image.caption,
      alt_text: image.altText,
      position: index,
      status: 'active',
    });

    // Auto-publish to the gallery (Option A). 'active' skips the
    // moderate_gallery queue; see the docblock for the compensating controls.
    const { data: galleryRow } = await supabase
      .from('event_gallery')
      .insert({
        alumni_id: user.id,
        foto_url: image.publicUrl,
        caption: image.caption,
        // event_id is a free-text label; reuse the title so the gallery can
        // group the mirrored rows.
        event_id: judul.slice(0, 120),
        source_type: 'announcement',
        source_id: announcementId,
        status: 'active',
      })
      .select('id')
      .single();

    // C3: audit trail, so "who put this in the gallery?" is always answerable
    // even though no admin approved it.
    if (galleryRow) {
      await supabase.rpc('admin_log_activity', {
        p_aksi: 'auto_publish_announcement_image',
        p_target_type: 'announcement',
        p_target_id: announcementId,
        p_detail: {
          gallery_id: galleryRow.id,
          announcement_id: announcementId,
          source: 'auto',
        },
      });
    }
  }

  revalidatePath('/pengumuman');
  revalidatePath('/galeri');
  revalidatePath('/admin/moderation');
  return { success: true, message: 'Pengumuman berhasil dipublikasikan.' };
}
