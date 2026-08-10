import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/admin/AdminNav';
import { createClient } from '@/lib/supabase/server';
import {
  getCurrentUser,
  isAdminUser,
  isSuperAdmin,
  hasCapability,
} from '@/lib/supabase/user';
import AlumniTable from './AlumniTable';
import type { AlumniAdminRow } from '@/lib/types';

export const metadata = {
  title: 'Manajemen Alumni - ILUNI FT ELEKTRO UNPAK',
};

const PAGE_SIZE = 20;

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

export default async function AdminAlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user) || !hasCapability(user, 'manage_alumni')) {
    redirect('/admin');
  }

  const { q, page } = await searchParams;
  const search = (q ?? '').trim();
  const currentPage = Math.max(1, Number(page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from('alumni')
    .select(
      'id,nama,angkatan,tahun_lulus,pekerjaan,perusahaan,email,no_telepon,linkedin,instagram,github,facebook,twitter,bio_singkat,portofolio_url,contribution_score,status_open_to_work,status_verifikasi,visibilitas,created_at',
      { count: 'exact' }
    );

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      `nama.ilike.${pattern},angkatan.ilike.${pattern},pekerjaan.ilike.${pattern},perusahaan.ilike.${pattern},email.ilike.${pattern}`
    );
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = (data ?? []) as unknown as AlumniAdminRow[];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="hero-title mb-2">Manajemen Alumni</h1>
          <p className="text-on-surface-variant">
            Edit profil, verifikasi, dan kelola kontribusi seluruh alumni
          </p>
        </div>

        <AdminNav isSuperAdmin={isSuperAdmin(user)} showAlumni />

        {error && (
          <div className="card mt-6 text-sm text-error-on-container">
            Gagal memuat data alumni: {error.message}
          </div>
        )}

        {/* Search */}
        <form method="get" action="/admin/alumni" className="mt-6 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Cari nama, angkatan, pekerjaan, perusahaan..."
              className="input-field pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Cari
          </button>
        </form>

        <AlumniTable rows={rows} selfId={user.id} search={search} />

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-4 flex items-center justify-center gap-1">
            <a
              href={`/admin/alumni?${new URLSearchParams(
                search ? { q: search, page: String(currentPage - 1) } : { page: String(currentPage - 1) }
              )}`}
              aria-disabled={currentPage <= 1}
              className={`chip ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}
            >
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
                  href={`/admin/alumni?${new URLSearchParams(
                    search ? { q: search, page: String(p) } : { page: String(p) }
                  )}`}
                  className={`chip ${p === currentPage ? 'chip-active' : ''}`}
                >
                  {p}
                </a>
              )
            )}
            <a
              href={`/admin/alumni?${new URLSearchParams(
                search ? { q: search, page: String(currentPage + 1) } : { page: String(currentPage + 1) }
              )}`}
              aria-disabled={currentPage >= totalPages}
              className={`chip ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
            >
              Berikutnya
            </a>
          </nav>
        )}
        <p className="mt-3 text-center text-xs text-on-surface-variant">
          {total} alumni ditemukan
        </p>
      </div>
    </div>
  );
}
