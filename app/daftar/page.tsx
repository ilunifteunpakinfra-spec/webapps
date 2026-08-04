import Link from 'next/link';
import { Zap } from 'lucide-react';
import RegisterForm from './register-form';

export default function DaftarPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-lg">
        <div className="card p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded bg-primary-container">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-montserrat text-2xl font-bold">Daftar Alumni FTE</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Bergabung dengan jaringan alumni teknik elektro
            </p>
          </div>

          <RegisterForm />

          <div className="mt-6 border-t border-outline-variant pt-4 text-center text-sm">
            <span className="text-on-surface-variant">Sudah punya akun? </span>
            <Link
              href="/login"
              className="font-medium text-primary-container hover:underline"
            >
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
