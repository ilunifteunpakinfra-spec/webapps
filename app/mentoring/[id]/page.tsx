import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Users, Briefcase, GraduationCap, Building2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import MentoringRequestForm from './MentoringRequestForm';

export const metadata: Metadata = {
  title: 'Ajukan Mentoring - ILUNI FTE UNPAK',
};

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: mentor } = await supabase
    .from('mentor_profiles')
    .select('alumni_id, bidang_mentoring, kapasitas_mentee, status_aktif, alumni(id, nama, foto_profil, pekerjaan, perusahaan, bio_singkat)')
    .eq('alumni_id', id)
    .maybeSingle();

  // supabase-js infers joined relations as arrays; they are objects at runtime.
  const typedMentor = (mentor ?? null) as unknown as {
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
      bio_singkat: string | null;
    } | null;
  } | null;

  if (!typedMentor) notFound();

  const mentorProfile = typedMentor;
  const profile = mentorProfile.alumni;
  if (!mentorProfile.status_aktif) notFound();

  const isSelf = user?.id === id;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[900px] px-5 py-8 md:px-8">
        <Link
          href="/mentoring"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Mentoring
        </Link>

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Mentor info */}
          <div className="card self-start">
            <div className="flex flex-col items-center text-center">
              {profile?.foto_profil ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.foto_profil}
                  alt={profile?.nama ?? 'Mentor'}
                  className="h-24 w-24 rounded border border-tech-black object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-3xl font-bold text-on-surface-variant">
                  {profile?.nama.charAt(0).toUpperCase() ?? 'M'}
                </div>
              )}
              <h1 className="mt-3 font-montserrat text-xl font-bold">
                {profile?.nama ?? 'Alumni'}
              </h1>
              <div className="mt-2 flex items-center gap-1 text-sm text-on-surface-variant">
                <Award className="h-4 w-4" />
                {mentorProfile.bidang_mentoring ?? 'Bidang umum'}
              </div>
              <span className="chip-active mt-3">Mentor Aktif</span>
            </div>
            <div className="mt-4 space-y-2 border-t border-outline-variant pt-4 text-sm text-on-surface-variant">
              {profile?.pekerjaan && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {profile.pekerjaan}
                </div>
              )}
              {profile?.perusahaan && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {profile.perusahaan}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Kapasitas {mentorProfile.kapasitas_mentee ?? 0} mentee
              </div>
            </div>
          </div>

          {/* Request form / bio */}
          <div className="space-y-4 lg:col-span-2">
            <div className="card">
              <h2 className="section-title mb-3">Tentang Mentor</h2>
              <p className="text-on-surface-variant">
                {profile?.bio_singkat || 'Belum ada bio.'}
              </p>
            </div>

            {isSelf ? (
              <div className="card text-sm text-on-surface-variant">
                Ini adalah profil mentor Anda sendiri. Kelola melalui{' '}
                <Link href="/mentoring/daftar-mentor" className="text-primary-container hover:underline">
                  halaman pendaftaran mentor
                </Link>
                .
              </div>
            ) : user ? (
              <div className="card">
                <h2 className="section-title mb-3 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary-container" />
                  Ajukan Permintaan Mentoring
                </h2>
                <MentoringRequestForm mentorId={id} />
              </div>
            ) : (
              <div className="card text-center text-on-surface-variant">
                <p className="mb-3">Masuk untuk mengajukan permintaan mentoring.</p>
                <Link href="/login" className="btn-primary">
                  Masuk
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
