import { Suspense } from 'react';
import ResetPasswordForm from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-5">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <h1 className="font-montserrat text-2xl font-bold">Reset Password</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Buat password baru untuk akun Anda
            </p>
          </div>

          <Suspense fallback={<p className="text-center text-sm text-on-surface-variant">Memuat...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
