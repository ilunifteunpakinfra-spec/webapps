import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  Briefcase,
  Building2,
  Linkedin,
  Globe,
  FileText,
  Award,
  Handshake,
  GraduationCap,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/user';
import EndorseButton from './EndorseButton';
import type { AlumniSkillRow } from '@/lib/types';

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  // RLS only exposes profiles the current viewer is allowed to see.
  const { data: alumni } = await supabase
    .from('alumni')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!alumni) notFound();

  const { data: skillRows } = await supabase
    .from('alumni_skills')
    .select('skill_id, level, skills(id, nama_skill, kategori)')
    .eq('alumni_id', id)
    .order('level', { ascending: false });

  const { data: endorsementRows } = await supabase
    .from('endorsements')
    .select('skill_id, endorser_id, alumni(id, nama)')
    .eq('alumni_id', id);

  // supabase-js infers joined relations as arrays; they are objects at runtime.
  const endorsements = (endorsementRows ?? []) as unknown as {
    skill_id: string;
    endorser_id: string;
    alumni: { id: string; nama: string } | null;
  }[];

  const endorsementsBySkill = new Map<string, { count: number; names: string[] }>();
  for (const row of endorsements) {
    const entry = endorsementsBySkill.get(row.skill_id) ?? { count: 0, names: [] };
    entry.count += 1;
    if (row.alumni?.nama) entry.names.push(row.alumni.nama);
    endorsementsBySkill.set(row.skill_id, entry);
  }

  const skills: AlumniSkillRow[] = (skillRows ?? []) as unknown as AlumniSkillRow[];
  const isOwner = user?.id === id;
  const isAuthed = Boolean(user);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column - Profile info */}
          <div className="space-y-4">
            <div className="card">
              <div className="flex flex-col items-center text-center">
                {alumni.foto_profil ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={alumni.foto_profil}
                    alt={alumni.nama}
                    className="h-24 w-24 rounded border border-tech-black object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-3xl font-bold text-on-surface-variant">
                    {alumni.nama.charAt(0).toUpperCase()}
                  </div>
                )}
                <h1 className="mt-3 font-montserrat text-xl font-bold">{alumni.nama}</h1>
                {alumni.angkatan && (
                  <div className="label-mono mt-1">Angkatan {alumni.angkatan}</div>
                )}
                {alumni.status_open_to_work && (
                  <span className="chip-active mt-2">Open to Work</span>
                )}
                {alumni.status_verifikasi && (
                  <span className="chip mt-2">Terverifikasi</span>
                )}
              </div>
              <div className="mt-4 space-y-2 border-t border-outline-variant pt-4 text-sm">
                {alumni.pekerjaan && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Briefcase className="h-4 w-4" />
                    {alumni.pekerjaan}
                  </div>
                )}
                {alumni.perusahaan && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Building2 className="h-4 w-4" />
                    {alumni.perusahaan}
                  </div>
                )}
                {alumni.alamat_tinggal && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <MapPin className="h-4 w-4" />
                    {alumni.alamat_tinggal}
                  </div>
                )}
              </div>
              {!isOwner && (
                <div className="mt-4 flex flex-col gap-2">
                  <Link href={`/referral/baru?alumni=${id}`} className="btn-primary">
                    <Handshake className="h-4 w-4" />
                    Minta Referral
                  </Link>
                  <Link href={`/mentoring/${id}`} className="btn-secondary">
                    <GraduationCap className="h-4 w-4" />
                    Ajukan Mentoring
                  </Link>
                </div>
              )}
              {isOwner && (
                <Link href="/profil/edit" className="btn-secondary mt-4 w-full">
                  Edit Profil
                </Link>
              )}
            </div>

            {/* Contact & Links */}
            {(alumni.linkedin || alumni.portofolio_url || alumni.resume_url) && (
              <div className="card">
                <h3 className="label-mono mb-3">Kontak & Link</h3>
                <div className="space-y-2 text-sm">
                  {alumni.linkedin && (
                    <a
                      href={
                        alumni.linkedin.startsWith('http')
                          ? alumni.linkedin
                          : `https://${alumni.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary-container hover:underline"
                    >
                      <Linkedin className="h-4 w-4" />
                      LinkedIn
                    </a>
                  )}
                  {alumni.portofolio_url && (
                    <a
                      href={
                        alumni.portofolio_url.startsWith('http')
                          ? alumni.portofolio_url
                          : `https://${alumni.portofolio_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary-container hover:underline"
                    >
                      <Globe className="h-4 w-4" />
                      Portofolio
                    </a>
                  )}
                  {alumni.resume_url && (
                    <span className="flex items-center gap-2 text-on-surface-variant">
                      <FileText className="h-4 w-4" />
                      {isOwner ? 'Resume terpasang' : 'Resume tersedia'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right column - Bio & Skills */}
          <div className="space-y-4 lg:col-span-2">
            <div className="card">
              <h2 className="section-title mb-3">Tentang</h2>
              <p className="text-on-surface-variant">
                {alumni.bio_singkat || 'Belum ada bio.'}
              </p>
            </div>

            <div className="card">
              <h2 className="section-title mb-4">Keahlian</h2>
              {skills.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Belum ada keahlian yang ditambahkan.
                </p>
              ) : (
                <div className="space-y-4">
                  {skills.map((entry) => {
                    const skill = entry.skills;
                    const endorsement = endorsementsBySkill.get(entry.skill_id) ?? {
                      count: 0,
                      names: [],
                    };
                    return (
                      <div key={entry.skill_id}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="font-medium">{skill?.nama_skill ?? 'Keahlian'}</span>
                          <div className="flex items-center gap-3">
                            <span className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <span
                                  key={i}
                                  className={`h-2 w-2 rounded-full ${
                                    i <= entry.level
                                      ? 'bg-primary-container'
                                      : 'bg-wire-gray'
                                  }`}
                                />
                              ))}
                            </span>
                            <EndorseButton
                              alumniId={id}
                              skillId={entry.skill_id}
                              initialCount={endorsement.count}
                              canEndorse={isAuthed && !isOwner}
                            />
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded bg-surface-container">
                          <div
                            className="h-full bg-primary-container"
                            style={{ width: `${(entry.level / 5) * 100}%` }}
                          />
                        </div>
                        {endorsement.names.length > 0 && (
                          <p className="mt-1 text-xs text-on-surface-variant">
                            Didukung oleh {endorsement.names.slice(0, 3).join(', ')}
                            {endorsement.names.length > 3 &&
                              ` +${endorsement.names.length - 3} lainnya`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="section-title mb-3">Pencapaian</h2>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <Award className="h-5 w-5 text-circuit-yellow" />
                <span>
                  Kontribusi: {(alumni.contribution_score ?? 0).toLocaleString('id-ID')} poin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
