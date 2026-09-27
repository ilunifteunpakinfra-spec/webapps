'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  GALLERY_MAX_DIMENSION,
  GALLERY_QUALITY,
  STORAGE_BUCKETS,
} from '@/lib/constants';
import { compressImage } from '@/lib/utils/media';

export type StagedAnnouncementImage = {
  storagePath: string;
  publicUrl: string;
  caption: string;
  altText: string;
};

const MAX_IMAGES = 6;
const MAX_BYTES = 8 * 1024 * 1024;
const STORAGE_PREFIX = 'announcement-images';

type Props = {
  /** Serialised into a hidden input as JSON for the server action. */
  name: string;
};

function uid(): string {
  return crypto.randomUUID();
}

/**
 * Uploads announcement images to the existing `gallery` bucket and stages them
 * for the server action. Reuses the gallery bucket, its RLS scoping, and the
 * same client-side compression, so no new storage infrastructure is needed.
 */
export default function ImageUploader({ name }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<StagedAnnouncementImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    if (images.length + files.length > MAX_IMAGES) {
      setError(`Maksimal ${MAX_IMAGES} gambar per pengumuman.`);
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Silakan masuk terlebih dahulu.');

      const added: StagedAnnouncementImage[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError(`Berkas "${file.name}" bukan gambar.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          setError(`"${file.name}" melebihi 8 MB.`);
          continue;
        }

        const compressed = await compressImage(
          file,
          GALLERY_MAX_DIMENSION,
          GALLERY_QUALITY
        );
        const path = `${STORAGE_PREFIX}/${user.id}/${uid()}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.gallery)
          .upload(path, compressed, { contentType: 'image/jpeg' });
        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKETS.gallery)
          .getPublicUrl(path);

        added.push({
          storagePath: path,
          publicUrl: urlData.publicUrl,
          caption: '',
          // Placeholder only: the schema requires >= 3 chars and the server
          // rejects anything shorter, so the author must type a real alt.
          altText: '',
        });
      }

      if (added.length > 0) setImages((prev) => [...prev, ...added]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function update(index: number, patch: Partial<StagedAnnouncementImage>) {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, ...patch } : img))
    );
  }

  function move(index: number, delta: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  const missingAlt = images.filter((i) => i.altText.trim().length < 3).length;

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(images)} />

      <span className="label-mono mb-1 block">Galeri Gambar</span>

      {error && (
        <div className="mb-2 rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {images.map((image, index) => (
          <div key={image.storagePath} className="card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.publicUrl}
              alt={image.altText || 'Pratinjau gambar pengumuman'}
              className="mb-2 h-32 w-full rounded object-cover"
            />

            <div className="mb-2 space-y-2">
              <div>
                <label
                  className="label-mono mb-1 block text-[10px]"
                  htmlFor={`alt-${index}`}
                >
                  Teks alternatif (ALT) *
                </label>
                <input
                  id={`alt-${index}`}
                  type="text"
                  value={image.altText}
                  onChange={(e) => update(index, { altText: e.target.value })}
                  placeholder="Deskripsi singkat gambar untuk pembaca layar"
                  className="input-field"
                  aria-required="true"
                  aria-invalid={image.altText.trim().length < 3}
                />
              </div>
              <div>
                <label
                  className="label-mono mb-1 block text-[10px]"
                  htmlFor={`cap-${index}`}
                >
                  Keterangan (opsional)
                </label>
                <input
                  id={`cap-${index}`}
                  type="text"
                  value={image.caption}
                  onChange={(e) => update(index, { caption: e.target.value })}
                  placeholder="Keterangan singkat foto"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="btn-tertiary px-2 py-1"
                aria-label={`Geser gambar ${index + 1} ke atas`}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === images.length - 1}
                className="btn-tertiary px-2 py-1"
                aria-label={`Geser gambar ${index + 1} ke bawah`}
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="btn-tertiary ml-auto px-2 py-1 text-error"
                aria-label={`Hapus gambar ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <p className="text-xs text-on-surface-variant">
          Belum ada gambar. Gambar juga otomatis tampil di Galeri Acara.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => addFiles(e.target.files)}
        className="sr-only"
        id="announcement-images-input"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label
          htmlFor="announcement-images-input"
          className="btn-secondary cursor-pointer"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengunggah...
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4" />
              Tambah Gambar
            </>
          )}
        </label>
        <span className="text-xs text-on-surface-variant">
          {images.length}/{MAX_IMAGES} gambar
          {missingAlt > 0 && (
            <span className="ml-2 font-semibold text-error">
              {missingAlt} belum punya ALT
            </span>
          )}
        </span>
      </div>

      <p className="mt-1 text-xs text-on-surface-variant">
        ALT wajib diisi agar gambar dapat diakses pembaca layar. Maksimal 8 MB per
        gambar; dikompresi otomatis sebelum diunggah.
      </p>
    </div>
  );
}

