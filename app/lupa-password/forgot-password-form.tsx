'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { requestPasswordResetAction } from '@/app/actions/auth';
import type { ActionState } from '@/lib/types';

export default function ForgotPasswordForm() {
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestPasswordResetAction({ error: undefined }, formData);
      setState(result);
    });
  }

  if (state.success) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <span className="chip-active">Email Terkirim</span>
        </div>
        <p className="text-sm text-on-surface-variant">{state.message}</p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {state.error && (
        <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
          {state.error}
        </div>
      )}
      <div>
        <label className="label-mono mb-1 block" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          className="input-field"
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Mengirim...' : 'Kirim Tautan Reset'}
      </button>
    </form>
  );
}
