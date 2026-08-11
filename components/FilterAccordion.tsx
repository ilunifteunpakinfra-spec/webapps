'use client';

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

type Props = {
  /** Jumlah filter yang sedang aktif, untuk badge di tombol "Filter". */
  activeCount: number;
  /** Field filter (rendered server-side) — selalu tampil di breakpoint md+. */
  children: React.ReactNode;
  /** Tombol submit untuk sticky footer di mobile saat panel terbuka. */
  submitButton: React.ReactNode;
};

/**
 * Membungkus grup filter agar collapsible di mobile (<768px, default collapsed)
 * dengan badge jumlah filter aktif, sementara di md+ filter selalu terbuka
 * seperti sebelumnya. Hanya state buka/tutup yang client-side; isi filter
 * (select/input) tetap dirender server sebagai children.
 */
export default function FilterAccordion({
  activeCount,
  children,
  submitButton,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:flex md:items-center md:justify-end">
      {/* Toggle — hanya tampil di mobile (<768px) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="filter-fields"
        className="mb-3 flex w-full items-center justify-between gap-2 rounded border border-tech-black bg-surface-container px-4 py-3 font-montserrat text-sm font-bold text-on-surface transition-colors hover:bg-surface md:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filter
          {activeCount > 0 && (
            <span className="chip-active px-2 py-0.5">{activeCount}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Panel — collapsed di mobile, selalu terbuka di md+ */}
      <div
        id="filter-fields"
        className={`${open ? 'flex flex-col gap-3' : 'hidden'} md:flex md:flex-row md:items-center`}
      >
        {children}
        {open && (
          <div className="sticky bottom-4 z-10 md:hidden">{submitButton}</div>
        )}
      </div>
    </div>
  );
}
