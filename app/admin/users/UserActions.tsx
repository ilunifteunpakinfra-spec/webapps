'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2, RotateCcw, ShieldCheck, X } from 'lucide-react';
import {
  banUserAction,
  setUserRoleAction,
  unbanUserAction,
} from '@/app/actions/users';
import {
  ADMIN_CAPABILITIES,
  DEFAULT_ADMIN_CAPABILITIES,
  type AdminCapability,
} from '@/lib/constants';
import type { ActionState } from '@/lib/types';

type Props = {
  userId: string;
  currentRole: string | null;
  capabilities: string[];
  bannedUntil: string | null;
  self?: boolean;
};

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'alumni', label: 'Alumni' },
];

/** Per-row role/ban controls for the admin users page. */
export default function UserActions({
  userId,
  currentRole,
  capabilities,
  bannedUntil,
  self = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<string>(
    currentRole === 'super_admin' || currentRole === 'admin'
      ? currentRole
      : 'admin'
  );
  // Pre-check the proposed default set when promoting someone who has no
  // capabilities yet; keep existing grants otherwise.
  const [caps, setCaps] = useState<string[]>(
    capabilities.length > 0 ? capabilities : [...DEFAULT_ADMIN_CAPABILITIES]
  );
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function toggleCap(cap: AdminCapability) {
    setCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  function submitRole() {
    const formData = new FormData();
    formData.set('target_uid', userId);
    formData.set('role', role);
    for (const cap of caps) formData.set(`cap_${cap}`, 'on');

    startTransition(async () => {
      const result = await setUserRoleAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleBan() {
    if (
      !window.confirm(
        'Blokir pengguna ini? Mereka tidak akan dapat masuk selama masa blokir.'
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set('target_uid', userId);

    startTransition(async () => {
      const result = await banUserAction({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  function handleUnban() {
    const formData = new FormData();
    formData.set('target_uid', userId);

    startTransition(async () => {
      const result = await unbanUserAction({ error: undefined }, formData);
      setState(result);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {state.error && !open && (
        <span className="text-xs text-error-on-container">{state.error}</span>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-tertiary px-3 py-1 text-xs"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Atur Peran
        </button>

        {!self && !bannedUntil && (
          <button
            type="button"
            onClick={handleBan}
            disabled={isPending}
            className="btn-tertiary px-3 py-1 text-xs"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
            Blokir
          </button>
        )}

        {!self && bannedUntil && (
          <button
            type="button"
            onClick={handleUnban}
            disabled={isPending}
            className="btn-tertiary px-3 py-1 text-xs"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Buka Blokir
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-montserrat text-lg font-bold">
                Atur Peran Pengguna
              </h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup">
                <X className="h-5 w-5" />
              </button>
            </div>

            {state.error && (
              <p className="mb-3 text-sm text-error-on-container">
                {state.error}
              </p>
            )}

            <label className="label-mono mb-1 block">Peran</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-field mb-4"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {role === 'admin' && (
              <div className="mb-4">
                <p className="label-mono mb-2">Kemampuan</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {ADMIN_CAPABILITIES.map((cap) => (
                    <label
                      key={cap}
                      className="flex cursor-pointer items-center gap-2 rounded border border-outline-variant px-2 py-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={caps.includes(cap)}
                        onChange={() => toggleCap(cap)}
                        className="h-4 w-4"
                      />
                      <span className="font-mono text-xs">{cap}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={submitRole}
              disabled={isPending}
              className="btn-primary w-full"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Simpan Peran
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
