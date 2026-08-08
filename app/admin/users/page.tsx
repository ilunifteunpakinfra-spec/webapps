import { redirect } from 'next/navigation';
import { Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/admin/AdminNav';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, isSuperAdmin } from '@/lib/supabase/user';
import UserActions from './UserActions';
import type { AdminUserRow } from '@/lib/types';

export const metadata = {
  title: 'Manajemen Pengguna - ILUNI FT ELEKTRO UNPAK',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  alumni: 'Alumni',
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) redirect('/admin');

  const { q } = await searchParams;
  const search = (q ?? '').trim();

  const supabase = await createClient();
  const { data: users, error } = await supabase.rpc('admin_list_users', {
    p_search: search,
  });

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="hero-title mb-2">Manajemen Pengguna</h1>
          <p className="text-on-surface-variant">
            Kelola peran, kemampuan, dan status akun alumni
          </p>
        </div>

        <AdminNav isSuperAdmin={isSuperAdmin(user)} />

        {error && (
          <div className="card mt-6 text-sm text-error-on-container">
            Gagal memuat data pengguna: {error.message}
          </div>
        )}

        {/* Search */}
        <form method="get" action="/admin/users" className="mt-6 flex max-w-md gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Cari nama atau email..."
              className="input-field pl-9"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Cari
          </button>
        </form>

        {/* Users table */}
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant text-left">
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Pengguna
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Angkatan
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Peran
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Kemampuan
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Verifikasi
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Status
                </th>
                <th className="pb-2 font-mono text-xs uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u: AdminUserRow) => (
                <tr key={u.id} className="border-b border-outline-variant">
                  <td className="py-3">
                    <div className="font-medium">{u.nama ?? '-'}</div>
                    <div className="text-xs text-on-surface-variant">
                      {u.email ?? '-'}
                    </div>
                  </td>
                  <td className="py-3">{u.angkatan ?? '-'}</td>
                  <td className="py-3">
                    <span
                      className={`chip ${
                        u.role === 'super_admin' ? 'chip-active' : ''
                      }`}
                    >
                      {ROLE_LABELS[u.role ?? 'alumni'] ?? u.role ?? '-'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex max-w-[240px] flex-wrap gap-1">
                      {(u.capabilities ?? []).map((cap) => (
                        <span key={cap} className="chip text-[10px]">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">
                    {u.status_verifikasi ? (
                      <span className="text-green-700">Terverifikasi</span>
                    ) : (
                      <span className="text-on-surface-variant">Belum</span>
                    )}
                  </td>
                  <td className="py-3">
                    {u.banned_until ? (
                      <span className="text-error-on-container">
                        Diblokir sejak {formatDate(u.banned_until)}
                      </span>
                    ) : (
                      <span className="text-green-700">Aktif</span>
                    )}
                  </td>
                  <td className="py-3">
                    <UserActions
                      userId={u.id}
                      currentRole={u.role}
                      capabilities={u.capabilities ?? []}
                      bannedUntil={u.banned_until}
                      self={u.id === user.id}
                    />
                  </td>
                </tr>
              ))}
              {(users ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-on-surface-variant"
                  >
                    Tidak ada pengguna yang cocok.
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
