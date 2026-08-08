import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, Check } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import JoinGroupButton from './JoinGroupButton';

export const metadata: Metadata = {
  title: 'Detail Grup - ILUNI FT ELEKTRO UNPAK',
};

export default async function GrupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!group) notFound();

  const { data: memberRows } = await supabase
    .from('group_members')
    .select('alumni_id, role, alumni(id, nama, foto_profil, pekerjaan, perusahaan)')
    .eq('group_id', id)
    .order('joined_at');

  // supabase-js infers joined relations as arrays; they are objects at runtime.
  const members = (memberRows ?? []) as unknown as {
    alumni_id: string;
    role: 'admin_grup' | 'anggota' | null;
    alumni: {
      id: string;
      nama: string;
      foto_profil: string | null;
      pekerjaan: string | null;
      perusahaan: string | null;
    } | null;
  }[];

  const isMember = user
    ? members.some((row) => row.alumni_id === user.id)
    : false;
  const currentUserRole = user
    ? members.find((row) => row.alumni_id === user.id)?.role
    : undefined;

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[900px] px-5 py-8 md:px-8">
        <Link
          href="/grup"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Grup
        </Link>

        <div className="card-accent mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="chip">{group.tipe}</span>
                {currentUserRole === 'admin_grup' && (
                  <span className="chip-active">Admin Grup</span>
                )}
              </div>
              <h1 className="hero-title mb-2">{group.nama}</h1>
              <p className="text-on-surface-variant">
                {group.deskripsi || 'Belum ada deskripsi.'}
              </p>
            </div>
            <Users className="hidden h-8 w-8 shrink-0 text-primary-container md:block" />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-4">
            <span className="flex items-center gap-1 text-sm text-on-surface-variant">
              <Users className="h-4 w-4" />
              {members.length} anggota
            </span>
            {user ? (
              isMember ? (
                <span className="chip-active">
                  <Check className="mr-1 inline h-4 w-4" />
                  Anggota
                </span>
              ) : (
                <JoinGroupButton groupId={id} />
              )
            ) : (
              <Link href="/login" className="btn-primary">
                Masuk untuk Gabung
              </Link>
            )}
          </div>
        </div>

        {/* Members */}
        <h2 className="section-title mb-4">Anggota</h2>
        {members.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {members.map((member) => {
              const profile = member.alumni;
              return (
                <div key={member.alumni_id} className="card flex items-center gap-4">
                  {profile?.foto_profil ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.foto_profil}
                      alt={profile.nama}
                      className="h-12 w-12 rounded border border-tech-black object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-lg font-bold text-on-surface-variant">
                      {profile?.nama.charAt(0).toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{profile?.nama ?? 'Alumni'}</span>
                      {member.role === 'admin_grup' && <span className="chip">Admin</span>}
                    </div>
                    {profile?.pekerjaan && (
                      <div className="text-sm text-on-surface-variant">
                        {profile.pekerjaan}
                        {profile.perusahaan ? ` — ${profile.perusahaan}` : ''}
                      </div>
                    )}
                  </div>
                  {profile && (
                    <Link
                      href={`/profil/${profile.id}`}
                      className="text-sm font-medium text-primary-container hover:underline"
                    >
                      Profil
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada anggota. Jadilah yang pertama bergabung!
          </div>
        )}
      </div>
    </div>
  );
}
