'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createAnnouncementAction } from '@/app/actions/announcements';
import type { ActionState } from '@/lib/types';

const CATEGORY_OPTIONS = [
  { value: 'pencapaian', label: 'Pencapaian' },
  { value: 'lowongan', label: 'Lowongan' },
  { value: 'event', label: 'Event' },
  { value: 'umum', label: 'Umum' },
] as const;

export default function AnnouncementForm() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createAnnouncementAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        router.push('/pengumuman');
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {state.error && (
        <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
          {state.error}
        </div>
      )}

      <div>
        <label className="label-mono mb-1 block" htmlFor="judul">
          Judul Pengumuman *
        </label>
        <input
          id="judul"
          name="judul"
          type="text"
          placeholder="Contoh: Reuni Akbar FTE 2026"
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="kategori">
          Kategori
        </label>
        <select id="kategori" name="kategori" className="input-field" defaultValue="umum">
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="isi">
          Isi Pengumuman
        </label>
        <textarea
          id="isi"
          name="isi"
          rows={6}
          placeholder="Tuliskan detail pengumuman di sini..."
          className="input-field resize-y"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push('/pengumuman')}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Publikasikan'}
        </button>
      </div>
    </form>
  );
}
