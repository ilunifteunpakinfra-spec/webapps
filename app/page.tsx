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
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import type { AlumniWithSkills } from '@/lib/types';

export const metadata = {
  title: 'ILUNI FTE UNPAK - Jaringan Alumni Teknik Elektro',
  description:
    'Jaringan alumni Fakultas Teknik Elektro Universitas Pakuan — temukan rekan, peluang karir, dan bangun jejaring profesional.',
};

export default async function Home() {
  const supabase = createClient();
  const user = await getCurrentUser();

  // Real stats (RLS-aware: unauthenticated visitors only count public profiles).
  const [alumniCount, jobsCount, mentorCount, citiesQuery, featuredQuery] =
    await Promise.all([
      supabase.from('alumni').select('id', { count: 'exact', head: true }),
      supabase
        .from('job_postings')
        .select('id', { count: 'exact', head: true })
        .or(`expired_at.is.null,expired_at.gt.${new Date().toISOString()}`),
      supabase
        .from('mentor_profiles')
        .select('alumni_id', { count: 'exact', head: true })
        .eq('status_aktif', true),
      supabase
        .from('alumni')
        .select('alamat_tinggal')
        .not('alamat_tinggal', 'is', null),
      supabase
        .from('alumni')
        .select(
          'id, nama, angkatan, pekerjaan, perusahaan, alamat_tinggal, status_open_to_work, foto_profil, contribution_score, alumni_skills(skill_id, level, skills(nama_skill))'
        )
        .order('contribution_score', { ascending: false })
        .limit(6),
    ]);

  const cityCount = Array.from(
    new Set(
      (citiesQuery.data ?? [])
        .map((row) => row.alamat_tinggal?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).length;

  const stats = [
    { icon: Users, label: 'Alumni Terdaftar', value: (alumniCount.count ?? 0).toLocaleString('id-ID') },
    { icon: Briefcase, label: 'Lowongan Aktif', value: (jobsCount.count ?? 0).toLocaleString('id-ID') },
    { icon: GraduationCap, label: 'Mentor Aktif', value: (mentorCount.count ?? 0).toLocaleString('id-ID') },
    { icon: MapPin, label: 'Kota Terjangkau', value: `${cityCount}` },
  ];

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
              <div className="flex flex-wrap gap-2">
                <select name="angkatan" className="input-field w-auto">
                  <option value="">Angkatan</option>
                  <option value="'20">'20</option>
                  <option value="'15">'15</option>
                  <option value="'10">'10</option>
                  <option value="'05">'05</option>
                </select>
                <select name="pekerjaan" className="input-field w-auto">
                  <option value="">Pekerjaan</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Manager">Manager</option>
                  <option value="Consultant">Consultant</option>
                </select>
                <select name="kota" className="input-field w-auto">
                  <option value="">Kota</option>
                  <option value="Jakarta">Jakarta</option>
                  <option value="Bogor">Bogor</option>
                  <option value="Bandung">Bandung</option>
                </select>
                <select name="skill" className="input-field w-auto">
                  <option value="">Skill</option>
                  <option value="SCADA">SCADA</option>
                  <option value="IoT">IoT</option>
                  <option value="Power Systems">Power Systems</option>
                </select>
                <button type="submit" className="btn-primary">
                  <Search className="h-4 w-4" />
                  Cari
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-tech-black bg-surface">
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-4 px-5 py-8 md:grid-cols-4 md:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="card flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-surface-container">
                <stat.icon className="h-5 w-5 text-primary-container" />
              </div>
              <div>
                <div className="font-montserrat text-xl font-bold text-on-surface">
                  {stat.value}
                </div>
                <div className="label-mono">{stat.label}</div>
              </div>
            </div>
          ))}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((alumni) => (
              <div key={alumni.id} className="card group relative">
                {alumni.status_open_to_work && (
                  <span className="absolute right-3 top-3 chip-active">
                    Open to Work
                  </span>
                )}
                <div className="flex items-start gap-4">
                  {alumni.foto_profil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={alumni.foto_profil}
                      alt={alumni.nama}
                      className="h-16 w-16 rounded border border-tech-black object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-xl font-bold text-on-surface-variant">
                      {alumni.nama.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-montserrat text-lg font-bold text-on-surface">
                      {alumni.nama}
                    </h3>
                    {alumni.angkatan && (
                      <div className="label-mono mb-1">Angkatan {alumni.angkatan}</div>
                    )}
                    <div className="text-sm font-medium text-on-surface">
                      {alumni.pekerjaan}
                    </div>
                    <div className="text-sm text-on-surface-variant">
                      {alumni.perusahaan}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(alumni.alumni_skills ?? []).slice(0, 4).map((entry) => (
                    <span key={entry.skill_id} className="chip">
                      {entry.skills?.nama_skill}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
                  <span
                    className={`status-dot ${
                      alumni.status_open_to_work
                        ? 'status-dot-active'
                        : 'status-dot-inactive'
                    }`}
                  />
                  <Link
                    href={`/profil/${alumni.id}`}
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
            <span className="font-montserrat font-bold">ILUNI FTE UNPAK</span>
          </div>
          <p className="text-sm text-white/70">
            © 2026 Ikatan Alumni Fakultas Teknik Elektro Universitas Pakuan
          </p>
        </div>
      </footer>
    </div>
  );
}
