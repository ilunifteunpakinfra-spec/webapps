'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createRecoveryClient } from '@/lib/supabase/client';

/** Map Supabase/GoTrue error codes to messages a user can act on. */
function describeError(code: string | null, fallback: string): string {
  switch (code) {
    case 'otp_expired':
      return 'Tautan reset sudah kedaluwarsa. Silakan minta tautan baru.';
    case 'access_denied':
      return 'Tautan reset tidak valid. Silakan minta tautan baru.';
    default:
      return fallback;
  }
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Guards against a second exchange: PKCE codes are single-use, and React
  // StrictMode double-invokes effects in development.
  const started = useRef(false);

  // Exchange the recovery code for a session on mount.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Supabase redirects back here with ?error=... when the link is expired or
    // malformed, so surface that before touching the code at all.
    const urlErrorCode = searchParams.get('error_code');
    if (urlErrorCode || searchParams.get('error')) {
      setError(
        describeError(
          urlErrorCode,
          'Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta ulang.'
        )
      );
      return;
    }

    const code = searchParams.get('code');
    if (!code) {
      setError('Tautan reset tidak valid. Silakan minta ulang.');
      return;
    }

    // createRecoveryClient() disables detectSessionInUrl, so this is the only
    // exchange attempt for this code.
    const supabase = createRecoveryClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          console.error('[reset-password] exchangeCodeForSession failed:', exchangeError);
          setError(
            describeError(
              exchangeError.code ?? null,
              'Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta ulang.'
            )
          );
          return;
        }

        // Drop the spent code from the URL so a refresh (or the back button)
        // does not try to redeem it a second time.
        router.replace('/reset-password');
        setReady(true);
      })
      .catch((unexpected: unknown) => {
        console.error('[reset-password] unexpected exchange failure:', unexpected);
        setError('Terjadi kesalahan tak terduga. Silakan coba lagi.');
      });
  }, [router, searchParams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    const supabase = createRecoveryClient();
    startTransition(async () => {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // The recovery session is single purpose; force a fresh login with the
      // new password.
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
        <p className="mt-4 text-sm text-on-surface-variant">
          <Link
            href="/lupa-password"
            className="font-medium text-primary-container hover:underline"
          >
            Minta tautan reset baru
          </Link>
        </p>
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
