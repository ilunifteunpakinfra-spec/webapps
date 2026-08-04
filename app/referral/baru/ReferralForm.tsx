'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createReferralRequestAction } from '@/app/actions/referral';
import type { ActionState } from '@/lib/types';

type Candidate = {
  id: string;
  nama: string;
  pekerjaan: string | null;
  perusahaan: string | null;
};

export default function ReferralForm({
  candidates,
  prefilledTargetId,
  job,
}: {
  candidates: Candidate[];
  prefilledTargetId?: string;
  job: { id: string; judul: string; perusahaan: string | null } | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createReferralRequestAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        router.push('/direktori');
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
      {state.success && (
        <div className="rounded border border-primary-container/40 bg-surface-container px-3 py-2 text-sm text-on-surface">
          {state.message}
        </div>
      )}

      {job && (
        <div className="rounded border border-outline-variant bg-surface-container p-3 text-sm">
          <span className="label-mono block mb-1">Lowongan Terkait</span>
          <span className="font-medium">{job.judul}</span>
          {job.perusahaan && (
            <span className="text-on-surface-variant"> — {job.perusahaan}</span>
          )}
        </div>
      )}

      <div>
        <label className="label-mono mb-1 block" htmlFor="target_alumni_id">
          Alumni yang Dituju *
        </label>
        <select
          id="target_alumni_id"
          name="target_alumni_id"
          className="input-field"
          defaultValue={prefilledTargetId ?? ''}
          required
        >
          <option value="" disabled>
            Pilih alumni...
          </option>
          {candidates.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.nama}
              {candidate.perusahaan ? ` — ${candidate.perusahaan}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-mono mb-1 block" htmlFor="perusahaan_target">
            Perusahaan Tujuan *
          </label>
          <input
            id="perusahaan_target"
            name="perusahaan_target"
            type="text"
            defaultValue={job?.perusahaan ?? ''}
            placeholder="Nama perusahaan"
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label-mono mb-1 block" htmlFor="posisi_target">
            Posisi Tujuan *
          </label>
          <input
            id="posisi_target"
            name="posisi_target"
            type="text"
            defaultValue={job?.judul ?? ''}
            placeholder="Nama posisi"
            className="input-field"
            required
          />
        </div>
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="pesan">
          Pesan untuk Alumni *
        </label>
        <textarea
          id="pesan"
          name="pesan"
          rows={4}
          placeholder="Ceritakan singkat latar belakang Anda dan alasan meminta referral..."
          className="input-field resize-y"
          required
        />
      </div>

      {job && <input type="hidden" name="job_posting_id" value={job.id} />}

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push('/direktori')}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Mengirim...' : 'Kirim Permintaan'}
        </button>
      </div>
    </form>
  );
}
