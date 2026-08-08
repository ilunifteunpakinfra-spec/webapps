import Link from 'next/link';
import { GraduationCap, Users, Award, ArrowRight, Briefcase } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Program Mentoring - ILUNI FTE UNPAK',
};

type MentorRow = {
  alumni_id: string;
  bidang_mentoring: string | null;
  kapasitas_mentee: number | null;
  status_aktif: boolean | null;
  alumni: {
    id: string;
    nama: string;
    foto_profil: string | null;
    pekerjaan: string | null;
    perusahaan: string | null;
  } | null;
};

export default async function MentoringPage() {
  const supabase = await createClient();

  const { data: mentorRows } = await supabase
    .from('mentor_profiles')
    .select('alumni_id, bidang_mentoring, kapasitas_mentee, status_aktif, alumni(id, nama, foto_profil, pekerjaan, perusahaan)')
    .eq('status_aktif', true)
    .order('bidang_mentoring');

  const mentors = (mentorRows ?? []) as unknown as MentorRow[];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="hero-title mb-2">Program Mentoring</h1>
            <p className="text-on-surface-variant">
              Belajar dari pengalaman alumni senior di bidang teknik elektro
            </p>
          </div>
          <Link href="/mentoring/daftar-mentor" className="btn-primary">
            <GraduationCap className="h-4 w-4" />
            Daftar Jadi Mentor
          </Link>
        </div>

        {/* How it works */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { step: '01', title: 'Pilih Mentor', desc: 'Temukan mentor sesuai bidang minat Anda' },
            { step: '02', title: 'Ajukan Permintaan', desc: 'Kirim permintaan mentoring dengan pesan Anda' },
            { step: '03', title: 'Mulai Belajar', desc: 'Konsultasi 1-on-1 dengan mentor berpengalaman' },
          ].map((item) => (
            <div key={item.step} className="card">
              <div className="label-mono mb-2 text-primary-container">{item.step}</div>
              <h3 className="font-montserrat font-bold">{item.title}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Mentor list */}
        <h2 className="section-title mb-4">Mentor Aktif</h2>
        {mentors.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {mentors.map((mentor) => {
              const profile = mentor.alumni;
              return (
                <div key={mentor.alumni_id} className="card">
                  <div className="flex items-start gap-4">
                    {profile?.foto_profil ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.foto_profil}
                        alt={profile.nama}
                        className="h-16 w-16 rounded border border-tech-black object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-xl font-bold text-on-surface-variant">
                        {profile?.nama.charAt(0).toUpperCase() ?? 'M'}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-montserrat font-bold text-on-surface">
                        {profile?.nama ?? 'Alumni'}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-on-surface-variant">
                        <Award className="h-4 w-4 shrink-0" />
                        {mentor.bidang_mentoring ?? 'Bidang umum'}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-on-surface-variant">
                          <Users className="h-4 w-4" />
                          {mentor.kapasitas_mentee ?? 0} mentee
                        </span>
                        {profile?.pekerjaan && (
                          <span className="flex items-center gap-1 text-on-surface-variant">
                            <Briefcase className="h-4 w-4" />
                            {profile.pekerjaan}
                            {profile.perusahaan ? ` — ${profile.perusahaan}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
                    <span className="status-dot-active" />
                    <Link href={`/mentoring/${mentor.alumni_id}`} className="btn-secondary">
                      Ajukan Mentoring
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada mentor yang terdaftar. Jadilah mentor pertama!
          </div>
        )}
      </div>
    </div>
  );
}
