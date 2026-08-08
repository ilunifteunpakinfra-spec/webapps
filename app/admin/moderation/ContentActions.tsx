'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { EyeOff, Loader2, RotateCcw, Trash2, XCircle } from 'lucide-react';
import {
  closePollAction,
  deleteGalleryPhotoAction,
  deleteGroupAction,
  deletePollAction,
  hideAnnouncementAction,
  hideJobAction,
  restoreAnnouncementAction,
  restoreJobAction,
} from '@/app/actions/moderation';
import type { ActionState } from '@/lib/types';

type Kind = 'job' | 'announcement' | 'poll' | 'group' | 'gallery';

type Props = {
  kind: Kind;
  id: string;
  canModerate: boolean;
  /** Current soft-hide state for jobs / announcements. */
  hidden?: boolean;
  /** Already-expired state for polls (disables the soft-close button). */
  closed?: boolean;
};

const DELETE_CONFIRMS: Record<Kind, string> = {
  job: '',
  announcement: '',
  poll: 'Hapus polling beserta semua suara? Tindakan ini tidak dapat dibatalkan.',
  group: 'Hapus grup beserta semua anggotanya? Tindakan ini tidak dapat dibatalkan.',
  gallery: 'Hapus foto beserta file-nya? Tindakan ini tidak dapat dibatalkan.',
};

/** Per-entity moderation buttons (hide/restore/close/delete) for the admin queue. */
export default function ContentActions({ kind, id, canModerate, hidden = false, closed = false }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  if (!canModerate) {
    return <span className="text-xs text-on-surface-variant">Tidak ada akses</span>;
  }

  function run(action: (prev: ActionState, data: FormData) => Promise<ActionState>, extra?: Record<string, string>) {
    const formData = new FormData();
    if (kind === 'job') formData.set('job_id', id);
    if (kind === 'announcement') formData.set('announcement_id', id);
    if (kind === 'poll') formData.set('poll_id', id);
    if (kind === 'group') formData.set('group_id', id);
    if (kind === 'gallery') formData.set('photo_id', id);
    for (const [key, value] of Object.entries(extra ?? {})) formData.set(key, value);

    startTransition(async () => {
      const result = await action({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  function confirmDelete() {
    const message = DELETE_CONFIRMS[kind];
    if (message && !window.confirm(message)) return;
    const actions = {
      poll: deletePollAction,
      group: deleteGroupAction,
      gallery: deleteGalleryPhotoAction,
    } as Record<string, (prev: ActionState, data: FormData) => Promise<ActionState>>;
    run(actions[kind]);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {state.error && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}
      <div className="flex items-center gap-2">
        {kind === 'job' && (
          hidden ? (
            <button
              type="button"
              onClick={() => run(restoreJobAction)}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Pulihkan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => run(hideJobAction)}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
              Sembunyikan
            </button>
          )
        )}

        {kind === 'announcement' && (
          hidden ? (
            <button
              type="button"
              onClick={() => run(restoreAnnouncementAction)}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Pulihkan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => run(hideAnnouncementAction)}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
              Sembunyikan
            </button>
          )
        )}

        {kind === 'poll' && !closed && (
          <button
            type="button"
            onClick={() => run(closePollAction)}
            disabled={isPending}
            className="btn-tertiary px-3 py-1 text-xs"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            Tutup
          </button>
        )}

        {(kind === 'poll' || kind === 'group' || kind === 'gallery') && (
          <button
            type="button"
            onClick={confirmDelete}
            disabled={isPending}
            className="btn-tertiary px-3 py-1 text-xs text-error-on-container"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}
