'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createJobAction } from '@/app/actions/jobs';
import type { ActionState } from '@/lib/types';

export default function JobForm() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createJobAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        router.push('/lowongan');
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
          Judul Posisi *
        </label>
        <input
          id="judul"
          name="judul"
          type="text"
          placeholder="Contoh: Senior SCADA Engineer"
          className="input-field"
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-mono mb-1 block" htmlFor="perusahaan">
            Perusahaan *
          </label>
          <input
            id="perusahaan"
            name="perusahaan"
            type="text"
            placeholder="Nama perusahaan"
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label-mono mb-1 block" htmlFor="lokasi">
            Lokasi
          </label>
          <input
            id="lokasi"
            name="lokasi"
            type="text"
            placeholder="Kota penempatan"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="skill_required">
          Skill yang Dibutuhkan
        </label>
        <input
          id="skill_required"
          name="skill_required"
          type="text"
          placeholder="Pisahkan dengan koma, contoh: SCADA, Power Systems, PLC"
          className="input-field"
        />
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="deskripsi">
          Deskripsi
        </label>
        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={5}
          placeholder="Deskripsi pekerjaan, kualifikasi, dan tanggung jawab..."
          className="input-field resize-y"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-mono mb-1 block" htmlFor="link_apply">
            Link Apply
          </label>
          <input
            id="link_apply"
            name="link_apply"
            type="url"
            placeholder="https://..."
            className="input-field"
          />
        </div>
        <div>
          <label className="label-mono mb-1 block" htmlFor="expired_at">
            Tanggal Berakhir
          </label>
          <input
            id="expired_at"
            name="expired_at"
            type="date"
            className="input-field"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push('/lowongan')}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Pasang Lowongan'}
        </button>
      </div>
    </form>
  );
}
