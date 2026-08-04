'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signUpAction } from '@/app/actions/auth';
import type { ActionState } from '@/lib/types';

export default function RegisterForm() {
  const router = useRouter();
  const [state, setState] = useState<ActionState>({});
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await signUpAction({ error: undefined }, formData);
      setState(result);
      if (result.success && !result.message) {
        router.push('/profil/edit');
        router.refresh();
      }
    });
  }

  if (state.success && state.message) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <span className="chip-active">Cek Email Anda</span>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-mono mb-1 block" htmlFor="nama">
            Nama Lengkap
          </label>
          <input
            id="nama"
            name="nama"
            type="text"
            placeholder="Nama Anda"
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label-mono mb-1 block" htmlFor="angkatan">
            Angkatan
          </label>
          <input
            id="angkatan"
            name="angkatan"
            type="text"
            placeholder="'12"
            className="input-field"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-mono mb-1 block" htmlFor="tahun_lulus">
            Tahun Lulus
          </label>
          <input
            id="tahun_lulus"
            name="tahun_lulus"
            type="number"
            placeholder="2012"
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label-mono mb-1 block" htmlFor="pekerjaan">
            Pekerjaan
          </label>
          <input
            id="pekerjaan"
            name="pekerjaan"
            type="text"
            placeholder="Engineer"
            className="input-field"
          />
        </div>
      </div>
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
        <label className="label-mono mb-1 block" htmlFor="no_telepon">
          No. Telepon
        </label>
        <input
          id="no_telepon"
          name="no_telepon"
          type="tel"
          placeholder="+62 812-3456-7890"
          className="input-field"
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
          placeholder="Minimal 6 karakter"
          className="input-field"
          minLength={6}
          required
        />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={isPending}>
        {isPending ? 'Memproses...' : 'Daftar'}
      </button>
    </form>
  );
}
