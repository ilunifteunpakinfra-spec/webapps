import Link from 'next/link';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import MentorForm from './MentorForm';

export const metadata = {
  title: 'Daftar Jadi Mentor - ILUNI FTE UNPAK',
};

export default async function DaftarMentorPage() {
  const user = await getCurrentUser();
  const supabase = createClient();

  // Prefill existing mentor profile when re-registering.
  const { data: existing } = user
    ? await supabase
        .from('mentor_profiles')
        .select('bidang_mentoring, kapasitas_mentee, status_aktif')
        .eq('alumni_id', user.id)
        .maybeSingle()
    : { data: null };

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[760px] px-5 py-8 md:px-8">
        <Link
          href="/mentoring"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Mentoring
        </Link>

        <div className="mb-6">
          <h1 className="hero-title mb-2 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary-container" />
            Daftar Jadi Mentor
          </h1>
          <p className="text-on-surface-variant">
            Bagikan pengalaman dan bimbing karier alumni junior di bidang teknik
            elektro.
          </p>
        </div>

        <div className="card p-5">
          <MentorForm
            initial={{
              bidang: existing?.bidang_mentoring ?? '',
              kapasitas: existing?.kapasitas_mentee ?? 3,
              aktif: existing?.status_aktif ?? true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
