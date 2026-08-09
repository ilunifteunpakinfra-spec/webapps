'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createThreadAction, type CreateThreadState } from '@/app/actions/group-forum';

export default function ThreadForm({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [state, setState] = useState<CreateThreadState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('group_id', groupId);

    startTransition(async () => {
      const result = await createThreadAction({ error: undefined }, formData);
      setState(result);
      if (result.success && result.threadId) {
        router.push(`/grup/${groupId}/thread/${result.threadId}`);
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
          Judul Thread *
        </label>
        <input
          id="judul"
          name="judul"
          type="text"
          maxLength={200}
          placeholder="Contoh: Diskusi peluang kerja di bidang energi"
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="isi">
          Isi Diskusi *
        </label>
        <textarea
          id="isi"
          name="isi"
          rows={8}
          maxLength={5000}
          placeholder="Tuliskan topik diskusi di sini..."
          className="input-field resize-y"
          required
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push(`/grup/${groupId}`)}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Publikasikan Thread'}
        </button>
      </div>
    </form>
  );
}
