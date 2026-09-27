import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Megaphone, BadgeCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ReportButton from '@/components/ReportButton';
import RichText from '@/components/content/RichText';
import AnnouncementImages, {
  type AnnouncementImage,
} from '@/components/content/AnnouncementImages';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import { timeAgo } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Detail Pengumuman - ILUNI FT ELEKTRO UNPAK',
};

const CATEGORY_LABELS: Record<string, string> = {
  pencapaian: 'Pencapaian',
  lowongan: 'Lowongan',
  event: 'Event',
  umum: 'Umum',
};

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: announcement } = await supabase
    .from('announcements')
    .select(
      'id, judul, isi, kategori, created_at, posted_by, status, alumni(id, nama), announcement_images(id, public_url, caption, alt_text, position)'
    )
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  // Hidden or non-existent announcements are indistinguishable to the public.
  if (!announcement) notFound();

  const row = announcement as unknown as {
    id: string;
    judul: string;
    isi: string | null;
    kategori: string | null;
    created_at: string | null;
    alumni: { id: string; nama: string } | null;
    announcement_images: AnnouncementImage[];
  };

  // A hidden image must not surface through the announcement either.
  const images = (row.announcement_images ?? []).filter(
    (img) => (img as AnnouncementImage & { status?: string }).status !== 'hidden'
  );

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <Link
          href="/pengumuman"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-container hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Pengumuman
        </Link>

        <article className="card-accent">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="chip-active">
              {CATEGORY_LABELS[row.kategori ?? 'umum'] ?? 'Umum'}
            </span>
            <time
              dateTime={row.created_at ?? undefined}
              className="text-sm text-on-surface-variant"
            >
              {timeAgo(row.created_at)}
            </time>
          </div>

          <h1 className="hero-title mb-4">{row.judul}</h1>

          {/* Rich text is sanitized server-side inside RichText. */}
          <RichText markdown={row.isi} />

          <AnnouncementImages images={images} />

          <div className="mt-6 flex flex-wrap items-center gap-1 border-t border-outline-variant pt-4 text-sm text-on-surface-variant">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            <span>
              Diposting oleh{' '}
              {row.alumni?.id ? (
                <Link
                  href={`/profil/${row.alumni.id}`}
                  className="font-medium text-on-surface hover:text-primary-container hover:underline"
                >
                  {row.alumni.nama}
                </Link>
              ) : (
                <span className="font-medium text-on-surface">Alumni</span>
              )}
              {row.alumni?.nama && (
                <BadgeCheck
                  className="ml-1 inline h-3.5 w-3.5 text-primary-container"
                  aria-label="Alumni terverifikasi"
                />
              )}
            </span>
            <span className="ml-auto">
              <ReportButton
                targetType="announcement"
                targetId={row.id}
                isLoggedIn={Boolean(user)}
                className="btn-tertiary px-2 py-1 text-xs"
              />
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}
