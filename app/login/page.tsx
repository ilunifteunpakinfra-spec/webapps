import Link from 'next/link';
import { Zap } from 'lucide-react';
import LoginForm from './login-form';
import { safePath } from '@/lib/utils';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safePath(params.next, '/');
  const error =
    params.error === 'verifikasi'
      ? 'Tautan verifikasi tidak valid atau sudah kedaluwarsa. Silakan masuk kembali.'
      : null;
  const message =
    params.error === 'reset-berhasil'
      ? 'Password berhasil diubah. Silakan masuk dengan password baru Anda.'
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded bg-primary-container">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-montserrat text-2xl font-bold">Masuk ke ILUNI FTE</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Selamat datang kembali, alumni!
            </p>
          </div>

          <LoginForm next={next} serverError={error} serverMessage={message} />

          <div className="mt-6 border-t border-outline-variant pt-4 text-center text-sm">
            <span className="text-on-surface-variant">Belum punya akun? </span>
            <Link
              href="/daftar"
              className="font-medium text-primary-container hover:underline"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
