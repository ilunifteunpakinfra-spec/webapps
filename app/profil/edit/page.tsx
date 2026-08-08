import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import { ensureAlumniProfile } from '@/app/actions/alumni';
import type { AlumniSkillRow } from '@/lib/types';
import ProfileForm from './ProfileForm';

export default async function ProfileEditPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/profil/edit');

  const supabase = await createClient();

  // Guarantee the alumni row exists before loading the form.
  await ensureAlumniProfile(user);

  const [{ data: profile }, { data: skills }, { data: currentSkills }] =
    await Promise.all([
      supabase.from('alumni').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('skills').select('*').order('nama_skill'),
      supabase
        .from('alumni_skills')
        .select('skill_id, level, skills(id, nama_skill, kategori)')
        .eq('alumni_id', user.id),
    ]);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="hero-title mb-2">Edit Profil</h1>
          <p className="text-on-surface-variant">
            Kelola data diri, keahlian, dan visibilitas profil Anda
          </p>
        </div>

        <ProfileForm
          profile={profile ?? undefined}
          skills={skills ?? []}
          currentSkills={(currentSkills ?? []) as unknown as AlumniSkillRow[]}
        />
      </div>
    </div>
  );
}
