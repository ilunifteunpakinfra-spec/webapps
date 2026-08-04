import Link from 'next/link';
import { Users, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import { asString } from '@/lib/utils';

const GROUPS_PAGE_SIZE = 9;

export const metadata = {
  title: 'Komunitas & Grup - ILUNI FTE UNPAK',
};

type GrupSearchParams = {
  tipe?: string | string[];
  page?: string | string[];
};

export default async function GrupPage({
  searchParams,
}: {
  searchParams: GrupSearchParams;
}) {
  const tipe = asString(searchParams.tipe);
  const rawPage = Number(asString(searchParams.page)) || 1;
  const page = Math.max(1, rawPage);

  const supabase = createClient();
  const user = await getCurrentUser();

  let query = supabase
    .from('groups')
    .select('id, nama, tipe, deskripsi, created_by', { count: 'exact' })
    .order('nama');

  if (tipe === 'angkatan' || tipe === 'minat') query = query.eq('tipe', tipe);

  query = query.range((page - 1) * GROUPS_PAGE_SIZE, page * GROUPS_PAGE_SIZE - 1);

  const { data: groupRows, count } = await query;

  // Member counts for all groups (page-scoped) in one query.
  const { data: memberRows } = groupRows?.length
    ? await supabase
        .from('group_members')
        .select('group_id, alumni_id')
        .in(
          'group_id',
          groupRows.map((row) => row.id)
        )
    : { data: [] };

  const memberCounts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    memberCounts.set(row.group_id, (memberCounts.get(row.group_id) ?? 0) + 1);
  }

  // Which groups has the current user joined?
  const joinedGroupIds = new Set<string>();
  if (user && groupRows?.length) {
    const { data: joined } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('alumni_id', user.id)
      .in(
        'group_id',
        groupRows.map((row) => row.id)
      );
    for (const row of joined ?? []) joinedGroupIds.add(row.group_id);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / GROUPS_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  function pageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (tipe) params.set('tipe', tipe);
    params.set('page', String(targetPage));
    return `/grup?${params.toString()}`;
  }

  function tipeHref(nextTipe: string | undefined) {
    const params = new URLSearchParams();
    if (nextTipe) params.set('tipe', nextTipe);
    const queryString = params.toString();
    return queryString ? `/grup?${queryString}` : '/grup';
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="hero-title mb-2">Komunitas & Grup</h1>
            <p className="text-on-surface-variant">
              Bergabung dengan komunitas berdasarkan angkatan atau minat
            </p>
          </div>
          <Link href="/grup/baru" className="btn-primary">
            <Plus className="h-4 w-4" />
            Buat Grup
          </Link>
        </div>

        {/* Type filter */}
        <div className="mb-6 flex gap-2">
          <Link href={tipeHref(undefined)} className={!tipe ? 'chip-active' : 'chip'}>
            Semua
          </Link>
          <Link href={tipeHref('angkatan')} className={tipe === 'angkatan' ? 'chip-active' : 'chip'}>
            Angkatan
          </Link>
          <Link href={tipeHref('minat')} className={tipe === 'minat' ? 'chip-active' : 'chip'}>
            Minat
          </Link>
        </div>

        <p className="mb-4 text-sm text-on-surface-variant">
          {count ?? 0} grup ditemukan
        </p>

        {/* Groups grid */}
        {groupRows && groupRows.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupRows.map((group) => {
              const memberCount = memberCounts.get(group.id) ?? 0;
              const isJoined = joinedGroupIds.has(group.id);
              return (
                <div key={group.id} className="card">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-xl font-bold text-primary-container">
                      {group.nama.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-montserrat font-bold text-on-surface">{group.nama}</h3>
                      <span className="chip mt-1">{group.tipe}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-on-surface-variant">
                    {group.deskripsi || 'Belum ada deskripsi.'}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
                    <span className="flex items-center gap-1 text-sm text-on-surface-variant">
                      <Users className="h-4 w-4" />
                      {memberCount} anggota
                    </span>
                    <Link href={`/grup/${group.id}`} className="btn-secondary">
                      {isJoined ? 'Detail' : 'Gabung'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada grup yang cocok. Buat grup pertama Anda!
          </div>
        )}

        {/* Server-side pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Link
              href={pageHref(Math.max(1, currentPage - 1))}
              aria-disabled={currentPage <= 1}
              className={`btn-tertiary ${currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Link>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, index, visible) => {
                const previous = visible[index - 1];
                const gap = previous !== undefined && p - previous > 1;
                return (
                  <span key={p} className="flex items-center gap-2">
                    {gap && <span className="chip">...</span>}
                    <Link
                      href={pageHref(p)}
                      className={p === currentPage ? 'chip-active' : 'chip'}
                    >
                      {p}
                    </Link>
                  </span>
                );
              })}
            <Link
              href={pageHref(Math.min(totalPages, currentPage + 1))}
              aria-disabled={currentPage >= totalPages}
              className={`btn-tertiary ${currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}`}
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
