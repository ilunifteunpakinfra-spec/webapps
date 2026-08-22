'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AlumniCard from '@/components/AlumniCard';
import type { AlumniWithSkills } from '@/lib/types';

type Props = {
  alumni: AlumniWithSkills[];
  /** Jumlah kartu per halaman carousel (grid 3 kolom di desktop). */
  pageSize?: number;
  /** Interval auto-rotate dalam ms; 0 menonaktifkan auto-rotate. */
  autoRotateMs?: number;
};

/** Fisher-Yates shuffle — urutan acak stabil selama satu siklus render. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Carousel direktori alumni untuk beranda:
 * - urutan kartu DIACAK setiap kunjungan halaman (setelah hidrasi,
 *   agar SSR & client tetap konsisten tanpa hydration mismatch),
 * - navigasi prev/next + indikator titik,
 * - auto-rotate berkala yang berhenti sementara saat kursor hover.
 */
export default function AlumniCarousel({
  alumni,
  pageSize = 3,
  autoRotateMs = 6000,
}: Props) {
  // Render awal memakai urutan dari server (aman untuk hydration);
  // pengacakan dilakukan setelah mount di sisi klien.
  const [shuffled, setShuffled] = useState<AlumniWithSkills[]>(alumni);
  const [page, setPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setShuffled(shuffle(alumni));
  }, [alumni]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(shuffled.length / pageSize)),
    [shuffled.length, pageSize]
  );

  // Jaga indeks halaman tetap valid saat jumlah data berubah.
  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [page, pageCount]);

  // Auto-rotate (berhenti saat hover atau saat hanya ada satu halaman).
  useEffect(() => {
    if (autoRotateMs <= 0 || isPaused || pageCount <= 1) return;
    const timer = setInterval(() => {
      setPage((current) => (current + 1) % pageCount);
    }, autoRotateMs);
    return () => clearInterval(timer);
  }, [autoRotateMs, isPaused, pageCount]);

  const visible = shuffled.slice(page * pageSize, page * pageSize + pageSize);

  if (shuffled.length === 0) return null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <AlumniCard key={item.id} alumni={item} showSkillsLimit={4} />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPage((current) => (current - 1 + pageCount) % pageCount)}
            aria-label="Alumni sebelumnya"
            className="btn-secondary px-3 py-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Halaman carousel">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === page}
                aria-label={`Halaman ${index + 1}`}
                onClick={() => setPage(index)}
                className={`h-2 rounded-full transition-all ${
                  index === page ? 'w-6 bg-primary-container' : 'w-2 bg-wire-gray'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => (current + 1) % pageCount)}
            aria-label="Alumni berikutnya"
            className="btn-secondary px-3 py-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
