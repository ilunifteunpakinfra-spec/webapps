import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  Flag,
  Images,
  Lightbulb,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Breadcrumbs from '@/components/Breadcrumbs';
import AdminNav from '@/components/admin/AdminNav';
import { createClient } from '@/lib/supabase/server';
import {
  getCurrentUser,
  hasCapability,
  isAdminUser,
  isSuperAdmin,
} from '@/lib/supabase/user';
import ReportActions from './ReportActions';
import ContentActions from './ContentActions';
import SkillActions from './SkillActions';

export const metadata: Metadata = {
  title: 'Moderasi Konten - ILUNI FT ELEKTRO UNPAK',
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  job: 'Lowongan',
  announcement: 'Pengumuman',
  poll: 'Polling',
  group: 'Grup',
  gallery: 'Galeri',
  profile: 'Profil',
};

type ReportRow = {
  id: string;
  reporter_id: string | null;
  target_type: string;
  target_id: string;
  alasan: string | null;
  status: string;
  created_at: string | null;
  alumni: { nama: string } | null;
};

type JobRow = { id: string; judul: string; perusahaan: string | null; status: string; created_at: string | null };
type AnnouncementRow = { id: string; judul: string; status: string; created_at: string | null };
type PollRow = { id: string; judul: string; expired_at: string | null; created_at: string | null };
type GroupRow = { id: string; nama: string; tipe: string | null; created_at: string | null };
type GalleryRow = { id: string; caption: string | null; foto_url: string | null; created_at: string | null };
type SkillRow = {
  id: string;
  nama_skill: string;
  kategori: string | null;
  status: string;
  created_at: string | null;
  alumni: { nama: string } | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!isAdminUser(user)) redirect('/');

  const { tab } = await searchParams;
  const activeTab = tab === 'konten' || tab === 'keahlian' ? tab : 'laporan';

  const supabase = await createClient();

  const [
    reportQuery,
    jobQuery,
    announcementQuery,
    pollQuery,
    groupQuery,
    galleryQuery,
    skillQuery,
  ] = await Promise.all([
    supabase
      .from('content_reports')
      .select('*, alumni!content_reports_reporter_id_fkey(nama)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('job_postings')
      .select('id, judul, perusahaan, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('announcements')
      .select('id, judul, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('polls')
      .select('id, judul, expired_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('groups')
      .select('id, nama, tipe, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('event_gallery')
      .select('id, caption, foto_url, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('skills')
      .select('id, nama_skill, kategori, status, created_at, requested_by, alumni!skills_requested_by_fkey(nama)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const caps = {
    jobs: hasCapability(user, 'moderate_jobs'),
    announcements: hasCapability(user, 'moderate_announcements'),
    polls: hasCapability(user, 'moderate_polls'),
    groups: hasCapability(user, 'moderate_groups'),
    gallery: hasCapability(user, 'moderate_gallery'),
    skills: hasCapability(user, 'moderate_skills'),
    reports: hasCapability(user, 'moderate_reports'),
  };

  const reports = (reportQuery.data ?? []) as unknown as ReportRow[];
  const jobs = (jobQuery.data ?? []) as JobRow[];
  const announcements = (announcementQuery.data ?? []) as AnnouncementRow[];
  const polls = (pollQuery.data ?? []) as PollRow[];
  const groups = (groupQuery.data ?? []) as GroupRow[];
  const photos = (galleryQuery.data ?? []) as GalleryRow[];
  const pendingSkills = (skillQuery.data ?? []) as unknown as SkillRow[];

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Moderasi' }]} />

        <div className="mb-6">
          <h1 className="hero-title mb-2">Moderasi Konten</h1>
          <p className="text-on-surface-variant">
            Tinjau laporan komunitas dan kelola konten yang melanggar aturan
          </p>
        </div>

        <AdminNav
          isSuperAdmin={isSuperAdmin(user)}
          showAlumni={hasCapability(user, 'manage_alumni')}
        />

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          <Link
            href="/admin/moderation"
            className={activeTab === 'laporan' ? 'chip-active' : 'chip'}
          >
            <Flag className="h-3.5 w-3.5" />
            Laporan ({reports.length})
          </Link>
          <Link
            href="/admin/moderation?tab=konten"
            className={activeTab === 'konten' ? 'chip-active' : 'chip'}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Konten
          </Link>
          <Link
            href="/admin/moderation?tab=keahlian"
            className={activeTab === 'keahlian' ? 'chip-active' : 'chip'}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Keahlian ({pendingSkills.length})
          </Link>
        </div>

        {activeTab === 'laporan' && (
          /* ---------------- LAPORAN TAB ---------------- */
          <div className="card mt-4 overflow-x-auto">
            <h2 className="section-title mb-4">Laporan Masuk</h2>
            {reports.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left">
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Pelapor</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Jenis</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Alasan</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Tanggal</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-outline-variant align-top">
                      <td className="py-3">
                        <div className="font-medium">{report.alumni?.nama ?? 'Alumni'}</div>
                        <div className="font-mono text-xs text-on-surface-variant">
                          {report.target_id.slice(0, 8)}…
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="chip">
                          {REPORT_TYPE_LABELS[report.target_type] ?? report.target_type}
                        </span>
                      </td>
                      <td className="max-w-[320px] py-3 text-on-surface-variant">
                        {report.alasan || 'Tanpa alasan.'}
                      </td>
                      <td className="py-3 text-on-surface-variant">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="py-3">
                        <ReportActions reportId={report.id} canModerate={caps.reports} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <CheckCircle2 className="h-4 w-4" />
                Tidak ada laporan tertunda. Semua konten aman!
              </div>
            )}
          </div>
        )}

        {activeTab === 'konten' && (
          /* ---------------- KONTEN TAB ---------------- */
          <div className="mt-4 space-y-6">
            {/* Jobs */}
            <div className="card overflow-x-auto">
              <h2 className="section-title mb-1 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary-container" />
                Lowongan
              </h2>
              <p className="mb-3 text-sm text-on-surface-variant">
                Sembunyikan lowongan yang tidak pantas; konten tersembunyi tidak
                muncul di halaman publik.
              </p>
              {jobs.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left">
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Judul</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Perusahaan</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Status</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-outline-variant">
                        <td className="py-3 font-medium">{job.judul}</td>
                        <td className="py-3 text-on-surface-variant">{job.perusahaan ?? '-'}</td>
                        <td className="py-3">
                          <span className={job.status === 'hidden' ? 'chip' : 'chip-active'}>
                            {job.status === 'hidden' ? 'Tersembunyi' : 'Aktif'}
                          </span>
                        </td>
                        <td className="py-3">
                          <ContentActions
                            kind="job"
                            id={job.id}
                            hidden={job.status === 'hidden'}
                            canModerate={caps.jobs}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-on-surface-variant">Belum ada lowongan.</p>
              )}
            </div>

            {/* Announcements */}
            <div className="card overflow-x-auto">
              <h2 className="section-title mb-1 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary-container" />
                Pengumuman
              </h2>
              <p className="mb-3 text-sm text-on-surface-variant">
                Sembunyikan pengumuman yang tidak pantas dari halaman publik.
              </p>
              {announcements.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left">
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Judul</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Status</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map((item) => (
                      <tr key={item.id} className="border-b border-outline-variant">
                        <td className="py-3 font-medium">{item.judul}</td>
                        <td className="py-3">
                          <span className={item.status === 'hidden' ? 'chip' : 'chip-active'}>
                            {item.status === 'hidden' ? 'Tersembunyi' : 'Aktif'}
                          </span>
                        </td>
                        <td className="py-3">
                          <ContentActions
                            kind="announcement"
                            id={item.id}
                            hidden={item.status === 'hidden'}
                            canModerate={caps.announcements}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-on-surface-variant">Belum ada pengumuman.</p>
              )}
            </div>

            {/* Polls */}
            <div className="card overflow-x-auto">
              <h2 className="section-title mb-1 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary-container" />
                Polling
              </h2>
              <p className="mb-3 text-sm text-on-surface-variant">
                Tutup polling untuk menghentikan suara, atau hapus permanen
                beserta semua opsinya.
              </p>
              {polls.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left">
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Judul</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Berakhir</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {polls.map((poll) => {
                      const closed = poll.expired_at
                        ? new Date(poll.expired_at).getTime() <= Date.now()
                        : false;
                      return (
                        <tr key={poll.id} className="border-b border-outline-variant">
                          <td className="py-3 font-medium">{poll.judul}</td>
                          <td className="py-3 text-on-surface-variant">
                            {closed ? 'Berakhir' : formatDate(poll.expired_at)}
                          </td>
                          <td className="py-3">
                            <ContentActions
                              kind="poll"
                              id={poll.id}
                              closed={closed}
                              canModerate={caps.polls}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-on-surface-variant">Belum ada polling.</p>
              )}
            </div>

            {/* Groups */}
            <div className="card overflow-x-auto">
              <h2 className="section-title mb-1 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-container" />
                Grup
              </h2>
              <p className="mb-3 text-sm text-on-surface-variant">
                Hapus grup yang melanggar aturan (keanggotaan ikut terhapus).
              </p>
              {groups.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left">
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Nama</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Tipe</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.id} className="border-b border-outline-variant">
                        <td className="py-3 font-medium">{group.nama}</td>
                        <td className="py-3">
                          <span className="chip">{group.tipe ?? '-'}</span>
                        </td>
                        <td className="py-3">
                          <ContentActions
                            kind="group"
                            id={group.id}
                            canModerate={caps.groups}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-on-surface-variant">Belum ada grup.</p>
              )}
            </div>

            {/* Gallery */}
            <div className="card overflow-x-auto">
              <h2 className="section-title mb-1 flex items-center gap-2">
                <Images className="h-5 w-5 text-primary-container" />
                Galeri
              </h2>
              <p className="mb-3 text-sm text-on-surface-variant">
                Hapus foto yang tidak pantas; file di storage ikut terhapus.
              </p>
              {photos.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-left">
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Foto</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Caption</th>
                      <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {photos.map((photo) => (
                      <tr key={photo.id} className="border-b border-outline-variant">
                        <td className="py-3">
                          {photo.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo.foto_url}
                              alt={photo.caption ?? 'Foto galeri'}
                              className="h-10 w-10 rounded border border-tech-black object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded border border-tech-black bg-surface-container" />
                          )}
                        </td>
                        <td className="max-w-[320px] py-3 text-on-surface-variant">
                          {photo.caption || 'Tanpa caption'}
                        </td>
                        <td className="py-3">
                          <ContentActions
                            kind="gallery"
                            id={photo.id}
                            canModerate={caps.gallery}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-on-surface-variant">Belum ada foto.</p>
              )}
            </div>

          </div>
        )}

        {activeTab === 'keahlian' && (
          /* ---------------- KEAHLIAN TAB ---------------- */
          <div className="card mt-4 overflow-x-auto">
            <h2 className="section-title mb-1 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary-container" />
              Keahlian Baru
            </h2>
            <p className="mb-3 text-sm text-on-surface-variant">
              Alumni mengusulkan nama keahlian baru (teks bebas). Setujui agar
              muncul di profil dan direktori, atau tolak usulannya.
            </p>
            {pendingSkills.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left">
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Nama Keahlian</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Kategori</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Diajukan Oleh</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Tanggal</th>
                    <th className="pb-2 font-mono text-xs uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSkills.map((skill) => (
                    <tr key={skill.id} className="border-b border-outline-variant">
                      <td className="py-3 font-medium">{skill.nama_skill}</td>
                      <td className="py-3">
                        <span className="chip">{skill.kategori ?? 'umum'}</span>
                      </td>
                      <td className="py-3 text-on-surface-variant">
                        {skill.alumni?.nama ?? 'Alumni'}
                      </td>
                      <td className="py-3 text-on-surface-variant">
                        {formatDate(skill.created_at)}
                      </td>
                      <td className="py-3">
                        <SkillActions skillId={skill.id} canModerate={caps.skills} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-on-surface-variant">
                Tidak ada permintaan keahlian baru.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
