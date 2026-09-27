import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import Navbar from '@/components/Navbar';
import EmptyState from '@/components/EmptyState';
import JobCard, { type JobCardJob } from '@/components/jobs/JobCard';
import JobFilters from '@/components/jobs/JobFilters';
import { createClient } from '@/lib/supabase/server';
import { asString } from '@/lib/utils';
import { JOBS_PAGE_SIZE } from '@/lib/constants';

type LowonganSearchParams = {
  skill?: string | string[];
  page?: string | string[];
  type?: string | string[];
  mode?: string | string[];
  exp?: string | string[];
  salary?: string | string[];
  q?: string | string[];
};

export const metadata: Metadata = {
  title: 'Lowongan Kerja - ILUNI FT ELEKTRO UNPAK',
};

export default async function LowonganPage({
  searchParams,
}: {
  searchParams: Promise<LowonganSearchParams>;
}) {
  const params = await searchParams;
  const skill = asString(params.skill);
  const type = asString(params.type);
  const mode = asString(params.mode);
  const exp = asString(params.exp);
  const salaryRaw = asString(params.salary);
  const q = asString(params.q)?.trim();
  const salary = salaryRaw ? Number(salaryRaw) : null;
  const rawPage = Number(asString(params.page)) || 1;
  const page = Math.max(1, rawPage);

  const supabase = await createClient();
  const now = new Date().toISOString();
  // Base scope: only rows the public may see. Mirrors the
  // `public_read_active_jobs` RLS policy added in migration 0004.
  const notExpired = `expired_at.is.null,expired_at.gt.${now}`;

  let query = supabase
    .from('job_postings')
    .select('*, alumni(nama)', { count: 'exact' })
    .eq('status', 'active')
    .or(notExpired);

  if (skill) query = query.contains('skill_required', [skill]);
  if (type) query = query.eq('job_type', type);
  if (mode) query = query.eq('work_mode', mode);
  if (exp) query = query.eq('experience', exp);
  if (salary && Number.isFinite(salary)) query = query.gte('salary_max', salary);
  if (q) {
    // Strip PostgREST `like` metacharacters so user input cannot widen the OR.
    const safe = q.replace(/[%_]/g, '');
    if (safe) query = query.or(`judul.ilike.%${safe}%,perusahaan.ilike.%${safe}%`);
  }

  const paged = query
    .order('created_at', { ascending: false })
    .range((page - 1) * JOBS_PAGE_SIZE, page * JOBS_PAGE_SIZE - 1);

  const [{ data: jobRows, count }, { data: allJobs }] = await Promise.all([
    paged,
    // Skill chips come from the whole filtered set, not just this page.
    supabase
      .from('job_postings')
      .select('skill_required')
      .eq('status', 'active')
      .or(notExpired),
  ]);

  const skillOptions = Array.from(
    new Set(
      (allJobs ?? []).flatMap((row) => (row.skill_required ?? []) as string[])
    )
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const jobs = (jobRows ?? []) as unknown as JobCardJob[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / JOBS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  /**
   * Build a list href. Filters are preserved. Patching a filter drops
   * `page` (result ordering changed); patching `page` keeps the filters.
   */
  function buildHref(patch: {
    skill?: string | null;
    page?: string | null;
    type?: string | null;
    mode?: string | null;
    exp?: string | null;
    salary?: string | null;
    q?: string | null;
  }) {
    const merged: Record<string, string | null | undefined> = {
      skill,
      type,
      mode,
      exp,
      salary: salaryRaw,
      q,
      ...patch,
    };
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    if (patch.page) {
      next.set('page', patch.page);
    } else if ('page' in patch) {
      next.delete('page');
    } else if (currentPage > 1) {
      next.set('page', String(currentPage));
    }
    const qs = next.toString();
    return qs ? `/lowongan?${qs}` : '/lowongan';
  }

  const hasFilters = Boolean(skill || type || mode || exp || salaryRaw || q);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-container-max px-5 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="hero-title mb-2">Lowongan Kerja</h1>
            <p className="text-on-surface-variant">
              Peluang karier dari alumni dan perusahaan mitra
            </p>
          </div>
          <Link href="/lowongan/baru" className="btn-primary">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            Pasang Lowongan
          </Link>
        </div>

        <JobFilters
          skillOptions={skillOptions}
          activeSkill={skill}
          total={count ?? 0}
        />

        {jobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                activeSkill={skill}
                skillHref={(s) => buildHref({ skill: skill === s ? null : s, page: null })}
                now={Date.now()}
              />
            ))}
          </div>
        ) : hasFilters ? (
          <EmptyState
            icon={<SearchX className="h-8 w-8 text-on-surface-variant" aria-hidden="true" />}
            title="Tidak ada lowongan yang cocok"
            description="Coba longgarkan filter atau hapus semua filter untuk melihat lowongan lainnya."
            action={{ href: '/lowongan', label: 'Hapus semua filter' }}
          />
        ) : (
          <EmptyState
            icon={<Briefcase className="h-8 w-8 text-on-surface-variant" aria-hidden="true" />}
            title="Belum ada lowongan aktif"
            description="Jadilah yang pertama berbagi peluang kerja kepada jaringan alumni."
            action={{ href: '/lowongan/baru', label: 'Pasang lowongan pertama' }}
          />
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Navigasi halaman">
            <Link
              href={buildHref({ page: String(Math.max(1, currentPage - 1)) })}
              aria-disabled={currentPage <= 1}
              aria-label="Halaman sebelumnya"
              className={`btn-tertiary ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Sebelumnya
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, index, visible) => {
                const previous = visible[index - 1];
                const gap = previous !== undefined && p - previous > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {gap && <span className="chip">…</span>}
                    <Link
                      href={buildHref({ page: String(p) })}
                      aria-current={p === currentPage ? 'page' : undefined}
                      aria-label={`Halaman ${p}`}
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
              aria-label="Halaman berikutnya"
              className={`btn-tertiary ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
