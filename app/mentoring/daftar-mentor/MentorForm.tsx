'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { registerMentorAction } from '@/app/actions/mentoring';
import type { ActionState } from '@/lib/types';

export default function MentorForm({
  initial,
}: {
  initial: { bidang: string; kapasitas: number; aktif: boolean };
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await registerMentorAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        router.push('/mentoring');
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
        <label className="label-mono mb-1 block" htmlFor="bidang_mentoring">
          Bidang Mentoring *
        </label>
        <input
          id="bidang_mentoring"
          name="bidang_mentoring"
          type="text"
          defaultValue={initial.bidang}
          placeholder="Contoh: Power Systems & Renewable Energy"
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="kapasitas_mentee">
          Kapasitas Mentee
        </label>
        <input
          id="kapasitas_mentee"
          name="kapasitas_mentee"
          type="number"
          min={1}
          max={20}
          defaultValue={initial.kapasitas}
          className="input-field"
        />
        <p className="mt-1 text-xs text-on-surface-variant">
          Jumlah maksimal mentee yang dapat Anda bimbing sekaligus.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="status_aktif"
          defaultChecked={initial.aktif}
          className="rounded border-wire-gray"
        />
        <span className="font-medium">Saya tersedia sebagai mentor aktif</span>
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push('/mentoring')}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Simpan Profil Mentor'}
        </button>
      </div>
    </form>
  );
}
