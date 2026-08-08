import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, MapPin, Clock, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { asString } from '@/lib/utils';
import type { JobPostingRow } from '@/lib/types';

const JOBS_PAGE_SIZE = 8;

type LowonganSearchParams = {
  skill?: string | string[];
  page?: string | string[];
};

export const metadata: Metadata = {
  title: 'Lowongan Kerja - ILUNI FTE UNPAK',
};

/** "2 hari lalu" style relative time from an ISO timestamp. */
function daysAgo(iso: string | null | undefined): string {
  if (!iso) return 'Baru';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

export default async function LowonganPage({
  searchParams,
}: {
  searchParams: Promise<LowonganSearchParams>;
}) {
  const params = await searchParams;
  const skill = asString(params.skill);
  const rawPage = Number(asString(params.page)) || 1;
  const page = Math.max(1, rawPage);

  const supabase = await createClient();

  let query = supabase
    .from('job_postings')
    .select('*, alumni(nama)', { count: 'exact' })
    .or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false });

  if (skill) query = query.contains('skill_required', [skill]);

  query = query.range((page - 1) * JOBS_PAGE_SIZE, page * JOBS_PAGE_SIZE - 1);

  const { data: jobRows, count } = await query;

  // Build skill chips from all active postings (not just the current page).
  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('skill_required')
    .or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`);

  const skillOptions = Array.from(
    new Set((allJobs ?? []).flatMap((row) => row.skill_required ?? []))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const jobs = (jobRows ?? []) as (JobPostingRow & { alumni: { nama: string } | null })[];

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / JOBS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  function buildHref(patch: { skill?: string; page?: string }) {
    const params = new URLSearchParams();
    const nextSkill = 'skill' in patch ? patch.skill : skill;
    const nextPage = 'page' in patch ? patch.page : undefined;
    if (nextSkill) params.set('skill', nextSkill);
    if (nextPage) params.set('page', nextPage);
    const queryString = params.toString();
    return queryString ? `/lowongan?${queryString}` : '/lowongan';
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="hero-title mb-2">Lowongan Kerja</h1>
            <p className="text-on-surface-variant">
              Peluang karir dari alumni dan perusahaan mitra
            </p>
          </div>
          <Link href="/lowongan/baru" className="btn-primary">
            <Briefcase className="h-4 w-4" />
            Pasang Lowongan
          </Link>
        </div>

        {/* Skill filter chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href={buildHref({ skill: undefined })} className={!skill ? 'chip-active' : 'chip'}>
            Semua
          </Link>
          {skillOptions.map((option) => (
            <Link
              key={option}
              href={buildHref({ skill: skill === option ? undefined : option })}
              className={skill === option ? 'chip-active' : 'chip'}
            >
              {option}
            </Link>
          ))}
        </div>

        <p className="mb-4 text-sm text-on-surface-variant">
          {count ?? 0} lowongan aktif ditemukan
        </p>

        {/* Job listings */}
        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <div key={job.id} className="card-accent">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-montserrat text-lg font-bold text-on-surface">
                      {job.judul}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-sm text-on-surface-variant">
                      <Building2 className="h-4 w-4" />
                      {job.perusahaan}
                      {job.alumni?.nama && (
                        <span className="chip">oleh {job.alumni.nama}</span>
                      )}
                    </div>
                  </div>
                  <span className="chip">{daysAgo(job.created_at)}</span>
                </div>

                <div className="mb-3 flex items-center gap-4 text-sm text-on-surface-variant">
                  {job.lokasi && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.lokasi}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {job.expired_at ? `Tutup ${new Date(job.expired_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Tanpa batas'}
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {(job.skill_required ?? []).map((s) => (
                    <Link
                      key={s}
                      href={buildHref({ skill: skill === s ? undefined : s })}
                      className={skill === s ? 'chip-active' : 'chip'}
                    >
                      {s}
                    </Link>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                  <Link
                    href={`/lowongan/${job.id}`}
                    className="text-sm font-medium text-primary-container hover:underline"
                  >
                    Lihat Detail
                  </Link>
                  <Link href={`/referral/baru?job=${job.id}`} className="btn-secondary">
                    Minta Referral
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada lowongan aktif yang cocok.
          </div>
        )}

        {/* Server-side pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link
              href={buildHref({ page: String(Math.max(1, currentPage - 1)) })}
              aria-disabled={currentPage <= 1}
              className={`btn-tertiary ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, index, visible) => {
                const previous = visible[index - 1];
                const gap = previous !== undefined && p - previous > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {gap && <span className="chip">...</span>}
                    <Link
                      href={buildHref({ page: String(p) })}
                      className={p === currentPage ? 'chip-active' : 'chip'}
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}
            <Link
              href={buildHref({ page: String(Math.min(totalPages, currentPage + 1)) })}
              aria-disabled={currentPage >= totalPages}
              className={`btn-tertiary ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
