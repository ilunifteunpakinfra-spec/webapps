'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, X } from 'lucide-react';
import {
  approveSkillAction,
  rejectSkillAction,
} from '@/app/actions/moderation';
import type { ActionState } from '@/lib/types';

type Props = {
  skillId: string;
  canModerate: boolean;
};

/** Approve/reject buttons for pending free-text skill requests. */
export default function SkillActions({ skillId, canModerate }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  if (!canModerate) {
    return <span className="text-xs text-on-surface-variant">Tidak ada akses</span>;
  }

  function run(action: (prev: ActionState, data: FormData) => Promise<ActionState>) {
    const formData = new FormData();
    formData.set('skill_id', skillId);

    startTransition(async () => {
      const result = await action({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {state.error && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => run(approveSkillAction)}
          disabled={isPending}
          className="btn-tertiary px-3 py-1 text-xs"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Setujui
        </button>
        <button
          type="button"
          onClick={() => run(rejectSkillAction)}
          disabled={isPending}
          className="btn-tertiary px-3 py-1 text-xs text-error-on-container"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
          Tolak
        </button>
      </div>
    </div>
  );
}
