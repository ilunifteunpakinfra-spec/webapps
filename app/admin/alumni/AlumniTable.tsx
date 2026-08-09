'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, CheckSquare, Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import {
  bulkVerifyAlumniAction,
  deleteAlumniAdminAction,
  resetContributionAction,
  unverifyAlumniAction,
  verifyAlumniAction,
} from '@/app/actions/alumni-admin';
import type { ActionState, AlumniAdminRow } from '@/lib/types';
import EditAlumniModal from './EditAlumniModal';

type Props = {
  rows: AlumniAdminRow[];
  selfId: string;
  search: string;
};

/** Admin alumni table: bulk verify + per-row edit/verify/reset/delete. */
export default function AlumniTable({ rows, selfId, search }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AlumniAdminRow | null>(null);
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = visibleIds.every((id) => next.has(id));
      for (const id of visibleIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function runAction(
    action: (prev: ActionState, fd: FormData) => Promise<ActionState>,
    fields: Record<string, string>,
    confirmText?: string
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);

    startTransition(async () => {
      const result = await action({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        if (fields.alumni_id) setSelected((prev) => {
          const next = new Set(prev);
          next.delete(fields.alumni_id);
          return next;
        });
        router.refresh();
      }
    });
  }

  function handleBulkVerify() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const formData = new FormData();
    formData.set('ids', JSON.stringify(ids));

    startTransition(async () => {
      const result = await bulkVerifyAlumniAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-4">
      {state.error && (
        <div className="card mb-3 text-sm text-error-on-container">{state.error}</div>
      )}
      {state.success && (
        <div className="card mb-3 text-sm text-green-700">{state.message}</div>
      )}

      {/* Bulk bar */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">
          {selected.size > 0
            ? `${selected.size} alumni dipilih`
            : 'Pilih alumni untuk verifikasi massal'}
        </p>
        <button
          type="button"
          onClick={handleBulkVerify}
          disabled={selected.size === 0 || isPending}
          className={`btn-secondary px-3 py-1.5 text-xs ${
            selected.size === 0 ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckSquare className="h-3.5 w-3.5" />
          )}
          Verifikasi Terpilih
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-left">
              <th className="pb-2 pr-2">
                <input
                  type="checkbox"
                  checked={visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))}
                  onChange={toggleAll}
                  aria-label="Pilih semua"
                  className="h-4 w-4"
                />
              </th>
              <th className="pb-2 font-mono text-xs uppercase tracking-wider">Alumni</th>
              <th className="pb-2 font-mono text-xs uppercase tracking-wider">Angkatan</th>
              <th className="pb-2 font-mono text-xs uppercase tracking-wider">Pekerjaan</th>
              <th className="pb-2 font-mono text-xs uppercase tracking-wider">Verifikasi</th>
              <th className="pb-2 font-mono text-xs uppercase tracking-wider">Open to Work</th>
              <th className="pb-2 font-mono text-xs uppercase tracking-wider">Kontribusi</th>
              <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-outline-variant">
                <td className="py-3 pr-2">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleRow(row.id)}
                    aria-label={`Pilih ${row.nama}`}
                    className="h-4 w-4"
                  />
                </td>
                <td className="py-3">
                  <div className="font-medium">{row.nama}</div>
                  <div className="text-xs text-on-surface-variant">{row.email ?? '-'}</div>
                </td>
                <td className="py-3">{row.angkatan ?? '-'}</td>
                <td className="py-3">
                  <div>{row.pekerjaan ?? '-'}</div>
                  <div className="text-xs text-on-surface-variant">
                    {row.perusahaan ?? ''}
                  </div>
                </td>
                <td className="py-3">
                  {row.status_verifikasi ? (
                    <span className="flex items-center gap-1 text-green-700">
                      <BadgeCheck className="h-4 w-4" /> Terverifikasi
                    </span>
                  ) : (
                    <span className="text-on-surface-variant">Belum</span>
                  )}
                </td>
                <td className="py-3">
                  {row.status_open_to_work ? (
                    <span className="text-green-700">Ya</span>
                  ) : (
                    <span className="text-on-surface-variant">Tidak</span>
                  )}
                </td>
                <td className="py-3">
                  <span className="chip">{row.contribution_score ?? 0}</span>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      disabled={isPending}
                      className="btn-tertiary px-2 py-1 text-xs"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    {row.status_verifikasi ? (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(unverifyAlumniAction, { alumni_id: row.id })
                        }
                        disabled={isPending}
                        className="btn-tertiary px-2 py-1 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" /> Batal Verif
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(verifyAlumniAction, { alumni_id: row.id })
                        }
                        disabled={isPending}
                        className="btn-tertiary px-2 py-1 text-xs"
                      >
                        <BadgeCheck className="h-3 w-3" /> Verifikasi
                      </button>
                    )}
                    {row.contribution_score && row.contribution_score > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(
                            resetContributionAction,
                            { alumni_id: row.id },
                            'Reset skor kontribusi alumni ini ke 0?'
                          )
                        }
                        disabled={isPending}
                        className="btn-tertiary px-2 py-1 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset Skor
                      </button>
                    ) : null}
                    {row.id !== selfId && (
                      <button
                        type="button"
                        onClick={() =>
                          runAction(
                            deleteAlumniAdminAction,
                            { alumni_id: row.id },
                            `Hapus akun ${row.nama}? Seluruh data alumni (profil, lowongan, polling, galeri, laporan) akan dihapus permanen.`
                          )
                        }
                        disabled={isPending}
                        className="btn-tertiary px-2 py-1 text-xs text-error-on-container"
                      >
                        <Trash2 className="h-3 w-3" /> Hapus
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-on-surface-variant">
                  Tidak ada alumni yang cocok{search ? ` untuk "${search}"` : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditAlumniModal row={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
