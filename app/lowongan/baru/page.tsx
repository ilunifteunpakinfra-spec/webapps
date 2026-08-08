import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import JobForm from './JobForm';

export const metadata = {
  title: 'Pasang Lowongan - ILUNI FT ELEKTRO UNPAK',
};

export default function LowonganBaruPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[760px] px-5 py-8 md:px-8">
        <Link
          href="/lowongan"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Lowongan
        </Link>

        <div className="mb-6">
          <h1 className="hero-title mb-2">Pasang Lowongan</h1>
          <p className="text-on-surface-variant">
            Bagikan peluang kerja dari perusahaan Anda kepada jaringan alumni.
            Hanya alumni terverifikasi yang dapat memasang lowongan.
          </p>
        </div>

        <div className="card p-5">
          <JobForm />
        </div>
      </div>
    </div>
  );
}
