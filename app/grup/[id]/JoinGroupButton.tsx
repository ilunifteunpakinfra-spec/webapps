'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2 } from 'lucide-react';
import { joinGroupAction } from '@/app/actions/groups';
import type { ActionState } from '@/lib/types';

export default function JoinGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    const formData = new FormData();
    formData.set('group_id', groupId);

    startTransition(async () => {
      const result = await joinGroupAction({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {state.error && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}
      <button type="button" onClick={handleJoin} disabled={isPending} className="btn-primary">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        Gabung Grup
      </button>
    </div>
  );
}
