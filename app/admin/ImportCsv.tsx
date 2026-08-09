'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { Upload, Loader2, Download } from 'lucide-react';

type ImportResult = {
  imported?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
};

export default function ImportCsv() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setResult({ error: 'Pilih file CSV terlebih dahulu.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('file', file);
      const response = await fetch('/api/admin/import', { method: 'POST', body: formData });
      const json = (await response.json().catch(() => ({}))) as ImportResult;
      setResult(json);
      if (response.ok && json.imported !== undefined) {
        inputRef.current!.value = '';
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="text-sm text-on-surface-variant file:mr-3 file:rounded file:border file:border-tech-black file:bg-surface-container file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-on-surface hover:file:bg-surface"
        />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isPending ? 'Mengimpor...' : 'Import Data'}
        </button>
      </form>
      <a
        href="/api/admin/import/template"
        download
        className="inline-flex items-center gap-2 text-sm font-medium text-primary-container hover:underline"
      >
        <Download className="h-4 w-4" />
        Unduh template CSV (Import)
      </a>
      {result?.error && (
        <p className="text-xs text-error-on-container">{result.error}</p>
      )}
      {result?.imported !== undefined && (
        <p className="text-xs text-on-surface">
          Berhasil mengimpor {result.imported} alumni
          {typeof result.skipped === 'number' && result.skipped > 0
            ? `, ${result.skipped} baris dilewati`
            : ''}
          .
        </p>
      )}
      {result?.errors && result.errors.length > 0 && (
        <ul className="text-xs text-error-on-container">
          {result.errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
