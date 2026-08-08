'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Flag, Loader2, X } from 'lucide-react';
import { submitReportAction } from '@/app/actions/reports';
import type { ActionState } from '@/lib/types';
import type { ReportTarget } from '@/lib/constants';

type Props = {
  targetType: ReportTarget;
  targetId: string;
  isLoggedIn: boolean;
  className?: string;
};

/** "Laporkan" button + reason modal for any reportable content type. */
export default function ReportButton({
  targetType,
  targetId,
  isLoggedIn,
  className = 'btn-tertiary',
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alasan, setAlasan] = useState('');
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    setState({});
    setAlasan('');
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!alasan.trim()) {
      setState({ error: 'Jelaskan alasan pelaporan terlebih dahulu.' });
      return;
    }

    const formData = new FormData();
    formData.set('target_type', targetType);
    formData.set('target_id', targetId);
    formData.set('alasan', alasan);

    startTransition(async () => {
      const result = await submitReportAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        setOpen(false);
        setAlasan('');
      }
    });
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className={className}>
        <Flag className="h-3.5 w-3.5" />
        Laporkan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Laporkan konten"
        >
          <div
            className="card w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-montserrat text-lg font-bold">Laporkan Konten</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup">
                <X className="h-5 w-5" />
              </button>
            </div>

            {state.error && (
              <p className="mb-3 rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
                {state.error}
              </p>
            )}

            <form onSubmit={handleSubmit}>
              <label className="label-mono mb-1 block" htmlFor="report-alasan">
                Alasan Pelaporan *
              </label>
              <textarea
                id="report-alasan"
                value={alasan}
                onChange={(event) => setAlasan(event.target.value)}
                rows={4}
                placeholder="Contoh: konten mengandung informasi palsu, spam, atau melanggar aturan komunitas."
                className="input-field resize-y"
                required
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-tertiary"
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flag className="h-4 w-4" />
                  )}
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
