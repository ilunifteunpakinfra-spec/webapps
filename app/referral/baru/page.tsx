import Link from 'next/link';
import { ArrowLeft, Handshake } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import { asString } from '@/lib/utils';
import ReferralForm from './ReferralForm';
import type { JobPostingRow } from '@/lib/types';

export const metadata = {
  title: 'Minta Referral - ILUNI FTE UNPAK',
};

type ReferralBaruSearchParams = {
  alumni?: string | string[];
  job?: string | string[];
};

export default async function ReferralBaruPage({
  searchParams,
}: {
  searchParams: ReferralBaruSearchParams;
}) {
  const user = await getCurrentUser();
  const supabase = createClient();

  const prefilledAlumniId = asString(searchParams.alumni);
  const jobId = asString(searchParams.job);

  // RLS limits this list to profiles the viewer may see; exclude self.
  const { data: alumniRows } = await supabase
    .from('alumni')
    .select('id, nama, pekerjaan, perusahaan')
    .order('nama');

  const candidates = (alumniRows ?? []).filter((row) => row.id !== user?.id);

  // Load the optional job posting to prefill perusahaan/posisi.
  const { data: job } = jobId
    ? await supabase
        .from('job_postings')
        .select('id, judul, perusahaan')
        .eq('id', jobId)
        .maybeSingle()
    : { data: null };

  // Validate that the prefilled target is still visible/selectable.
  const prefilledTarget = prefilledAlumniId
    ? candidates.find((row) => row.id === prefilledAlumniId)
    : undefined;

  const jobRow = job as Pick<JobPostingRow, 'id' | 'judul' | 'perusahaan'> | null;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[760px] px-5 py-8 md:px-8">
        <Link
          href={jobRow ? `/lowongan/${jobRow.id}` : '/direktori'}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>

        <div className="mb-6">
          <h1 className="hero-title mb-2 flex items-center gap-2">
            <Handshake className="h-7 w-7 text-primary-container" />
            Minta Referral
          </h1>
          <p className="text-on-surface-variant">
            Ajukan permintaan referral secara pribadi. Hanya Anda dan alumni yang dituju
            yang dapat melihat permintaan ini.
          </p>
        </div>

        <div className="card p-5">
          <ReferralForm
            candidates={candidates.map((row) => ({
              id: row.id,
              nama: row.nama,
              pekerjaan: row.pekerjaan,
              perusahaan: row.perusahaan,
            }))}
            prefilledTargetId={prefilledTarget?.id}
            job={jobRow}
          />
        </div>
      </div>
    </div>
  );
}
