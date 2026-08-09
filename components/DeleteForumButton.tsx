'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import type { ActionState } from '@/lib/types';

type ForumAction = (prev: ActionState, data: FormData) => Promise<ActionState>;

/**
 * Tombol hapus generik untuk konten forum (thread/balasan). Memanggil
 * server action dengan field FormData yang diberikan, dengan konfirmasi
 * `window.confirm` dan refresh halaman setelah sukses.
 */
export default function DeleteForumButton({
  action,
  fields,
  confirmText,
  className = 'btn-tertiary px-2 py-1 text-xs',
}: {
  action: ForumAction;
  fields: Record<string, string>;
  confirmText: string;
  className?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(confirmText)) return;

    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);

    startTransition(async () => {
      const result = await action({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      {state.error && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={className}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Hapus
      </button>
    </span>
  );
}
