'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createMentoringRequestAction } from '@/app/actions/mentoring';
import type { ActionState } from '@/lib/types';

export default function MentoringRequestForm({ mentorId }: { mentorId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('mentor_id', mentorId);

    startTransition(async () => {
      const result = await createMentoringRequestAction({ error: undefined }, formData);
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
        <label className="label-mono mb-1 block" htmlFor="pesan">
          Pesan untuk Mentor *
        </label>
        <textarea
          id="pesan"
          name="pesan"
          rows={5}
          placeholder="Ceritakan latar belakang Anda, bidang yang ingin dipelajari, dan harapan dari mentoring ini..."
          className="input-field resize-y"
          required
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push('/mentoring')}
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
