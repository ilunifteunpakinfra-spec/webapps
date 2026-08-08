'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck, Loader2, X } from 'lucide-react';
import { resolveReportAction } from '@/app/actions/reports';
import type { ActionState } from '@/lib/types';

type Props = {
  reportId: string;
  canModerate: boolean;
};

/** Resolve / dismiss buttons for a single community report row. */
export default function ReportActions({ reportId, canModerate }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  if (!canModerate) {
    return <span className="text-xs text-on-surface-variant">Tidak ada akses</span>;
  }

  function resolve(status: 'resolved' | 'dismissed') {
    const formData = new FormData();
    formData.set('report_id', reportId);
    formData.set('status', status);

    startTransition(async () => {
      const result = await resolveReportAction({ error: undefined }, formData);
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
          onClick={() => resolve('resolved')}
          disabled={isPending}
          className="btn-tertiary px-3 py-1 text-xs"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
          Selesai
        </button>
        <button
          type="button"
          onClick={() => resolve('dismissed')}
          disabled={isPending}
          className="btn-tertiary px-3 py-1 text-xs"
        >
          <X className="h-3.5 w-3.5" />
          Tolak
        </button>
      </div>
    </div>
  );
}
