'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, X } from 'lucide-react';
import { updateAlumniAdminAction } from '@/app/actions/alumni-admin';
import type { ActionState, AlumniAdminRow } from '@/lib/types';

type Props = {
  row: AlumniAdminRow;
  onClose: () => void;
};

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publik' },
  { value: 'alumni_only', label: 'Alumni Saja' },
  { value: 'private', label: 'Privat' },
];

/** Modal form to edit any alumni profile field (manage_alumni). */
export default function EditAlumniModal({ row, onClose }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updateAlumniAdminAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card max-h-[90vh] w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-montserrat text-lg font-bold">Edit Profil Alumni</h3>
          <button type="button" onClick={onClose} aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        {state.error && (
          <p className="mb-3 text-sm text-error-on-container">{state.error}</p>
        )}

        <form action={submit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input type="hidden" name="alumni_id" value={row.id} />

          <div className="md:col-span-2">
            <label className="label-mono mb-1 block">Nama *</label>
            <input
              name="nama"
              defaultValue={row.nama}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Angkatan</label>
            <input
              name="angkatan"
              defaultValue={row.angkatan ?? ''}
              placeholder="cth. 2015"
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Tahun Lulus *</label>
            <input
              name="tahun_lulus"
              type="number"
              min={1960}
              max={2100}
              defaultValue={row.tahun_lulus ?? new Date().getFullYear()}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Pekerjaan</label>
            <input
              name="pekerjaan"
              defaultValue={row.pekerjaan ?? ''}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Perusahaan</label>
            <input
              name="perusahaan"
              defaultValue={row.perusahaan ?? ''}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">No. Telepon</label>
            <input
              name="no_telepon"
              defaultValue={row.no_telepon ?? ''}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">LinkedIn</label>
            <input
              name="linkedin"
              defaultValue={row.linkedin ?? ''}
              placeholder="https://linkedin.com/in/..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Instagram</label>
            <input
              name="instagram"
              defaultValue={row.instagram ?? ''}
              placeholder="https://instagram.com/..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">GitHub</label>
            <input
              name="github"
              defaultValue={row.github ?? ''}
              placeholder="https://github.com/..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Facebook</label>
            <input
              name="facebook"
              defaultValue={row.facebook ?? ''}
              placeholder="https://facebook.com/..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">X (Twitter)</label>
            <input
              name="twitter"
              defaultValue={row.twitter ?? ''}
              placeholder="https://x.com/..."
              className="input-field"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label-mono mb-1 block">Bio Singkat</label>
            <textarea
              name="bio_singkat"
              defaultValue={row.bio_singkat ?? ''}
              rows={2}
              className="input-field"
            />
          </div>

          <div className="md:col-span-2">
            <label className="label-mono mb-1 block">Portofolio URL</label>
            <input
              name="portofolio_url"
              defaultValue={row.portofolio_url ?? ''}
              placeholder="https://..."
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Visibilitas</label>
            <select
              name="visibilitas"
              defaultValue={row.visibilitas ?? 'public'}
              className="input-field"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end gap-1.5 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="status_open_to_work"
                defaultChecked={row.status_open_to_work ?? false}
                className="h-4 w-4"
              />
              Open to Work
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="status_verifikasi"
                defaultChecked={row.status_verifikasi ?? false}
                className="h-4 w-4"
              />
              Terverifikasi
            </label>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
