'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createPollAction } from '@/app/actions/polls';
import type { ActionState } from '@/lib/types';

export default function PollForm() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createPollAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        router.push('/polling');
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
          Pertanyaan Polling *
        </label>
        <input
          id="judul"
          name="judul"
          type="text"
          placeholder="Contoh: Topik webinar FTE berikutnya?"
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="deskripsi">
          Deskripsi (opsional)
        </label>
        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={2}
          placeholder="Penjelasan tambahan..."
          className="input-field resize-y"
        />
      </div>

      <div>
        <span className="label-mono mb-1 block">Opsi Jawaban (minimal 2)</span>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((index) => (
            <input
              key={index}
              name={`opsi_${index}`}
              type="text"
              placeholder={`Opsi ${index}`}
              className="input-field"
            />
          ))}
        </div>
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="expired_at">
          Tanggal Berakhir
        </label>
        <input id="expired_at" name="expired_at" type="date" className="input-field" />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push('/polling')}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Buat Polling'}
        </button>
      </div>
    </form>
  );
}
