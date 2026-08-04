import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Building2,
  Clock,
  ExternalLink,
  Handshake,
  ArrowLeft,
  Briefcase,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import type { JobPostingRow } from '@/lib/types';

export const metadata = {
  title: 'Detail Lowongan - ILUNI FTE UNPAK',
};

export default async function LowonganDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: job } = await supabase
    .from('job_postings')
    .select('*, alumni(id, nama, pekerjaan)')
    .eq('id', params.id)
    .maybeSingle();

  if (!job) notFound();

  const { judul, deskripsi, perusahaan, lokasi, skill_required, link_apply, expired_at, created_at } =
    job as JobPostingRow & { alumni: { id: string; nama: string; pekerjaan: string | null } | null };

  const expiredLabel = expired_at
    ? `Tutup ${new Date(expired_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : 'Tanpa batas waktu';

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[900px] px-5 py-8 md:px-8">
        <Link
          href="/lowongan"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Lowongan
        </Link>

        <div className="card-accent mb-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="hero-title mb-2">{judul}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {perusahaan}
                </span>
                {lokasi && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {lokasi}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {expiredLabel}
                </span>
              </div>
            </div>
            <Briefcase className="hidden h-8 w-8 shrink-0 text-primary-container md:block" />
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            {(skill_required ?? []).map((s) => (
              <span key={s} className="chip">{s}</span>
            ))}
          </div>

          {deskripsi && (
            <div className="mb-4 border-t border-outline-variant pt-4">
              <h2 className="section-title mb-2">Deskripsi</h2>
              <p className="whitespace-pre-line text-on-surface-variant">{deskripsi}</p>
            </div>
          )}

          {job.alumni && (
            <p className="mb-4 text-sm text-on-surface-variant">
              Diposting oleh{' '}
              <Link
                href={`/profil/${job.alumni.id}`}
                className="font-medium text-primary-container hover:underline"
              >
                {job.alumni.nama}
              </Link>
              {created_at &&
                ` pada ${new Date(created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-outline-variant pt-4 sm:flex-row">
            {link_apply && (
              <a
                href={link_apply}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <ExternalLink className="h-4 w-4" />
                Lamar Sekarang
              </a>
            )}
            <Link href={`/referral/baru?job=${job.id}`} className="btn-secondary">
              <Handshake className="h-4 w-4" />
              Minta Referral dari Alumni
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
