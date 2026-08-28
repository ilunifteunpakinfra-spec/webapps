'use client';

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

type Props = {
  /** Jumlah filter yang sedang aktif, untuk badge di tombol "Filter". */
  activeCount: number;
  /** Field filter (rendered server-side) — tampil saat accordion dibuka. */
  children: React.ReactNode;
  /** Tombol submit untuk sticky footer di mobile saat panel terbuka. */
  submitButton: React.ReactNode;
  /**
   * Kelas tambahan untuk wrapper. Pakai `md:contents` agar toggle & panel
   * menjadi item grid langsung dari form induk di desktop (toggle inline
   * dengan input, panel membentang penuh di baris kedua saat dibuka).
   */
  className?: string;
};

/**
 * Membungkus grup filter sebagai accordion yang DEFAULT TERTUTUP di semua
 * breakpoint. Tombol "Filter" membuka/menutup panel; badge menampilkan
 * jumlah filter aktif. Isi filter tetap dirender server sebagai children.
 *
 * Fluid responsif:
 * - Mobile  : toggle full-width di bawah input; panel menumpuk vertikal.
 * - Desktop : dengan `className="md:contents"` toggle menyusut inline
 *             (`w-auto`) di samping input, dan panel terbuka membentang
 *             selebar form (`md:col-span-full`) dengan select ber-wrap.
 */
export default function FilterAccordion({
  activeCount,
  children,
  submitButton,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Toggle — full-width di mobile, menyusut inline di desktop */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="filter-fields"
        className="flex w-full items-center justify-between gap-2 rounded border border-tech-black bg-surface-container px-4 py-2 font-montserrat text-sm font-bold text-on-surface transition-colors hover:bg-surface md:w-auto"
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

      {/* Panel — tertutup secara default; di desktop membentang penuh */}
      {open && (
        <div
          id="filter-fields"
          className="flex flex-col gap-3 md:col-span-full md:flex-row md:flex-wrap md:items-center"
        >
          {children}
          {/* Sticky footer submit khusus mobile */}
          <div className="sticky bottom-4 z-10 md:hidden">{submitButton}</div>
        </div>
      )}
    </div>
  );
}