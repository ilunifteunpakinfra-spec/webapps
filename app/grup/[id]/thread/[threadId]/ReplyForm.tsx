'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2 } from 'lucide-react';
import { createReplyAction } from '@/app/actions/group-forum';
import type { ActionState } from '@/lib/types';

export default function ReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isi, setIsi] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set('thread_id', threadId);
    formData.set('isi', isi);

    startTransition(async () => {
      const result = await createReplyAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        setIsi('');
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {state.error && (
        <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
          {state.error}
        </div>
      )}

      <div>
        <label className="label-mono mb-1 block" htmlFor="isi">
          Tulis Balasan *
        </label>
        <textarea
          id="isi"
          value={isi}
          onChange={(event) => setIsi(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Sampaikan pendapat atau jawaban Anda..."
          className="input-field resize-y"
          required
        />
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Kirim Balasan
        </button>
      </div>
    </form>
  );
}
