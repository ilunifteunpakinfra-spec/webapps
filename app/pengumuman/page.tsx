import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone, Plus, BadgeCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import { asString } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Pengumuman - ILUNI FT ELEKTRO UNPAK',
};

const CATEGORIES = [
  { value: 'pencapaian', label: 'Pencapaian' },
  { value: 'lowongan', label: 'Lowongan' },
  { value: 'event', label: 'Event' },
  { value: 'umum', label: 'Umum' },
] as const;

type AnnouncementRow = {
  id: string;
  posted_by: string;
  judul: string;
  isi: string | null;
  kategori: (typeof CATEGORIES)[number]['value'];
  created_at: string | null;
  alumni: { id: string; nama: string } | null;
};

type PengumumanSearchParams = {
  kategori?: string | string[];
};

function categoryLabel(kategori: AnnouncementRow['kategori']): string {
  return CATEGORIES.find((c) => c.value === kategori)?.label ?? 'Umum';
}

/** "2 hari lalu" style relative time from an ISO timestamp. */
function daysAgo(iso: string | null | undefined): string {
  if (!iso) return 'Baru';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

export default async function PengumumanPage({
  searchParams,
}: {
  searchParams: Promise<PengumumanSearchParams>;
}) {
  const params = await searchParams;
  const kategori = asString(params.kategori);

  const supabase = await createClient();
  const user = await getCurrentUser();

  let query = supabase
    .from('announcements')
    .select('*, alumni(nama)')
    .order('created_at', { ascending: false })
    .limit(30);

  if (kategori && CATEGORIES.some((c) => c.value === kategori)) {
    query = query.eq('kategori', kategori);
  }

  const { data: announcementRows } = await query;
  const announcements = (announcementRows ?? []) as AnnouncementRow[];

  // Only verified alumni may publish announcements (RLS also enforces this).
  let canPost = false;
  if (user) {
    const { data: ownProfile } = await supabase
      .from('alumni')
      .select('status_verifikasi')
      .eq('id', user.id)
      .maybeSingle();
    canPost = ownProfile?.status_verifikasi === true;
  }

  function buildHref(nextKategori: string | undefined) {
    return nextKategori ? `/pengumuman?kategori=${nextKategori}` : '/pengumuman';
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="hero-title mb-2">Pengumuman</h1>
            <p className="text-on-surface-variant">
              Informasi resmi dan kabar terbaru dari komunitas ILUNI FT ELEKTRO
            </p>
          </div>
          {canPost && (
            <Link href="/pengumuman/baru" className="btn-primary">
              <Plus className="h-4 w-4" />
              Buat Pengumuman
            </Link>
          )}
        </div>

        {/* Category filter chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={buildHref(undefined)}
            className={!kategori ? 'chip-active' : 'chip'}
          >
            Semua
          </Link>
          {CATEGORIES.map((category) => (
            <Link
              key={category.value}
              href={buildHref(kategori === category.value ? undefined : category.value)}
              className={kategori === category.value ? 'chip-active' : 'chip'}
            >
              {category.label}
            </Link>
          ))}
        </div>

        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="card-accent">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="chip-active">{categoryLabel(announcement.kategori)}</span>
                  <span className="text-sm text-on-surface-variant">
                    {daysAgo(announcement.created_at)}
                  </span>
                </div>
                <h2 className="font-montserrat text-lg font-bold text-on-surface">
                  {announcement.judul}
                </h2>
                {announcement.isi && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-on-surface">
                    {announcement.isi}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1 border-t border-outline-variant pt-3 text-sm text-on-surface-variant">
                  <Megaphone className="h-4 w-4" />
                  <span>
                    Diposting oleh{' '}
                    <span className="font-medium text-on-surface">
                      {announcement.alumni?.nama ?? 'Alumni'}
                    </span>
                    {announcement.alumni?.nama && (
                      <BadgeCheck className="ml-1 inline h-3.5 w-3.5 text-primary-container" />
                    )}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada pengumuman untuk kategori ini.
          </div>
        )}
      </div>
    </div>
  );
}
