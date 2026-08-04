'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createGroupAction } from '@/app/actions/groups';
import type { ActionState } from '@/lib/types';

export default function GroupForm() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createGroupAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        router.push('/grup');
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
        <label className="label-mono mb-1 block" htmlFor="nama">
          Nama Grup *
        </label>
        <input
          id="nama"
          name="nama"
          type="text"
          placeholder="Contoh: IoT Enthusiasts"
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="tipe">
          Tipe Grup *
        </label>
        <select id="tipe" name="tipe" className="input-field" defaultValue="minat" required>
          <option value="minat">Minat</option>
          <option value="angkatan">Angkatan</option>
        </select>
      </div>

      <div>
        <label className="label-mono mb-1 block" htmlFor="deskripsi">
          Deskripsi
        </label>
        <textarea
          id="deskripsi"
          name="deskripsi"
          rows={4}
          placeholder="Ceritakan tujuan dan topik diskusi grup..."
          className="input-field resize-y"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-outline-variant pt-4">
        <button
          type="button"
          className="btn-tertiary"
          onClick={() => router.push('/grup')}
        >
          Batal
        </button>
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Buat Grup'}
        </button>
      </div>
    </form>
  );
}
