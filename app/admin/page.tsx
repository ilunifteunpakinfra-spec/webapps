import { redirect } from 'next/navigation';
import {
  Users,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Download,
  CheckCircle2,
  FileUp,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isAdminUser } from '@/lib/supabase/user';
import VerifyButton from './VerifyButton';
import ImportCsv from './ImportCsv';

export const metadata = {
  title: 'Dashboard Admin - ILUNI FTE UNPAK',
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) redirect('/');

  const supabase = createClient();

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
      .select('id, nama, email, angkatan, created_at')
      .eq('status_verifikasi', false)
      .order('created_at', { ascending: false })
      .limit(20),
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

  const angkatanCounts = new Map<string, number>();
  for (const row of angkatanQuery.data ?? []) {
    if (!row.angkatan) continue;
    angkatanCounts.set(row.angkatan, (angkatanCounts.get(row.angkatan) ?? 0) + 1);
  }
  const angkatanData = Array.from(angkatanCounts.entries())
    .map(([angkatan, count]) => ({ angkatan, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxAngkatan = Math.max(1, ...angkatanData.map((item) => item.count));

  const companyCounts = new Map<string, number>();
  for (const row of companyQuery.data ?? []) {
    if (!row.perusahaan) continue;
    const key = row.perusahaan.trim();
    companyCounts.set(key, (companyCounts.get(key) ?? 0) + 1);
  }
  const topCompanies = Array.from(companyCounts.entries())
    .map(([nama, count]) => ({ nama, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxCompany = Math.max(1, ...topCompanies.map((item) => item.count));

  const pending = pendingQuery.data ?? [];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
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
          {/* Distribution by angkatan */}
          <div className="card">
            <h2 className="section-title mb-4">Distribusi Angkatan</h2>
            {angkatanData.length > 0 ? (
              <div className="space-y-3">
                {angkatanData.map((item) => (
                  <div key={item.angkatan}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium">Angkatan {item.angkatan}</span>
                      <span className="font-mono text-on-surface-variant">{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-surface-container">
                      <div
                        className="h-full bg-primary-container"
                        style={{ width: `${(item.count / maxAngkatan) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant">Belum ada data angkatan.</p>
            )}
          </div>

          {/* Top companies */}
          <div className="card">
            <h2 className="section-title mb-4">Perusahaan Teratas</h2>
            {topCompanies.length > 0 ? (
              <div className="space-y-3">
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

        {/* Pending verifications */}
        <div className="card mt-6">
          <h2 className="section-title mb-4">Verifikasi Alumni</h2>
          {pending.length > 0 ? (
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
            email, no_telepon, alamat_tinggal. Baris dengan email yang sama akan
            diperbarui.
          </p>
          <ImportCsv />
        </div>
      </div>
    </div>
  );
}
