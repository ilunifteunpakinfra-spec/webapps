'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { endorseSkillAction } from '@/app/actions/skills';
import type { ActionState } from '@/lib/types';

export default function EndorseButton({
  alumniId,
  skillId,
  initialCount,
  canEndorse,
}: {
  alumniId: string;
  skillId: string;
  initialCount: number;
  canEndorse: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [endorsed, setEndorsed] = useState(false);
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleEndorse() {
    const formData = new FormData();
    formData.set('alumni_id', alumniId);
    formData.set('skill_id', skillId);

    startTransition(async () => {
      const result = await endorseSkillAction({ error: undefined }, formData);
      if (result.success) {
        setCount((current) => current + 1);
        setEndorsed(true);
        setState({});
        router.refresh();
      } else {
        setState(result);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {state.error && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}
      <button
        type="button"
        onClick={handleEndorse}
        disabled={!canEndorse || endorsed || isPending}
        className={`inline-flex items-center gap-1 rounded border border-tech-black px-2 py-1 text-xs font-medium transition-colors ${
          endorsed
            ? 'bg-primary-container text-white'
            : canEndorse
              ? 'hover:bg-primary-container hover:text-white'
              : 'cursor-not-allowed opacity-50'
        }`}
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ThumbsUp className="h-3 w-3" />
        )}
        {endorsed ? 'Didukung' : 'Dukung'} · {count}
      </button>
    </div>
  );
}
