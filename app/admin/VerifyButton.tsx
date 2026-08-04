'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { verifyAlumniAction } from '@/app/actions/admin';
import type { ActionState } from '@/lib/types';

export default function VerifyButton({ alumniId }: { alumniId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleVerify() {
    const formData = new FormData();
    formData.set('alumni_id', alumniId);

    startTransition(async () => {
      const result = await verifyAlumniAction({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {state.error && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}
      <button
        type="button"
        onClick={handleVerify}
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Verifikasi
      </button>
    </div>
  );
}
