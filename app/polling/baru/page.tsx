import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import PollForm from './PollForm';

export const metadata: Metadata = {
  title: 'Buat Polling - ILUNI FT ELEKTRO UNPAK',
};

export default function PollingBaruPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[760px] px-5 py-8 md:px-8">
        <Link
          href="/polling"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Polling
        </Link>

        <div className="mb-6">
          <h1 className="hero-title mb-2 flex items-center gap-2">
            <Plus className="h-7 w-7 text-primary-container" />
            Buat Polling Baru
          </h1>
          <p className="text-on-surface-variant">
            Ajukan pertanyaan kepada komunitas dengan 2-4 opsi jawaban.
            Setiap alumni hanya dapat memilih satu kali.
          </p>
        </div>

        <div className="card p-5">
          <PollForm />
        </div>
      </div>
    </div>
  );
}
