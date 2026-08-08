import Link from 'next/link';
import { Trophy, Medal, ArrowUpRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import type { AlumniRow } from '@/lib/types';

export const metadata = {
  title: 'Peringkat Kontribusi - ILUNI FTE UNPAK',
};

const TOP_N = 50;

/** Score weights per contribution type (publicly visible activities). */
const SCORE_WEIGHTS = {
  endorsement: 5,
  job: 8,
  poll: 5,
  group: 5,
  announcement: 3,
  galleryPhoto: 2,
} as const;

const MEDAL_STYLES = [
  'border-yellow-400 bg-yellow-400/10 text-yellow-600',
  'border-slate-300 bg-slate-300/10 text-slate-500',
  'border-amber-600 bg-amber-600/10 text-amber-700',
];

function countByAuthor<T extends string>(
  rows: { [key in T]: string }[],
  key: T
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const authorId = row[key];
    if (!authorId) continue;
    counts.set(authorId, (counts.get(authorId) ?? 0) + 1);
  }
  return counts;
}

export default async function PeringkatPage() {
  const supabase = await createClient();

  const { data: alumniRows } = await supabase
    .from('alumni')
    .select(
      'id, nama, foto_profil, angkatan, pekerjaan, perusahaan, contribution_score, tahun_lulus'
    );
  const alumni = (alumniRows ?? []) as Pick<
    AlumniRow,
    'id' | 'nama' | 'foto_profil' | 'angkatan' | 'pekerjaan' | 'perusahaan' | 'contribution_score' | 'tahun_lulus'
  >[];

  const [{ data: endorsementRows }, { data: jobRows }, { data: pollRows }, { data: groupRows }, { data: announcementRows }, { data: galleryRows }] =
    await Promise.all([
      supabase.from('endorsements').select('alumni_id'),
      supabase.from('job_postings').select('posted_by'),
      supabase.from('polls').select('created_by'),
      supabase.from('groups').select('created_by'),
      supabase.from('announcements').select('posted_by'),
      supabase.from('event_gallery').select('alumni_id'),
    ]);

  const endorsements = countByAuthor((endorsementRows ?? []) as { alumni_id: string }[], 'alumni_id');
  const jobs = countByAuthor((jobRows ?? []) as { posted_by: string }[], 'posted_by');
  const polls = countByAuthor((pollRows ?? []) as { created_by: string }[], 'created_by');
  const groups = countByAuthor((groupRows ?? []) as { created_by: string }[], 'created_by');
  const announcements = countByAuthor((announcementRows ?? []) as { posted_by: string }[], 'posted_by');
  const galleryPhotos = countByAuthor((galleryRows ?? []) as { alumni_id: string }[], 'alumni_id');

  const ranked = alumni
    .map((alumni) => {
      const breakdown = {
        endorsements: endorsements.get(alumni.id) ?? 0,
        jobs: jobs.get(alumni.id) ?? 0,
        polls: polls.get(alumni.id) ?? 0,
        groups: groups.get(alumni.id) ?? 0,
        announcements: announcements.get(alumni.id) ?? 0,
        galleryPhotos: galleryPhotos.get(alumni.id) ?? 0,
      };
      const score =
        breakdown.endorsements * SCORE_WEIGHTS.endorsement +
        breakdown.jobs * SCORE_WEIGHTS.job +
        breakdown.polls * SCORE_WEIGHTS.poll +
        breakdown.groups * SCORE_WEIGHTS.group +
        breakdown.announcements * SCORE_WEIGHTS.announcement +
        breakdown.galleryPhotos * SCORE_WEIGHTS.galleryPhoto;
      return { ...alumni, breakdown, score };
    })
    .sort((a, b) => b.score - a.score || a.nama.localeCompare(b.nama))
    .slice(0, TOP_N);

  const totalContributions = ranked.reduce((sum, entry) => sum + entry.score, 0);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-primary-container">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="hero-title mb-1">Peringkat Kontribusi</h1>
            <p className="text-on-surface-variant">
              Alumni paling aktif berkontribusi untuk komunitas — Top {TOP_N}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(SCORE_WEIGHTS).map(([key, weight]) => (
            <div key={key} className="card">
              <div className="label-mono mb-1">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="font-montserrat text-xl font-bold text-primary-container">
                +{weight}
              </div>
              <div className="text-xs text-on-surface-variant">poin / kontribusi</div>
            </div>
          ))}
        </div>

        {ranked.length > 0 ? (
          <div className="card overflow-hidden p-0">
            <ul className="divide-y divide-outline-variant">
              {ranked.map((entry, index) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-container/50"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-montserrat text-sm font-bold ${
                        isTopThree ? MEDAL_STYLES[index] : 'border-wire-gray text-on-surface-variant'
                      }`}
                    >
                      {isTopThree ? <Medal className="h-4 w-4" /> : rank}
                    </div>

                    {entry.foto_profil ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.foto_profil}
                        alt={entry.nama}
                        className="h-10 w-10 shrink-0 rounded-full border border-tech-black bg-white object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-tech-black bg-surface-container font-montserrat text-sm font-bold text-on-surface-variant">
                        {entry.nama.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/profil/${entry.id}`}
                          className="font-montserrat font-bold text-on-surface hover:text-primary-container"
                        >
                          {entry.nama}
                        </Link>
                        {entry.angkatan && <span className="chip">{entry.angkatan}</span>}
                      </div>
                      <p className="truncate text-sm text-on-surface-variant">
                        {[entry.pekerjaan, entry.perusahaan].filter(Boolean).join(' • ') ||
                          'Alumni FTE'}
                      </p>
                    </div>

                    <div className="hidden text-right text-xs text-on-surface-variant md:block">
                      <div>{entry.breakdown.endorsements} endorsement</div>
                      <div>{entry.breakdown.jobs} lowongan</div>
                      <div>{entry.breakdown.polls} polling</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-montserrat text-2xl font-bold text-primary-container">
                        {entry.score}
                      </span>
                      <span className="text-xs text-on-surface-variant">poin</span>
                      <ArrowUpRight className="h-4 w-4 text-on-surface-variant" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="card text-center text-on-surface-variant">
            Belum ada data kontribusi. Mulai berpartisipasi untuk naik peringkat!
          </div>
        )}

        <p className="mt-4 text-center text-xs text-on-surface-variant">
          Skor dihitung dari aktivitas publik: endorsement, lowongan, polling,
          grup, pengumuman, dan unggahan galeri. Total {totalContributions} poin
          terhitung di papan ini.
        </p>
      </div>
    </div>
  );
}
