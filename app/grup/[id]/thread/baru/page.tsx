import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageSquarePlus, UserPlus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import ThreadForm from './ThreadForm';

export const metadata: Metadata = {
  title: 'Buat Thread - ILUNI FT ELEKTRO UNPAK',
};

export default async function ThreadBaruPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: group } = await supabase
    .from('groups')
    .select('id, nama')
    .eq('id', id)
    .maybeSingle();

  if (!group) notFound();

  let isMember = false;
  if (user) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('alumni_id')
      .eq('group_id', id)
      .eq('alumni_id', user.id)
      .maybeSingle();
    isMember = Boolean(membership);
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[720px] px-5 py-8 md:px-8">
        <Link
          href={`/grup/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke {group.nama}
        </Link>

        <h1 className="hero-title mb-2">Buat Thread Diskusi</h1>
        <p className="mb-6 text-on-surface-variant">
          Mulai topik diskusi baru di grup {group.nama}. Hanya anggota grup
          yang dapat membuat thread.
        </p>

        {!user ? (
          <div className="card text-center text-on-surface-variant">
            <MessageSquarePlus className="mx-auto mb-2 h-8 w-8 text-primary-container" />
            <p className="mb-4">Silakan masuk untuk membuat thread diskusi.</p>
            <Link href="/login" className="btn-primary">
              Masuk
            </Link>
          </div>
        ) : !isMember ? (
          <div className="card text-center text-on-surface-variant">
            <UserPlus className="mx-auto mb-2 h-8 w-8 text-primary-container" />
            <p className="mb-4">
              Anda harus bergabung dengan grup {group.nama} terlebih dahulu
              untuk membuat thread.
            </p>
            <Link href={`/grup/${id}`} className="btn-primary">
              Lihat Grup
            </Link>
          </div>
        ) : (
          <div className="card">
            <ThreadForm groupId={id} />
          </div>
        )}
      </div>
    </div>
  );
}
