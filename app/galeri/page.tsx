import { Images } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import GalleryView, { type GalleryPhoto } from './GalleryView';
import PhotoUploadForm from './PhotoUploadForm';

export const metadata = {
  title: 'Galeri Acara - ILUNI FT ELEKTRO UNPAK',
};

export default async function GaleriPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: photoRows } = await supabase
    .from('event_gallery')
    .select('*, alumni(nama)')
    .order('created_at', { ascending: false })
    .limit(60);

  const photos = ((photoRows ?? []) as unknown as (GalleryPhoto & {
    alumni: { nama: string } | null;
  })[]).map((row) => ({
    id: row.id,
    foto_url: row.foto_url,
    caption: row.caption,
    event_id: row.event_id,
    nama: row.alumni?.nama ?? null,
    created_at: row.created_at,
  }));

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-primary-container">
            <Images className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="hero-title mb-1">Galeri Acara</h1>
            <p className="text-on-surface-variant">
              Dokumentasi momen kebersamaan alumni ILUNI FT ELEKTRO
            </p>
          </div>
        </div>

        <GalleryView photos={photos} isLoggedIn={Boolean(user)}>
          <div className="mb-8 max-w-[720px]">
            <PhotoUploadForm />
          </div>
        </GalleryView>
      </div>
    </div>
  );
}
