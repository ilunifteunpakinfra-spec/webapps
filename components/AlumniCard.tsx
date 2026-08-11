import Link from 'next/link';
import type { AlumniWithSkills } from '@/lib/types';

/** Palet token (bukan hex) untuk avatar fallback inisial. */
const AVATAR_PALETTE = [
  'bg-primary-container',
  'bg-tech-black',
  'bg-secondary-container',
  'bg-tertiary-container',
] as const;

/** Hash sederhana & deterministik dari nama alumni -> warna avatar stabil. */
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}

type Props = {
  alumni: AlumniWithSkills;
  /** Batas chip skill yang tampil; kosong = tampilkan semua. */
  showSkillsLimit?: number;
};

/**
 * Card alumni tunggal — struktur wajib konsisten di semua halaman:
 * Nama → Angkatan → Pekerjaan → Perusahaan → Skill → footer status + profil.
 */
export default function AlumniCard({ alumni, showSkillsLimit }: Props) {
  const avatarClass =
    AVATAR_PALETTE[hashName(alumni.nama) % AVATAR_PALETTE.length];

  return (
    <div className="card relative flex h-full flex-col">
      {alumni.status_open_to_work && (
        <span className="absolute right-3 top-3 chip-active">Open to Work</span>
      )}
      <div className="flex items-start gap-4">
        {alumni.foto_profil ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={alumni.foto_profil}
            alt={alumni.nama}
            className="h-16 w-16 rounded border border-tech-black object-cover"
          />
        ) : (
          <div
            className={`flex h-16 w-16 items-center justify-center rounded border border-tech-black ${avatarClass} font-montserrat text-xl font-bold text-white`}
          >
            {alumni.nama.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-montserrat text-lg font-bold text-on-surface">
            {alumni.nama}
          </h3>
          {alumni.angkatan ? (
            <div className="label-mono mb-1">Angkatan {alumni.angkatan}</div>
          ) : (
            <div className="label-mono mb-1 text-on-surface-variant">
              Angkatan belum diisi
            </div>
          )}
          {alumni.pekerjaan && (
            <div className="text-sm font-medium text-on-surface">
              {alumni.pekerjaan}
            </div>
          )}
          {alumni.perusahaan && (
            <div className="text-sm text-on-surface-variant">
              {alumni.perusahaan}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(alumni.alumni_skills ?? [])
          .slice(0, showSkillsLimit)
          .map((entry) => (
            <span key={entry.skill_id} className="chip">
              {entry.skills?.nama_skill}
            </span>
          ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-3">
        <span
          className={`status-dot ${
            alumni.status_open_to_work
              ? 'status-dot-active'
              : 'status-dot-inactive'
          }`}
        />
        <Link
          href={`/profil/${alumni.id}`}
          className="text-sm font-medium text-primary-container hover:underline"
        >
          Lihat Profil
        </Link>
      </div>
    </div>
  );
}
