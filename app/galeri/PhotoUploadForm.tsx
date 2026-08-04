'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { STORAGE_BUCKETS, GALLERY_MAX_DIMENSION, GALLERY_QUALITY } from '@/lib/constants';
import { compressImage } from '@/lib/utils/media';
import { addGalleryPhotoAction } from '@/app/actions/gallery';
import type { ActionState } from '@/lib/types';

export default function PhotoUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ActionState>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({});

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setState({ error: 'Pilih foto terlebih dahulu.' });
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Silakan masuk terlebih dahulu.');

      const compressed = await compressImage(file, GALLERY_MAX_DIMENSION, GALLERY_QUALITY);
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.gallery)
        .upload(path, compressed, { contentType: 'image/jpeg' });
      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.gallery)
        .getPublicUrl(path);

      const formData = new FormData(event.currentTarget);
      formData.set('foto_url', urlData.publicUrl);

      startTransition(async () => {
        const result = await addGalleryPhotoAction({ error: undefined }, formData);
        setState(result);
        if (result.success) {
          if (fileInputRef.current) fileInputRef.current.value = '';
          router.refresh();
        }
      });
    } catch (err) {
      setState({
        error: err instanceof Error ? err.message : 'Gagal mengunggah foto.',
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="mb-3 font-montserrat text-base font-bold text-on-surface">
        Unggah Foto Acara
      </h2>

      {state.error && (
        <div className="mb-3 rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
          {state.error}
        </div>
      )}
      {state.success && state.message && (
        <div className="mb-3 rounded border border-primary-container bg-primary-container/10 px-3 py-2 text-sm text-on-surface">
          {state.message}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="label-mono mb-1 block" htmlFor="event_id">
            Nama Acara (opsional)
          </label>
          <input
            id="event_id"
            name="event_id"
            type="text"
            placeholder="Contoh: Reuni Akbar 2025"
            className="input-field"
          />
        </div>

        <div>
          <label className="label-mono mb-1 block" htmlFor="caption">
            Keterangan Foto (opsional)
          </label>
          <input
            id="caption"
            name="caption"
            type="text"
            placeholder="Momen apa yang ada di foto ini?"
            className="input-field"
          />
        </div>

        <div>
          <label className="label-mono mb-1 block" htmlFor="photo">
            Foto *
          </label>
          <input
            id="photo"
            ref={fileInputRef}
            name="photo"
            type="file"
            accept="image/*"
            className="input-field cursor-pointer"
            required
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Gambar akan dikompresi otomatis sebelum diunggah.
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-outline-variant pt-4">
        <button
          type="submit"
          className="btn-primary"
          disabled={isUploading || isPending}
        >
          {isUploading || isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengunggah...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Unggah Foto
            </>
          )}
        </button>
      </div>
    </form>
  );
}
