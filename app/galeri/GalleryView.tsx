'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Camera, X, ChevronLeft, ChevronRight } from 'lucide-react';

export type GalleryPhoto = {
  id: string;
  foto_url: string;
  caption: string | null;
  event_id: string | null;
  nama: string | null;
  created_at: string | null;
};

type GalleryViewProps = {
  photos: GalleryPhoto[];
  isLoggedIn: boolean;
  children?: ReactNode;
};

type LightboxProps = {
  photos: GalleryPhoto[];
  initialIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
};

function Lightbox({ photos, initialIndex, onNavigate, onClose }: LightboxProps) {
  const close = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname);
    onClose();
  }, [onClose]);

  useEffect(() => {
    window.history.replaceState(null, '', `#foto-${photos[initialIndex]?.id ?? ''}`);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft' && initialIndex > 0) onNavigate(initialIndex - 1);
      if (event.key === 'ArrowRight' && initialIndex < photos.length - 1) {
        onNavigate(initialIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.history.replaceState(null, '', window.location.pathname);
    };
  }, [close, initialIndex, onNavigate, photos]);

  const photo = photos[initialIndex];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau foto"
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={close}
        aria-label="Tutup"
      >
        <X className="h-5 w-5" />
      </button>

      {initialIndex > 0 && (
        <button
          type="button"
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(initialIndex - 1);
          }}
          aria-label="Foto sebelumnya"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {initialIndex < photos.length - 1 && (
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(initialIndex + 1);
          }}
          aria-label="Foto berikutnya"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.foto_url}
        alt={photo.caption ?? 'Foto acara ILUNI FT ELEKTRO'}
        className="max-h-[85vh] max-w-full rounded-lg object-contain"
        onClick={(event) => event.stopPropagation()}
      />

      {(photo.caption || photo.event_id || photo.nama) && (
        <div
          className="absolute bottom-4 left-1/2 w-full max-w-xl -translate-x-1/2 rounded-lg bg-black/60 px-4 py-3 text-center text-sm text-white"
          onClick={(event) => event.stopPropagation()}
        >
          {photo.caption && <p className="font-medium">{photo.caption}</p>}
          <p className="mt-0.5 text-xs text-white/70">
            {[photo.event_id, photo.nama].filter(Boolean).join(' • ')}
          </p>
        </div>
      )}
    </div>
  );
}

export default function GalleryView({ photos, isLoggedIn, children }: GalleryViewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="card text-center text-on-surface-variant">
        Belum ada foto di galeri. Jadilah yang pertama mengunggah momen acara!
      </div>
    );
  }

  return (
    <div>
      {isLoggedIn && children}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-tech-black bg-white"
            aria-label={photo.caption ?? 'Lihat foto acara'}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.foto_url}
              alt={photo.caption ?? 'Foto acara ILUNI FT ELEKTRO'}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {photo.event_id && (
              <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-tech-black/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white">
                <Camera className="h-3 w-3" />
                {photo.event_id}
              </span>
            )}
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={selectedIndex}
          onNavigate={setSelectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  );
}
