import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageSquare, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import DeleteForumButton from '@/components/DeleteForumButton';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isAdminUser, hasCapability } from '@/lib/supabase/user';
import { timeAgo } from '@/lib/utils';
import {
  deleteThreadAction,
  deleteReplyAction,
} from '@/app/actions/group-forum';
import ReplyForm from './ReplyForm';

export const metadata: Metadata = {
  title: 'Thread Diskusi - ILUNI FT ELEKTRO UNPAK',
};

type ThreadRow = {
  id: string;
  group_id: string;
  author_id: string;
  judul: string;
  isi: string;
  created_at: string | null;
  alumni: { id: string; nama: string } | null;
};

type ReplyRow = {
  id: string;
  author_id: string;
  isi: string;
  created_at: string | null;
  alumni: { id: string; nama: string } | null;
};

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const { id, threadId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: group } = await supabase
    .from('groups')
    .select('id, nama')
    .eq('id', id)
    .maybeSingle();
  if (!group) notFound();

  const { data: threadRow } = await supabase
    .from('group_threads')
    .select('*, alumni(nama)')
    .eq('id', threadId)
    .eq('group_id', id)
    .maybeSingle();

  if (!threadRow) notFound();
  const thread = threadRow as unknown as ThreadRow;

  const { data: replyRows } = await supabase
    .from('group_thread_replies')
    .select('*, alumni(nama)')
    .eq('thread_id', threadId)
    .order('created_at');

  const replies = (replyRows ?? []) as unknown as ReplyRow[];

  // Keanggotaan & izin moderasi.
  let isMember = false;
  let isGroupAdmin = false;
  if (user) {
    const { data: membership } = await supabase
      .from('group_members')
      .select('alumni_id')
      .eq('group_id', id)
      .eq('alumni_id', user.id)
      .maybeSingle();
    isMember = Boolean(membership);

    const { data: adminFlag } = await supabase.rpc('is_group_admin', {
      p_group_id: id,
    });
    isGroupAdmin = adminFlag === true;
  }

  const canModerate = Boolean(user) && isAdminUser(user) && hasCapability(user, 'moderate_groups');
  const canManageThread = Boolean(user) && (thread.author_id === user?.id || isGroupAdmin || canModerate);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[860px] px-5 py-8 md:px-8">
        <Link
          href={`/grup/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke {group.nama}
        </Link>

        {/* Thread */}
        <article className="card-accent mb-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-montserrat text-xl font-bold text-on-surface">
              {thread.judul}
            </h1>
            {canManageThread && (
              <DeleteForumButton
                action={deleteThreadAction}
                fields={{ thread_id: thread.id }}
                confirmText="Hapus thread ini beserta semua balasannya?"
              />
            )}
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-on-surface-variant">
            <MessageSquare className="h-4 w-4" />
            <span>
              Diposting oleh{' '}
              <span className="font-medium text-on-surface">
                {thread.alumni?.nama ?? 'Alumni'}
              </span>{' '}
              · {timeAgo(thread.created_at)}
            </span>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-on-surface">
            {thread.isi}
          </p>
        </article>

        {/* Balasan */}
        <h2 className="section-title mb-4">
          Balasan ({replies.length})
        </h2>

        {replies.length > 0 ? (
          <div className="space-y-4">
            {replies.map((reply) => {
              const canManageReply = Boolean(user) && (reply.author_id === user?.id || isGroupAdmin || canModerate);
              return (
                <div key={reply.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-1 text-sm text-on-surface-variant">
                      <ShieldCheck className="h-4 w-4" />
                      <span>
                        <span className="font-medium text-on-surface">
                          {reply.alumni?.nama ?? 'Alumni'}
                        </span>{' '}
                        · {timeAgo(reply.created_at)}
                      </span>
                    </div>
                    {canManageReply && (
                      <DeleteForumButton
                        action={deleteReplyAction}
                        fields={{ reply_id: reply.id }}
                        confirmText="Hapus balasan ini?"
                      />
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-on-surface">
                    {reply.isi}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada balasan. Jadilah yang pertama menanggapi!
          </div>
        )}

        {/* Form balasan */}
        <div className="card mt-6">
          <h2 className="font-montserrat text-lg font-bold text-on-surface">
            Kirim Balasan
          </h2>
          {!user ? (
            <p className="mt-3 text-sm text-on-surface-variant">
              <Link href="/login" className="font-medium text-primary-container hover:underline">
                Masuk
              </Link>{' '}
              untuk ikut berdiskusi.
            </p>
          ) : !isMember ? (
            <p className="mt-3 text-sm text-on-surface-variant">
              Hanya anggota grup yang dapat membalas.{' '}
              <Link href={`/grup/${id}`} className="font-medium text-primary-container hover:underline">
                Lihat detail grup
              </Link>{' '}
              untuk bergabung.
            </p>
          ) : (
            <div className="mt-3">
              <ReplyForm threadId={thread.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
