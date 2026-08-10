import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Breadcrumbs from '@/components/Breadcrumbs';
import AdminNav from '@/components/admin/AdminNav';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isSuperAdmin } from '@/lib/supabase/user';

export const metadata: Metadata = {
  title: 'Log Aktivitas Admin - ILUNI FT ELEKTRO UNPAK',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminAuditPage() {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) redirect('/admin');

  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('admin_activity_log')
    .select('id, aksi, target_type, target_id, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Audit' }]} />

        <div className="mb-6">
          <h1 className="hero-title mb-2">Log Aktivitas Admin</h1>
          <p className="text-on-surface-variant">
            Jejak audit tindakan administrator (100 entri terbaru)
          </p>
        </div>

        <AdminNav isSuperAdmin={isSuperAdmin(user)} />

        {error && (
          <div className="card mt-6 text-sm text-error-on-container">
            Gagal memuat log: {error.message}
          </div>
        )}

        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left">
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Waktu
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Aksi
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Target
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-outline-variant align-top"
                >
                  <td className="whitespace-nowrap py-3">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-3">
                    <span className="chip">{log.aksi}</span>
                  </td>
                  <td className="py-3">
                    <div className="font-medium">{log.target_type ?? '-'}</div>
                    <div className="font-mono text-[10px] text-on-surface-variant">
                      {log.target_id ?? '-'}
                    </div>
                  </td>
                  <td className="py-3">
                    <pre className="max-w-[320px] overflow-x-auto font-mono text-[11px] text-on-surface-variant">
                      {log.detail ? JSON.stringify(log.detail, null, 1) : '-'}
                    </pre>
                  </td>
                </tr>
              ))}
              {(logs ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-on-surface-variant"
                  >
                    Belum ada aktivitas admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
