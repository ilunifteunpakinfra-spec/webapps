'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, EyeOff, Loader2, RotateCcw, Trash2, XCircle } from 'lucide-react';
import {
  approveGalleryPhotoAction,
  deleteGalleryPhotoAction,
  hideGalleryPhotoAction,
  rejectGalleryPhotoAction,
  restoreGalleryPhotoAction,
} from '@/app/actions/gallery';
import type { ActionState } from '@/lib/types';

type Props = {
  photoId: string;
  status: string;
  /** Admin holds `moderate_gallery` (approve/reject/hide). */
  canModerate: boolean;
  /** Super admin only: restore hidden photos & permanent delete. */
  isSuperAdmin: boolean;
};

/**
 * Tombol moderasi per foto galeri sesuai statusnya:
 * - pending : Setujui / Tolak        (moderate_gallery)
 * - active  : Sembunyikan            (moderate_gallery)
 * - hidden  : Pulihkan / Hapus permanen (super admin saja)
 */
export default function GalleryActions({ photoId, status, canModerate, isSuperAdmin }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function run(action: (prev: ActionState, data: FormData) => Promise<ActionState>) {
    const formData = new FormData();
    formData.set('photo_id', photoId);
    startTransition(async () => {
      const result = await action({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  function confirmPermanentDelete() {
    if (!window.confirm('Hapus foto beserta file-nya secara permanen? Tindakan ini tidak dapat dibatalkan.')) return;
    run(deleteGalleryPhotoAction);
  }

  const showModerationButtons =
    canModerate && (status === 'pending' || status === 'active');
  const showSuperAdminButtons = isSuperAdmin && status === 'hidden';

  if (!showModerationButtons && !showSuperAdminButtons) {
    return <span className="text-xs text-on-surface-variant">Tidak ada aksi</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {state.error && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {showModerationButtons && status === 'pending' && (
          <>
            <button
              type="button"
              onClick={() => run(approveGalleryPhotoAction)}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Setujui
            </button>
            <button
              type="button"
              onClick={() => run(rejectGalleryPhotoAction)}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Tolak
            </button>
          </>
        )}

        {showModerationButtons && status === 'active' && (
          <button
            type="button"
            onClick={() => run(hideGalleryPhotoAction)}
            disabled={isPending}
            className="btn-tertiary px-3 py-1 text-xs"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
            Sembunyikan
          </button>
        )}

        {showSuperAdminButtons && (
          <>
            <button
              type="button"
              onClick={() => run(restoreGalleryPhotoAction)}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Pulihkan
            </button>
            <button
              type="button"
              onClick={confirmPermanentDelete}
              disabled={isPending}
              className="btn-tertiary px-3 py-1 text-xs text-error-on-container"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Hapus Permanen
            </button>
          </>
        )}
      </div>
    </div>
  );
}