import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import GroupForm from './GroupForm';

export const metadata = {
  title: 'Buat Grup - ILUNI FT ELEKTRO UNPAK',
};

export default function GrupBaruPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[760px] px-5 py-8 md:px-8">
        <Link
          href="/grup"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Grup
        </Link>

        <div className="mb-6">
          <h1 className="hero-title mb-2 flex items-center gap-2">
            <Plus className="h-7 w-7 text-primary-container" />
            Buat Grup Baru
          </h1>
          <p className="text-on-surface-variant">
            Buat komunitas berdasarkan angkatan (angkatan) atau minat profesional.
            Anda otomatis menjadi admin grup.
          </p>
        </div>

        <div className="card p-5">
          <GroupForm />
        </div>
      </div>
    </div>
  );
}
