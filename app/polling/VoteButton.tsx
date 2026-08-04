'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { votePollAction } from '@/app/actions/polls';
import type { ActionState } from '@/lib/types';

export default function VoteButton({
  pollId,
  optionId,
  label,
}: {
  pollId: string;
  optionId: string;
  label: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleVote() {
    const formData = new FormData();
    formData.set('poll_id', pollId);
    formData.set('option_id', optionId);

    startTransition(async () => {
      const result = await votePollAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        setState({});
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleVote}
        disabled={isPending}
        className="w-full rounded border border-wire-gray bg-white p-3 text-left transition-colors hover:border-primary-container disabled:opacity-70"
      >
        <span className="flex items-center justify-between text-sm">
          <span className="font-medium">{label}</span>
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-primary-container" />}
        </span>
      </button>
      {state.error && <span className="text-xs text-error-on-container">{state.error}</span>}
    </div>
  );
}
