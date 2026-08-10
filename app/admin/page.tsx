import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Users,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Download,
  CheckCircle2,
  FileUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Breadcrumbs from '@/components/Breadcrumbs';
import AdminNav from '@/components/admin/AdminNav';
import { createClient } from '@/lib/supabase/server';
import {
  getCurrentUser,
  hasCapability,
  isAdminUser,
  isSuperAdmin,
} from '@/lib/supabase/user';
import VerifyButton from './VerifyButton';
import ImportCsv from './ImportCsv';
import PageSizeSelect from '@/components/PageSizeSelect';

export const metadata: Metadata = {
  title: 'Dashboard Admin - ILUNI FT ELEKTRO UNPAK',
};

const PENDING_PAGE_SIZES = [10, 20, 30, 40, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

function paginationRange(totalPages: number, current: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('…');
    result.push(p);
    prev = p;
  }
  return result;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) redirect('/');

  const { page, size } = await searchParams;
  const rawSize = Number(size);
  const pageSize = PENDING_PAGE_SIZES.includes(
    rawSize as (typeof PENDING_PAGE_SIZES)[number]
  )
    ? rawSize
    : DEFAULT_PAGE_SIZE;
  const currentPage = Math.max(1, Number(page) || 1);
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();

  const [
    totalAlumni,
    openToWork,
    activeMentors,
    contributionQuery,
    angkatanQuery,
    companyQuery,
    pendingQuery,
  ] = await Promise.all([
    supabase.from('alumni').select('id', { count: 'exact', head: true }),
    supabase.from('alumni').select('id', { count: 'exact', head: true }).eq('status_open_to_work', true),
    supabase.from('mentor_profiles').select('alumni_id', { count: 'exact', head: true }).eq('status_aktif', true),
    supabase.from('alumni').select('contribution_score'),
    supabase.from('alumni').select('angkatan').not('angkatan', 'is', null),
    supabase.from('alumni').select('perusahaan').not('perusahaan', 'is', null),
    supabase
      .from('alumni')
      .select('id, nama, email, angkatan, created_at', { count: 'exact' })
      .eq('status_verifikasi', false)
      .order('created_at', { ascending: false })
      .range(from, to),
  ]);

  const totalContribution = (contributionQuery.data ?? []).reduce(
    (sum, row) => sum + (row.contribution_score ?? 0),
    0
  );

  const stats = [
    { icon: Users, label: 'Total Alumni', value: (totalAlumni.count ?? 0).toLocaleString('id-ID') },
    { icon: Briefcase, label: 'Open to Work', value: (openToWork.count ?? 0).toLocaleString('id-ID') },
    { icon: GraduationCap, label: 'Mentor Aktif', value: (activeMentors.count ?? 0).toLocaleString('id-ID') },
    { icon: TrendingUp, label: 'Kontribusi Total', value: totalContribution.toLocaleString('id-ID') },
  ];

  // Semua angkatan, diurutkan naik (X = angkatan, Y = jumlah alumni).
  const angkatanCounts = new Map<string, number>();
  for (const row of angkatanQuery.data ?? []) {
    if (!row.angkatan) continue;
    angkatanCounts.set(row.angkatan, (angkatanCounts.get(row.angkatan) ?? 0) + 1);
  }
  const angkatanData = Array.from(angkatanCounts.entries())
    .map(([angkatan, count]) => ({ angkatan, count }))
    .sort((a, b) => a.angkatan.localeCompare(b.angkatan, undefined, { numeric: true }));
  const maxAngkatan = Math.max(1, ...angkatanData.map((item) => item.count));
  const BAR_AREA_HEIGHT = 96;

  // Semua perusahaan, terbesar dulu.
  const companyCounts = new Map<string, number>();
  for (const row of companyQuery.data ?? []) {
    if (!row.perusahaan) continue;
    const key = row.perusahaan.trim();
    companyCounts.set(key, (companyCounts.get(key) ?? 0) + 1);
  }
  const topCompanies = Array.from(companyCounts.entries())
    .map(([nama, count]) => ({ nama, count }))
    .sort((a, b) => b.count - a.count);
  const maxCompany = Math.max(1, ...topCompanies.map((item) => item.count));

  const pending = pendingQuery.data ?? [];
  const pendingTotal = pendingQuery.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(pendingTotal / pageSize));
  const shownFrom = pendingTotal === 0 ? 0 : from + 1;
  const shownTo = Math.min(from + pageSize, pendingTotal);

  const pageHref = (target: number) =>
    `/admin?${new URLSearchParams({ page: String(target), size: String(pageSize) })}`;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <Breadcrumbs items={[{ label: 'Dashboard Admin' }]} />

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="hero-title mb-2">Dashboard Admin</h1>
            <p className="text-on-surface-variant">
              Kelola data alumni, verifikasi, dan analitik platform
            </p>
          </div>
          <a href="/api/admin/export" download className="btn-secondary">
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>

        <AdminNav
          isSuperAdmin={isSuperAdmin(user)}
          showAlumni={hasCapability(user, 'manage_alumni')}
        />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container">
                <stat.icon className="h-5 w-5 text-primary-container" />
              </div>
              <div className="mt-3 font-montserrat text-2xl font-bold">{stat.value}</div>
              <div className="label-mono">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Distribusi angkatan (X = angkatan, Y = alumni) */}
          <div className="card">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="section-title">Distribusi Angkatan</h2>
              <span className="label-mono">{angkatanData.length} angkatan</span>
            </div>
            {angkatanData.length > 0 ? (
              <>
                <div className="overflow-x-auto pb-1">
                  <div
                    role="img"
                    aria-label="Grafik jumlah alumni per angkatan"
                    className="flex items-end gap-2 pt-5"
                  >
                    {angkatanData.map((item) => {
                      const barHeight = Math.max(
                        2,
                        Math.round((item.count / maxAngkatan) * BAR_AREA_HEIGHT)
                      );
                      return (
                        <div
                          key={item.angkatan}
                          className="flex min-w-[40px] flex-col items-center gap-1"
                        >
                          <div
                            className="flex w-full items-end justify-center"
                            style={{ height: `${BAR_AREA_HEIGHT}px` }}
                          >
                            <div
                              className="relative w-6 rounded-t bg-primary-container transition-colors hover:bg-circuit-yellow"
                              style={{ height: `${barHeight}px` }}
                              title={`Angkatan ${item.angkatan}: ${item.count} alumni`}
                              aria-label={`Angkatan ${item.angkatan}: ${item.count} alumni`}
                            >
                              <span className="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-on-surface-variant">
                                {item.count}
                              </span>
                            </div>
                          </div>
                          <span className="whitespace-nowrap font-mono text-[10px] text-on-surface-variant">
                            &apos;{item.angkatan}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="label-mono mt-2">X: angkatan · Y: jumlah alumni</p>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">Belum ada data angkatan.</p>
            )}
          </div>

          {/* Perusahaan (semua ditampilkan) */}
          <div className="card">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="section-title">Perusahaan</h2>
              <span className="label-mono">{topCompanies.length} perusahaan</span>
            </div>
            {topCompanies.length > 0 ? (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {topCompanies.map((item) => (
                  <div key={item.nama}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">{item.nama}</span>
                      <span className="font-mono text-on-surface-variant">{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-surface-container">
                      <div
                        className="h-full bg-circuit-yellow"
                        style={{ width: `${(item.count / maxCompany) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Belum ada data perusahaan.</p>
            )}
          </div>
        </div>

        {/* Pending verifications (paginated) */}
        <div className="card mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">Verifikasi Alumni</h2>
            <PageSizeSelect
              id="pending-size"
              action="/admin"
              pageSize={pageSize}
              sizes={PENDING_PAGE_SIZES}
            />
          </div>

          {pending.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left">
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Nama</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Email</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Angkatan</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((v) => (
                      <tr key={v.id} className="border-b border-outline-variant">
                        <td className="py-3 font-medium">{v.nama}</td>
                        <td className="py-3 text-on-surface-variant">{v.email}</td>
                        <td className="py-3">{v.angkatan ?? '-'}</td>
                        <td className="py-3">
                          <VerifyButton alumniId={v.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <nav
                  className="mt-4 flex items-center justify-center gap-1"
                  aria-label="Paginasi verifikasi alumni"
                >
                  <a
                    href={pageHref(Math.max(1, currentPage - 1))}
                    aria-disabled={currentPage <= 1}
                    className={`chip ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Sebelumnya
                  </a>
                  {paginationRange(totalPages, currentPage).map((p, i) =>
                    p === '…' ? (
                      <span key={`gap-${i}`} className="px-1 text-on-surface-variant">
                        …
                      </span>
                    ) : (
                      <a
                        key={p}
                        href={pageHref(p)}
                        className={`chip ${p === currentPage ? 'chip-active' : ''}`}
                      >
                        {p}
                      </a>
                    )
                  )}
                  <a
                    href={pageHref(Math.min(totalPages, currentPage + 1))}
                    aria-disabled={currentPage >= totalPages}
                    className={`chip ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
                  >
                    Berikutnya
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </nav>
              )}
              <p className="mt-3 text-center text-xs text-on-surface-variant">
                Menampilkan {shownFrom}–{shownTo} dari {pendingTotal} alumni menunggu verifikasi
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-on-surface-variant">
              <CheckCircle2 className="h-4 w-4" />
              Semua alumni telah terverifikasi.
            </div>
          )}
        </div>

        {/* Import */}
        <div className="card mt-6">
          <h2 className="section-title mb-2 flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary-container" />
            Import Data Alumni (CSV)
          </h2>
          <p className="mb-3 text-sm text-on-surface-variant">
            Unggah CSV dengan kolom: nama, angkatan, tahun_lulus, pekerjaan, perusahaan,
            email, no_telepon, status_open_to_work (true/false, ya/tidak, atau 1/0).
            Baris dengan email yang sama akan diperbarui. Status verifikasi otomatis
            false dan tanggal dibuat mengikuti waktu import.
          </p>
          <ImportCsv />
        </div>
      </div>
    </div>
  );
}
