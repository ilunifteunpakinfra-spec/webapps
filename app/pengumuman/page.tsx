import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone, Plus, BadgeCheck, SearchX } from 'lucide-react';
import Navbar from '@/components/Navbar';
import EmptyState from '@/components/EmptyState';
import ReportButton from '@/components/ReportButton';
import type { AnnouncementImage } from '@/components/content/AnnouncementImages';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import { asString, timeAgo } from '@/lib/utils';
import { richTextExcerpt } from '@/lib/content/rich-text';

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
  judul: string;
  isi: string | null;
  kategori: (typeof CATEGORIES)[number]['value'];
  created_at: string | null;
  alumni: { id: string; nama: string } | null;
  announcement_images: AnnouncementImage[];
};

type PengumumanSearchParams = {
  kategori?: string | string[];
};

function categoryLabel(kategori: AnnouncementRow['kategori']): string {
  return CATEGORIES.find((c) => c.value === kategori)?.label ?? 'Umum';
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
    .select(
      'id, judul, isi, kategori, created_at, alumni(id, nama), announcement_images(id, public_url, caption, alt_text, position)'
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(30);

  if (kategori && CATEGORIES.some((c) => c.value === kategori)) {
    query = query.eq('kategori', kategori);
  }

  const { data: announcementRows } = await query;
  const announcements = (announcementRows ?? []) as unknown as AnnouncementRow[];

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

      <div className="mx-auto max-w-container-max px-5 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="hero-title mb-2">Pengumuman</h1>
            <p className="text-on-surface-variant">
              Informasi resmi dan kabar terbaru dari komunitas ILUNI FT ELEKTRO
            </p>
          </div>
          {canPost && (
            <Link href="/pengumuman/baru" className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Buat Pengumuman
            </Link>
          )}
        </div>

        {/* Category filter chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href={buildHref(undefined)}
            className={!kategori ? 'chip-active' : 'chip'}
            aria-current={!kategori ? 'true' : undefined}
            aria-pressed={!kategori}
          >
            Semua
          </Link>
          {CATEGORIES.map((category) => (
            <Link
              key={category.value}
              href={buildHref(kategori === category.value ? undefined : category.value)}
              className={kategori === category.value ? 'chip-active' : 'chip'}
              aria-current={kategori === category.value ? 'true' : undefined}
              aria-pressed={kategori === category.value}
            >
              {category.label}
            </Link>
          ))}
        </div>

        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const excerpt = richTextExcerpt(announcement.isi, 180);
              const cover = announcement.announcement_images?.[0];
              return (
                <article key={announcement.id} className="card-accent">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="chip-active">
                      {categoryLabel(announcement.kategori)}
                    </span>
                    <time
                      dateTime={announcement.created_at ?? undefined}
                      className="text-sm text-on-surface-variant"
                    >
                      {timeAgo(announcement.created_at)}
                    </time>
                  </div>

                  <h2 className="font-montserrat text-lg font-bold text-on-surface">
                    <Link
                      href={`/pengumuman/${announcement.id}`}
                      className="hover:text-primary-container hover:underline"
                    >
                      {announcement.judul}
                    </Link>
                  </h2>

                  {excerpt && (
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                      {excerpt}
                    </p>
                  )}

                  {cover && (
                    <Link
                      href={`/pengumuman/${announcement.id}`}
                      className="mt-3 block"
                      aria-label={`Lihat pengumuman: ${announcement.judul}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cover.public_url}
                        alt={cover.alt_text}
                        loading="lazy"
                        className="h-48 w-full rounded border border-outline-variant object-cover"
                      />
                    </Link>
                  )}

                  <div className="mt-3 flex items-center gap-1 border-t border-outline-variant pt-3 text-sm text-on-surface-variant">
                    <Megaphone className="h-4 w-4" aria-hidden="true" />
                    <span>
                      Diposting oleh{' '}
                      {announcement.alumni?.id ? (
                        <Link
                          href={`/profil/${announcement.alumni.id}`}
                          className="font-medium text-on-surface hover:text-primary-container hover:underline"
                        >
                          {announcement.alumni.nama}
                        </Link>
                      ) : (
                        <span className="font-medium text-on-surface">Alumni</span>
                      )}
                      {announcement.alumni?.nama && (
                        <BadgeCheck
                          className="ml-1 inline h-3.5 w-3.5 text-primary-container"
                          aria-label="Alumni terverifikasi"
                        />
                      )}
                    </span>
                    <span className="ml-auto">
                      <ReportButton
                        targetType="announcement"
                        targetId={announcement.id}
                        isLoggedIn={Boolean(user)}
                        className="btn-tertiary px-2 py-1 text-xs"
                      />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={
              kategori ? (
                <SearchX className="h-8 w-8 text-on-surface-variant" aria-hidden="true" />
              ) : (
                <Megaphone className="h-8 w-8 text-on-surface-variant" aria-hidden="true" />
              )
            }
            title={
              kategori
                ? 'Tidak ada pengumuman pada kategori ini'
                : 'Belum ada pengumuman'
            }
            description={
              kategori
                ? 'Coba pilih kategori lain untuk melihat pengumuman lainnya.'
                : 'Jadilah yang pertama berbagi pengumuman untuk komunitas.'
            }
            action={
              kategori
                ? { href: '/pengumuman', label: 'Lihat semua kategori' }
                : { href: '/pengumuman/baru', label: 'Buat pengumuman pertama' }
            }
          />
        )}
      </div>
    </div>
  );
}
