'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Exchange the recovery code for a session on mount.
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('Tautan reset tidak valid. Silakan minta ulang.');
      return;
    }

    const supabase = createClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          setError('Tautan reset tidak valid atau sudah kedaluwarsa.');
          return;
        }
        setReady(true);
      });
  }, [searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    const supabase = createClient();
    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut();
      router.push('/login?error=reset-berhasil');
      router.refresh();
    });
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
          {error}
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <p className="text-center text-sm text-on-surface-variant">
        Memverifikasi tautan...
      </p>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="label-mono mb-1 block" htmlFor="password">
          Password Baru
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
        {isPending ? 'Menyimpan...' : 'Simpan Password Baru'}
      </button>
    </form>
  );
}
