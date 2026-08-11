import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Breadcrumbs from '@/components/Breadcrumbs';
import { createClient } from '@/lib/supabase/server';
import { DIRECTORY_PAGE_SIZE } from '@/lib/constants';
import { asString } from '@/lib/utils';
import type { AlumniWithSkills } from '@/lib/types';

type DirectorySearchParams = {
  q?: string | string[];
  angkatan?: string | string[];
  pekerjaan?: string | string[];
  kota?: string | string[];
  skill?: string | string[];
  open_to_work?: string | string[];
  page?: string | string[];
};

export const metadata: Metadata = {
  title: 'Direktori Alumni - ILUNI FT ELEKTRO UNPAK',
};

export default async function DirektoriPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const params = await searchParams;
  const q = asString(params.q)?.trim();
  const angkatan = asString(params.angkatan);
  const pekerjaan = asString(params.pekerjaan);
  const kota = asString(params.kota);
  const skill = asString(params.skill);
  const openToWork = asString(params.open_to_work) === 'true';
  const rawPage = Number(asString(params.page)) || 1;
  const page = Math.max(1, rawPage);

  const supabase = await createClient();

  // Opsi filter berasal dari agregat SEMUA alumni terdaftar (get_filter_options,
  // SECURITY DEFINER) agar sinkron dengan data di database; hasil pencarian tetap
  // hanya profil public (RLS), dan count_alumni_total() mengembalikan total agregat.
  const [{ data: skillRows }, { data: filterOptionsRows }, totalCountResult] =
    await Promise.all([
      supabase.from('skills').select('id, nama_skill').order('nama_skill'),
      supabase.rpc('get_filter_options'),
      supabase.rpc('count_alumni_total'),
    ]);

  const totalAlumni = Number(totalCountResult.data ?? 0);

  const filterOptions = (filterOptionsRows ?? []) as {
    field: string;
    value: string;
    jumlah: number;
  }[];
  const angkatanOptions = filterOptions
    .filter((row) => row.field === 'angkatan')
    .map((row) => row.value)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  const pekerjaanOptions = filterOptions
    .filter((row) => row.field === 'pekerjaan')
    .map((row) => row.value)
    .sort((a, b) => a.localeCompare(b));
  const kotaOptions = filterOptions
    .filter((row) => row.field === 'kota')
    .map((row) => row.value)
    .sort((a, b) => a.localeCompare(b));

  let query = supabase
    .from('alumni')
    .select(
      'id, nama, angkatan, tahun_lulus, pekerjaan, perusahaan, alamat_tinggal, status_open_to_work, foto_profil, alumni_skills(skill_id, level, skills(nama_skill))',
      { count: 'exact' }
    )
    .order('nama');

  if (q) {
    query = query.or(
      `nama.ilike.%${q}%,perusahaan.ilike.%${q}%,pekerjaan.ilike.%${q}%`
    );
  }
  if (angkatan) query = query.eq('angkatan', angkatan);
  if (pekerjaan) query = query.ilike('pekerjaan', `%${pekerjaan}%`);
  if (kota) query = query.ilike('alamat_tinggal', `%${kota}%`);
  if (skill) {
    query = query.filter('alumni_skills.skills.nama_skill', 'ilike', `%${skill}%`);
  }
  if (openToWork) query = query.eq('status_open_to_work', true);

  query = query.range(
    (page - 1) * DIRECTORY_PAGE_SIZE,
    page * DIRECTORY_PAGE_SIZE - 1
  );

  const { data: alumni, count } = await query;

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / DIRECTORY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  function buildHref(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const all = { q, angkatan, pekerjaan, kota, skill, open_to_work: openToWork ? 'true' : undefined, ...patch };
    Object.entries(all).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const queryString = params.toString();
    return queryString ? `/direktori?${queryString}` : '/direktori';
  }

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (angkatan) params.set('angkatan', angkatan);
    if (pekerjaan) params.set('pekerjaan', pekerjaan);
    if (kota) params.set('kota', kota);
    if (skill) params.set('skill', skill);
    if (openToWork) params.set('open_to_work', 'true');
    params.set('page', String(targetPage));
    return `/direktori?${params.toString()}`;
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <Breadcrumbs items={[{ label: 'Direktori' }]} />

        <div className="mb-6">
          <h1 className="hero-title mb-2">Direktori Alumni</h1>
          <p className="text-on-surface-variant">
            Cari dan terhubung dengan alumni Fakultas Teknik Elektro
          </p>
        </div>

        {/* Filters */}
        <form
          method="GET"
          action="/direktori"
          className="card mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Cari nama, perusahaan, atau pekerjaan..."
              className="input-field pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select name="angkatan" className="input-field w-auto" defaultValue={angkatan ?? ''}>
              <option value="">Semua Angkatan</option>
              {angkatanOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select name="pekerjaan" className="input-field w-auto" defaultValue={pekerjaan ?? ''}>
              <option value="">Semua Pekerjaan</option>
              {pekerjaanOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select name="kota" className="input-field w-auto" defaultValue={kota ?? ''}>
              <option value="">Semua Kota</option>
              {kotaOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-primary">
              <Search className="h-4 w-4" />
              Cari
            </button>
          </div>
        </form>

        {/* Skill chips + open-to-work toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href={buildHref({ skill: undefined })}
            className={!skill ? 'chip-active' : 'chip'}
          >
            Semua
          </Link>
          {skillRows?.slice(0, 12).map((row) => (
            <Link
              key={row.id}
              href={buildHref({ skill: skill === row.nama_skill ? undefined : row.nama_skill })}
              className={skill === row.nama_skill ? 'chip-active' : 'chip'}
            >
              {row.nama_skill}
            </Link>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-outline-variant sm:block" />
          <Link
            href={buildHref({ open_to_work: openToWork ? undefined : 'true' })}
            className={openToWork ? 'chip-active' : 'chip'}
          >
            Open to Work
          </Link>
        </div>

        {/* Results count */}
        <p className="mb-4 text-sm text-on-surface-variant">
          {(count ?? 0).toLocaleString('id-ID')} profil alumni publik dari{' '}
          {totalAlumni.toLocaleString('id-ID')} alumni terdaftar
        </p>

        {/* Alumni Grid */}
        {alumni && alumni.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(alumni as unknown as AlumniWithSkills[]).map((a) => (
              <div key={a.id} className="card relative">
                {a.status_open_to_work && (
                  <span className="absolute right-3 top-3 chip-active">Open to Work</span>
                )}
                <div className="flex items-start gap-4">
                  {a.foto_profil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.foto_profil}
                      alt={a.nama}
                      className="h-16 w-16 rounded border border-tech-black object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-xl font-bold text-on-surface-variant">
                      {a.nama.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-montserrat text-lg font-bold">{a.nama}</h3>
                    {a.angkatan && <div className="label-mono mb-1">Angkatan {a.angkatan}</div>}
                    <div className="text-sm font-medium">{a.pekerjaan}</div>
                    <div className="text-sm text-on-surface-variant">{a.perusahaan}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {a.alumni_skills?.map((entry) => (
                    <span key={entry.skill_id} className="chip">
                      {entry.skills?.nama_skill}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
                  <span
                    className={`status-dot ${
                      a.status_open_to_work
                        ? 'status-dot-active'
                        : 'status-dot-inactive'
                    }`}
                  />
                  <Link
                    href={`/profil/${a.id}`}
                    className="text-sm font-medium text-primary-container hover:underline"
                  >
                    Lihat Profil
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Tidak ada alumni yang cocok dengan filter Anda.
          </div>
        )}

        {/* Server-side pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link
              href={pageHref(Math.max(1, currentPage - 1))}
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
                      href={pageHref(p)}
                      className={p === currentPage ? 'chip-active' : 'chip'}
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}
            <Link
              href={pageHref(Math.min(totalPages, currentPage + 1))}
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
