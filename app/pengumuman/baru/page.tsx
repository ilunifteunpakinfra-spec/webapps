import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AnnouncementForm from './AnnouncementForm';

export const metadata = {
  title: 'Buat Pengumuman - ILUNI FTE UNPAK',
};

export default function PengumumanBaruPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[720px] px-5 py-8 md:px-8">
        <Link
          href="/pengumuman"
          className="mb-4 inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Pengumuman
        </Link>

        <h1 className="hero-title mb-2">Buat Pengumuman</h1>
        <p className="mb-6 text-on-surface-variant">
          Bagikan informasi ke seluruh komunitas. Hanya alumni terverifikasi yang
          dapat mempublikasikan.
        </p>

        <div className="card">
          <AnnouncementForm />
        </div>
      </div>
    </div>
  );
}
