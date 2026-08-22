import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Briefcase,
  GraduationCap,
  Users,
  ArrowRight,
  Zap,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import AlumniCarousel from '@/components/AlumniCarousel';
import FilterAccordion from '@/components/FilterAccordion';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import { JOB_CTA_THRESHOLD, MENTOR_CTA_THRESHOLD } from '@/lib/constants';
import { buildNormalizedOptions, type FilterOptionRow } from '@/lib/normalize';
import type { AlumniWithSkills } from '@/lib/types';

export const metadata: Metadata = {
  title: 'ILUNI FT ELEKTRO UNPAK - Jaringan Alumni Teknik Elektro',
  description:
    'Jaringan alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor — temukan rekan, peluang karir, dan bangun jejaring profesional.',
};

export default async function Home() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Statistik & opsi filter agregat (count_alumni_total/get_filter_options)
  // dihitung server-side (SECURITY DEFINER) atas SEMUA alumni terdaftar —
  // angka agregat bukan data profil, jadi tidak mengikuti privasi visibilitas.
  // Lowongan/Mentor dibaca langsung (tabelnya public-read untuk pengunjung).
  const [
    totalAlumniResult,
    visibleAlumniResult,
    jobsCount,
    mentorCount,
    filterOptionsResult,
    angkatanQuery,
    skillsQuery,
    featuredQuery,
  ] = await Promise.all([
    supabase.rpc('count_alumni_total'),
    supabase.from('alumni').select('id', { count: 'exact', head: true }),
    supabase
      .from('job_postings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`),
    supabase
      .from('mentor_profiles')
      .select('alumni_id', { count: 'exact', head: true })
      .eq('status_aktif', true),
    supabase.rpc('get_filter_options'),
    supabase.rpc('get_angkatan_distribution'),
    supabase.from('skills').select('id, nama_skill').order('nama_skill'),
    // Pool carousel beranda: diambil lebih banyak lalu DIACAK di sisi klien
    // (AlumniCarousel) sehingga urutan tampil beda setiap kunjungan.
    supabase
      .from('alumni')
      .select(
        'id, nama, angkatan, pekerjaan, perusahaan, alamat_tinggal, status_open_to_work, foto_profil, contribution_score, alumni_skills(skill_id, level, skills(nama_skill))'
      )
      .order('contribution_score', { ascending: false })
      .limit(24),
  ]);

  const totalAlumni = Number(totalAlumniResult.data ?? 0);

  // Jumlah profil yang terlihat sesi ini (anon: hanya visibilitas 'public',
  // member: + alumni_only) — dihitung real-time agar sama dengan hasil direktori.
  const visibleAlumni = Number(visibleAlumniResult.count ?? 0);

  // Opsi filter pencarian publik — dinamis dari SEMUA alumni terdaftar.
  const filterOptions = (filterOptionsResult.data ?? []) as {
    field: string;
    value: string;
    jumlah: number;
  }[];
  const angkatanOptions = filterOptions
    .filter((row) => row.field === 'angkatan')
    .map((row) => row.value)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  // Nilai Kota & Pekerjaan dinormalisasi saat ditampilkan (title-case, merge
  // alias "Kota Bogor"/"kab bogor" -> "Bogor") tanpa mengubah data mentah di DB.
  const pekerjaanOptions = buildNormalizedOptions(
    filterOptions as FilterOptionRow[],
    'pekerjaan'
  );
  const kotaOptions = buildNormalizedOptions(filterOptions as FilterOptionRow[], 'kota');
  const skillOptions = (skillsQuery.data ?? []) as { id: string; nama_skill: string }[];

  // Distribusi dihitung lewat RPC SECURITY DEFINER atas SEMUA alumni terdaftar:
  // agregat jumlah per angkatan bukan data profil, jadi tidak perlu mengikuti
  // privasi visibilitas (public/alumni_only/private). Diurutkan naik (X = angkatan).
  const angkatanData = (
    (angkatanQuery.data ?? []) as { angkatan: string; jumlah: number }[]
  )
    .map((row) => ({ angkatan: row.angkatan, count: Number(row.jumlah) }))
    .sort((a, b) => a.angkatan.localeCompare(b.angkatan, undefined, { numeric: true }));
  const maxAngkatan = Math.max(1, ...angkatanData.map((item) => item.count));
  const BAR_AREA_HEIGHT = 96;

  const jobsActive = jobsCount.count ?? 0;
  const mentorsActive = mentorCount.count ?? 0;

  const featured = (featuredQuery.data ?? []) as unknown as AlumniWithSkills[];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-tech-black bg-white">
        {/* Circuit pattern background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-24">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="chip-active">Jaringan Alumni</span>
              <span className="chip">Teknik Elektro</span>
            </div>
            <h1 className="hero-title mb-4">
              Jaringan Alumni
              <br />
              <span className="text-primary-container">Teknik Elektro</span>
            </h1>
            <p className="mb-8 max-w-xl text-lg text-on-surface-variant">
              Hubungkan kembali dengan rekan sejawat, temukan peluang karir, dan
              bangun jejaring profesional di ekosistem teknik elektro terbesar
              di Universitas Pakuan.
            </p>

            {/* Search Bar -> directs to the directory */}
            <form
              method="GET"
              action="/direktori"
              className="card flex flex-col gap-3 p-4 md:flex-row md:items-center"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  name="q"
                  placeholder="Cari nama alumni..."
                  className="input-field pl-9"
                />
              </div>
              <FilterAccordion
                activeCount={0}
                submitButton={
                  <button type="submit" className="btn-primary w-full">
                    <Search className="h-4 w-4" />
                    Cari
                  </button>
                }
              >
                <div className="flex flex-wrap gap-2">
                  <select name="angkatan" className="input-field w-auto">
                    <option value="">Angkatan</option>
                    {angkatanOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select name="pekerjaan" className="input-field w-auto">
                    <option value="">Pekerjaan</option>
                    {pekerjaanOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.value}
                      </option>
                    ))}
                  </select>
                  <select name="kota" className="input-field w-auto">
                    <option value="">Kota</option>
                    {kotaOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.value}
                      </option>
                    ))}
                  </select>
                  <select name="skill" className="input-field w-auto">
                    <option value="">Skill</option>
                    {skillOptions.map((skill) => (
                      <option key={skill.id} value={skill.nama_skill}>
                        {skill.nama_skill}
                      </option>
                    ))}
                  </select>
                  {/* Submit desktop — mobile memakai tombol sticky di FilterAccordion */}
                  <button type="submit" className="btn-primary hidden md:inline-flex">
                    <Search className="h-4 w-4" />
                    Cari
                  </button>
                </div>
              </FilterAccordion>
            </form>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-tech-black bg-surface">
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 px-5 py-8 md:grid-cols-4 md:px-8">
          {/* Alumni Terdaftar */}
          <div className="card flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-container">
              <Users className="h-5 w-5 text-primary-container" />
            </div>
            <div className="min-w-0">
              <div className="font-montserrat text-xl font-bold text-on-surface">
                {totalAlumni.toLocaleString('id-ID')}
              </div>
              <div className="label-mono">Alumni Terdaftar</div>
              <div className="mt-1 text-xs leading-tight text-on-surface-variant">
                {visibleAlumni.toLocaleString('id-ID')} profil tampil di direktori
              </div>
            </div>
          </div>

          {/* Lowongan Aktif — jika kosong jadi CTA ajakan, bukan angka 0 */}
          {jobsActive <= JOB_CTA_THRESHOLD ? (
            <div className="card flex flex-col items-start gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container">
                <Briefcase className="h-5 w-5 text-primary-container" />
              </div>
              <p className="font-montserrat text-sm font-bold text-on-surface">
                Jadilah yang pertama pasang lowongan!
              </p>
              <Link href="/lowongan/baru" className="btn-primary">
                Pasang Lowongan
              </Link>
            </div>
          ) : (
            <div className="card flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-container">
                <Briefcase className="h-5 w-5 text-primary-container" />
              </div>
              <div className="min-w-0">
                <div className="font-montserrat text-xl font-bold text-on-surface">
                  {jobsActive.toLocaleString('id-ID')}
                </div>
                <div className="label-mono">Lowongan Aktif</div>
              </div>
            </div>
          )}

          {/* Mentor Aktif — CTA kecil jika jumlah masih rendah */}
          <div className="card flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-container">
              <GraduationCap className="h-5 w-5 text-primary-container" />
            </div>
            <div className="min-w-0">
              <div className="font-montserrat text-xl font-bold text-on-surface">
                {mentorsActive.toLocaleString('id-ID')}
              </div>
              <div className="label-mono">Mentor Aktif</div>
              {mentorsActive <= MENTOR_CTA_THRESHOLD && (
                <Link
                  href="/mentoring/daftar-mentor"
                  className="mt-1 inline-block text-xs font-medium text-primary-container hover:underline"
                >
                  Daftar jadi mentor
                </Link>
              )}
            </div>
          </div>

          {/* Kota Terjangkau */}
          <div className="card flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-container">
              <MapPin className="h-5 w-5 text-primary-container" />
            </div>
            <div className="min-w-0">
              <div className="font-montserrat text-xl font-bold text-on-surface">
                {kotaOptions.length}
              </div>
              <div className="label-mono">Kota Terjangkau</div>
            </div>
          </div>
        </div>
      </section>

      {/* Distribusi Angkatan */}
      <section className="border-b border-tech-black bg-surface">
        <div className="mx-auto max-w-[1280px] px-5 py-12 md:px-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Distribusi Angkatan</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Sebaran alumni berdasarkan tahun angkatan
              </p>
            </div>
            {angkatanData.length > 0 && (
              <span className="label-mono">{angkatanData.length} angkatan</span>
            )}
          </div>

          <div className="card overflow-x-auto pb-1">
            {angkatanData.length > 0 ? (
              <>
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
                          {item.angkatan}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="label-mono mt-2">X: angkatan · Y: jumlah alumni</p>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant">Belum ada data angkatan.</p>
            )}
          </div>
        </div>
      </section>

      {/* Alumni Directory Grid */}
      <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="section-title">Direktori Alumni</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Temukan rekan sejawat dan profesional di bidang teknik elektro
            </p>
          </div>
          <Link href="/direktori" className="btn-secondary">
            Lihat Semua
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featured.length > 0 ? (
          <AlumniCarousel alumni={featured} pageSize={3} autoRotateMs={6000} />
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada profil alumni yang tampil. Jadilah yang pertama mendaftar!
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="border-t border-tech-black bg-primary-container">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-5 py-16 text-center md:px-8">
          <h2 className="font-montserrat text-3xl font-bold text-white">
            Bergabung dengan Jaringan Alumni FTE
          </h2>
          <p className="max-w-xl text-white/90">
            Daftarkan diri Anda untuk terhubung dengan ribuan alumni, temukan
            peluang karir, dan berkontribusi pada komunitas.
          </p>
          <div className="flex gap-3">
            <Link
              href={user ? '/direktori' : '/daftar'}
              className="inline-flex items-center gap-2 rounded bg-white px-6 py-3 font-montserrat text-sm font-bold uppercase tracking-wider text-primary-container transition-colors hover:bg-circuit-yellow"
            >
              {user ? 'Jelajahi Direktori' : 'Daftar Sekarang'}
            </Link>
            {!user && (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded border border-white px-6 py-3 font-montserrat text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-tech-black bg-tech-black text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-5 py-8 md:flex-row md:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-montserrat font-bold">ILUNI FT ELEKTRO UNPAK</span>
          </div>
          <p className="text-sm text-white/70">
            © 2026 Ikatan Alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor
          </p>
        </div>
      </footer>
    </div>
  );
}
