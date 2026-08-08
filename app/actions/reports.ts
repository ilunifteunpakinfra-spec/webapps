// ============================================
// ILUNI FTE WebApps - Server Actions: Community Reports
// ============================================
// Any logged-in user can flag content (`submitReportAction`); admins with
// the `moderate_reports` capability review and close reports
// (`resolveReportAction`). Insert is additionally guarded by the
// `auth_report_content` RLS policy (reporter_id = auth.uid()).
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, hasCapability, isAdminUser } from '@/lib/supabase/user';
import { REPORT_TARGETS, type ReportTarget } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/types';

/** Submit a community report for any supported content type. */
export async function submitReportAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Silakan masuk terlebih dahulu.' };

  const targetType = String(formData.get('target_type') ?? '').trim() as ReportTarget;
  const targetId = String(formData.get('target_id') ?? '').trim();
  const alasan = String(formData.get('alasan') ?? '').trim();

  if (!REPORT_TARGETS.includes(targetType)) {
    return { error: 'Jenis konten tidak valid.' };
  }
  if (!targetId) return { error: 'Data konten tidak valid.' };
  if (!alasan) return { error: 'Jelaskan alasan pelaporan terlebih dahulu.' };

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    target_type: targetType,
    target_id: targetId,
    alasan,
  });

  if (error) return { error: error.message };

  return { success: true, message: 'Terima kasih! Laporan Anda telah dikirim ke admin.' };
}

/** Close a report as resolved (tindak lanjut) or dismissed (tidak valid). */
export async function resolveReportAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || !isAdminUser(user) || !hasCapability(user, 'moderate_reports')) {
    return { error: 'Aksi ini hanya untuk admin dengan kemampuan moderasi laporan.' };
  }

  const reportId = String(formData.get('report_id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();

  if (!reportId) return { error: 'Data laporan tidak valid.' };
  if (status !== 'resolved' && status !== 'dismissed') {
    return { error: 'Status laporan tidak valid.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('content_reports')
    .update({
      status,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) return { error: error.message };

  await supabase.rpc('admin_log_activity', {
    p_aksi: status === 'resolved' ? 'resolve_report' : 'dismiss_report',
    p_target_type: 'content_reports',
    p_target_id: reportId,
    p_detail: { status },
  });

  revalidatePath('/admin/moderation');
  return { success: true, message: status === 'resolved' ? 'Laporan ditandai selesai.' : 'Laporan ditolak.' };
}
