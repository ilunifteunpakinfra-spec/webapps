// ============================================
// ILUNI FTE WebApps - Server Actions: Forum Grup
// ============================================
// Forum diskusi per grup: thread + balasan.
//   - Membuat thread / balasan: hanya anggota grup (ditegakkan RLS via
//     public.is_group_member, helper SECURITY DEFINER anti-recursion).
//   - Menghapus thread / balasan: penulis, admin_grup, atau admin dengan
//     capability `moderate_groups` (ditegakkan di sini + RLS).
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isAdminUser, hasCapability } from '@/lib/supabase/user';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

const MAX_JUDUL = 200;
const MAX_ISI = 5000;

export type CreateThreadState = ActionState & { threadId?: string };

/** Buat thread diskusi baru di dalam grup (hanya anggota grup). */
export async function createThreadAction(
  _prevState: CreateThreadState,
  formData: FormData
): Promise<CreateThreadState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const groupId = String(formData.get('group_id') ?? '').trim();
  const judul = String(formData.get('judul') ?? '').trim();
  const isi = String(formData.get('isi') ?? '').trim();

  if (!groupId) return { error: 'Data grup tidak valid.' };
  if (!judul) return { error: 'Judul thread wajib diisi.' };
  if (judul.length > MAX_JUDUL) {
    return { error: `Judul maksimal ${MAX_JUDUL} karakter.` };
  }
  if (!isi) return { error: 'Isi diskusi wajib diisi.' };
  if (isi.length > MAX_ISI) {
    return { error: `Isi diskusi maksimal ${MAX_ISI} karakter.` };
  }

  const { data: thread, error } = await supabase
    .from('group_threads')
    .insert({ group_id: groupId, author_id: user.id, judul, isi })
    .select('id')
    .single();

  if (error) {
    if (error.code === '42501') {
      return { error: 'Hanya anggota grup yang dapat membuat thread.' };
    }
    if (error.code === '23503') return { error: 'Grup tidak ditemukan.' };
    return { error: error.message };
  }

  revalidatePath(`/grup/${groupId}`);
  return {
    success: true,
    message: 'Thread berhasil dibuat.',
    threadId: thread.id,
  };
}

/** Kirim balasan pada sebuah thread (hanya anggota grup pemilik thread). */
export async function createReplyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const threadId = String(formData.get('thread_id') ?? '').trim();
  const isi = String(formData.get('isi') ?? '').trim();

  if (!threadId) return { error: 'Data thread tidak valid.' };
  if (!isi) return { error: 'Isi balasan wajib diisi.' };
  if (isi.length > MAX_ISI) {
    return { error: `Isi balasan maksimal ${MAX_ISI} karakter.` };
  }

  // Ambil group_id milik thread untuk revalidasi (server-authoritative).
  const { data: thread } = await supabase
    .from('group_threads')
    .select('group_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return { error: 'Thread tidak ditemukan.' };

  const { error } = await supabase.from('group_thread_replies').insert({
    thread_id: threadId,
    author_id: user.id,
    isi,
  });

  if (error) {
    if (error.code === '42501') {
      return { error: 'Hanya anggota grup yang dapat membalas.' };
    }
    return { error: error.message };
  }

  revalidatePath(`/grup/${thread.group_id}`);
  return { success: true, message: 'Balasan berhasil dikirim.' };
}

/**
 * Hapus sebuah thread. Penulis atau admin_grup selalu boleh; admin platform
 * hanya jika memiliki capability `moderate_groups` (RLS admin_bypass
 * berlaku untuk semua admin, jadi dibatasi di sini).
 */
export async function deleteThreadAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const threadId = String(formData.get('thread_id') ?? '').trim();
  if (!threadId) return { error: 'Data thread tidak valid.' };

  const { data: thread } = await supabase
    .from('group_threads')
    .select('id, group_id, author_id')
    .eq('id', threadId)
    .maybeSingle();
  if (!thread) return { error: 'Thread tidak ditemukan.' };

  if (!(await canManageThread(supabase, user.id, thread.group_id, thread.author_id))) {
    return { error: 'Anda tidak memiliki izin untuk menghapus thread ini.' };
  }

  const { error } = await supabase.from('group_threads').delete().eq('id', threadId);
  if (error) return { error: error.message };

  revalidatePath(`/grup/${thread.group_id}`);
  return { success: true, message: 'Thread berhasil dihapus.' };
}

/** Hapus sebuah balasan (penulis, admin_grup, atau admin moderate_groups). */
export async function deleteReplyAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const replyId = String(formData.get('reply_id') ?? '').trim();
  if (!replyId) return { error: 'Data balasan tidak valid.' };

  const { data: reply } = await supabase
    .from('group_thread_replies')
    .select('id, author_id, thread_id')
    .eq('id', replyId)
    .maybeSingle();
  if (!reply) return { error: 'Balasan tidak ditemukan.' };

  const { data: thread } = await supabase
    .from('group_threads')
    .select('group_id')
    .eq('id', reply.thread_id)
    .maybeSingle();
  if (!thread) return { error: 'Balasan tidak ditemukan.' };

  if (!(await canManageThread(supabase, user.id, thread.group_id, reply.author_id))) {
    return { error: 'Anda tidak memiliki izin untuk menghapus balasan ini.' };
  }

  const { error } = await supabase
    .from('group_thread_replies')
    .delete()
    .eq('id', replyId);
  if (error) return { error: error.message };

  revalidatePath(`/grup/${thread.group_id}`);
  return { success: true, message: 'Balasan berhasil dihapus.' };
}

/**
 * Izin menghapus konten forum: penulis konten, admin_grup dari grup tsb,
 * atau admin platform dengan capability moderate_groups.
 */
async function canManageThread(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupId: string,
  authorId: string
): Promise<boolean> {
  if (authorId === userId) return true;

  const { data: isGroupAdmin } = await supabase.rpc('is_group_admin', {
    p_group_id: groupId,
  });
  if (isGroupAdmin === true) return true;

  const user = await getCurrentUser();
  return Boolean(user) && isAdminUser(user) && hasCapability(user, 'moderate_groups');
}
