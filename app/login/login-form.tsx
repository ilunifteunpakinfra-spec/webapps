'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInAction } from '@/app/actions/auth';
import type { ActionState } from '@/lib/types';

export default function LoginForm({
  next,
  serverError,
  serverMessage,
}: {
  next: string;
  serverError: string | null;
  serverMessage: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({
    error: serverError ?? undefined,
    message: serverMessage ?? undefined,
  });
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await signInAction({ error: undefined }, formData);
      setState(result);
      if (result.success) {
        router.push(next);
        router.refresh();
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {state.error && (
        <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
          {state.error}
        </div>
      )}
      {state.message && !state.error && (
        <div className="rounded border border-primary-container/40 bg-surface-container px-3 py-2 text-sm text-on-surface">
          {state.message}
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
      <div>
        <label className="label-mono mb-1 block" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          className="input-field"
          required
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded border-wire-gray" />
          <span className="text-on-surface-variant">Ingat saya</span>
        </label>
        <Link
          href="/lupa-password"
          className="text-primary-container hover:underline"
        >
          Lupa password?
        </Link>
      </div>
      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Memproses...' : 'Masuk'}
      </button>
    </form>
  );
}
