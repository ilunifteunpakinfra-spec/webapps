'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  FileText,
  Plus,
  Trash2,
  Loader2,
  BadgeCheck,
  Eye,
  Globe,
  Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  STORAGE_BUCKETS,
  AVATAR_MAX_DIMENSION,
  AVATAR_QUALITY,
} from '@/lib/constants';
import { compressImage, validateResume } from '@/lib/utils/media';
import { updateProfileAction, toggleOpenToWorkAction } from '@/app/actions/alumni';
import { rateSkillAction, removeSkillAction, requestSkillAction } from '@/app/actions/skills';
import type {
  ActionState,
  AlumniRow,
  SkillRow,
  AlumniSkillRow,
} from '@/lib/types';

const LEVEL_OPTIONS = [1, 2, 3, 4, 5];
const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publik', hint: 'Dapat dilihat siapa saja', icon: Globe },
  { value: 'alumni_only', label: 'Alumni', hint: 'Hanya untuk alumni terdaftar', icon: Eye },
  { value: 'private', label: 'Pribadi', hint: 'Hanya terlihat oleh Anda', icon: Lock },
] as const;

export default function ProfileForm({
  profile,
  skills,
  currentSkills,
  canPrivate = false,
}: {
  profile?: AlumniRow;
  skills: SkillRow[];
  currentSkills: AlumniSkillRow[];
  canPrivate?: boolean;
}) {
  const router = useRouter();

  const [saveState, setSaveState] = useState<ActionState>({});
  const [isSaving, startSaveTransition] = useTransition();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.foto_profil ?? null
  );
  const [resumePath, setResumePath] = useState<string | null>(
    profile?.resume_url ?? null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [skillState, setSkillState] = useState<ActionState>({});
  const [isSkillPending, startSkillTransition] = useTransition();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const isOpenToWork = Boolean(profile?.status_open_to_work);

  // "Pribadi" (private) is an admin-only option. Non-admin profiles that
  // already have `private` fall back to "Publik" so a radio stays selected.
  const visibleOptions = VISIBILITY_OPTIONS.filter(
    (option) => option.value !== 'private' || canPrivate
  );
  const initialVisibility =
    profile?.visibilitas === 'private' && !canPrivate
      ? 'public'
      : (profile?.visibilitas ?? 'public');

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const compressed = await compressImage(file, AVATAR_MAX_DIMENSION, AVATAR_QUALITY);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Silakan masuk terlebih dahulu.');

      const path = `${user.id}/avatar.jpg`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.avatars)
        .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw new Error(error.message);

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.avatars)
        .getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah foto profil.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleResumeChange(file: File | undefined) {
    if (!file) return;
    setUploadError(null);

    const validationError = validateResume(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Silakan masuk terlebih dahulu.');

      const path = `${user.id}/resume.pdf`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.resumes)
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (error) throw new Error(error.message);

      setResumePath(path);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah resume.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('foto_profil', avatarUrl ?? '');
    formData.set('resume_url', resumePath ?? '');

    startSaveTransition(async () => {
      const result = await updateProfileAction({ error: undefined }, formData);
      setSaveState(result);
      if (result.success) router.refresh();
    });
  }

  function handleToggleOpenToWork() {
    const formData = new FormData();
    formData.set('next', String(!isOpenToWork));
    void toggleOpenToWorkAction(formData).then(() => router.refresh());
  }

  function handleAddSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSkillTransition(async () => {
      const result = await rateSkillAction({ error: undefined }, formData);
      setSkillState(result);
      if (result.success) router.refresh();
    });
  }

  function handleRequestSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startSkillTransition(async () => {
      const result = await requestSkillAction({ error: undefined }, formData);
      setSkillState(result);
      if (result.success) router.refresh();
    });
  }

  async function handleRemoveSkill(skillId: string) {
    const formData = new FormData();
    formData.set('skill_id', skillId);
    const result = await removeSkillAction({ error: undefined }, formData);
    setSkillState(result);
    if (result.success) router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ============ Left column: photo, resume, open to work ============ */}
      <div className="space-y-4">
        <div className="card">
          <h3 className="label-mono mb-3">Foto Profil</h3>
          <div className="flex flex-col items-center text-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Foto profil"
                className="h-24 w-24 rounded border border-tech-black object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded border border-tech-black bg-surface-container font-montserrat text-2xl font-bold text-on-surface-variant">
                {(profile?.nama ?? 'A').charAt(0).toUpperCase()}
              </div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e.target.files?.[0])}
            />
            <button
              type="button"
              className="btn-secondary mt-3"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {isUploading ? 'Mengunggah...' : 'Unggah Foto'}
            </button>
            <p className="mt-2 text-xs text-on-surface-variant">
              Otomatis dikompres menjadi maks. 512px
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="label-mono mb-3">Resume (PDF, maks. 2MB)</h3>
          <input
            ref={resumeInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void handleResumeChange(e.target.files?.[0])}
          />
          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => resumeInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {resumePath ? 'Ganti Resume' : 'Unggah Resume'}
          </button>
          {resumePath && (
            <p className="mt-2 flex items-center gap-1 text-xs text-on-surface-variant">
              <BadgeCheck className="h-3 w-3 text-primary-container" />
              Resume terpasang
            </p>
          )}
        </div>

        {uploadError && (
          <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
            {uploadError}
          </div>
        )}

        <div className="card flex items-center justify-between gap-3">
          <div>
            <div className="font-montserrat font-bold">Open to Work</div>
            <p className="text-xs text-on-surface-variant">
              Tampilkan status siap bekerja di direktori
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isOpenToWork}
            onClick={handleToggleOpenToWork}
            className={`relative h-6 w-11 shrink-0 rounded-full border border-tech-black transition-colors ${
              isOpenToWork ? 'bg-primary-container' : 'bg-wire-gray'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full border border-tech-black bg-white transition-all ${
                isOpenToWork ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ============ Right column: profile fields + skills ============ */}
      <div className="space-y-4 lg:col-span-2">
        <form className="card space-y-4" onSubmit={handleSave}>
          {saveState.error && (
            <div className="rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
              {saveState.error}
            </div>
          )}
          {saveState.success && saveState.message && (
            <div className="rounded border border-primary-container/40 bg-surface-container px-3 py-2 text-sm">
              {saveState.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-mono mb-1 block" htmlFor="nama">
                Nama Lengkap *
              </label>
              <input
                id="nama"
                name="nama"
                type="text"
                defaultValue={profile?.nama ?? ''}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="angkatan">
                Angkatan
              </label>
              <input
                id="angkatan"
                name="angkatan"
                type="text"
                placeholder="'12"
                defaultValue={profile?.angkatan ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="tahun_lulus">
                Tahun Lulus *
              </label>
              <input
                id="tahun_lulus"
                name="tahun_lulus"
                type="number"
                defaultValue={profile?.tahun_lulus ?? new Date().getFullYear()}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="pekerjaan">
                Pekerjaan
              </label>
              <input
                id="pekerjaan"
                name="pekerjaan"
                type="text"
                placeholder="Senior Engineer"
                defaultValue={profile?.pekerjaan ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="perusahaan">
                Perusahaan
              </label>
              <input
                id="perusahaan"
                name="perusahaan"
                type="text"
                placeholder="PT. Contoh Energi"
                defaultValue={profile?.perusahaan ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="alamat_tinggal">
                Kota Domisili
              </label>
              <input
                id="alamat_tinggal"
                name="alamat_tinggal"
                type="text"
                placeholder="Jakarta Selatan"
                defaultValue={profile?.alamat_tinggal ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="no_telepon">
                No. Telepon
              </label>
              <input
                id="no_telepon"
                name="no_telepon"
                type="tel"
                defaultValue={profile?.no_telepon ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="linkedin">
                LinkedIn
              </label>
              <input
                id="linkedin"
                name="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/..."
                defaultValue={profile?.linkedin ?? ''}
                className="input-field"
              />
            </div>
            <div>
              <label className="label-mono mb-1 block" htmlFor="portofolio_url">
                URL Portofolio
              </label>
              <input
                id="portofolio_url"
                name="portofolio_url"
                type="url"
                placeholder="https://..."
                defaultValue={profile?.portofolio_url ?? ''}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label-mono mb-1 block" htmlFor="bio_singkat">
              Bio Singkat
            </label>
            <textarea
              id="bio_singkat"
              name="bio_singkat"
              rows={3}
              placeholder="Ceritakan tentang diri Anda..."
              defaultValue={profile?.bio_singkat ?? ''}
              className="input-field"
            />
          </div>

          <div>
            <label className="label-mono mb-1 block">Visibilitas Profil</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {visibleOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded border p-3 transition-colors ${
                    initialVisibility === option.value
                      ? 'border-primary-container bg-surface-container'
                      : 'border-wire-gray'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibilitas"
                    value={option.value}
                    defaultChecked={initialVisibility === option.value}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 font-medium">
                    <option.icon className="h-4 w-4 text-primary-container" />
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-on-surface-variant">
                    {option.hint}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </form>

        {/* Skills section */}
        <div className="card">
          <h2 className="section-title mb-4">Keahlian</h2>

          <form className="mb-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleAddSkill}>
            <select name="skill_id" className="input-field sm:flex-1" required>
              <option value="">Pilih keahlian...</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.nama_skill} ({skill.kategori ?? 'umum'})
                </option>
              ))}
            </select>
            <select name="level" className="input-field sm:w-28" defaultValue={3}>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary" disabled={isSkillPending}>
              <Plus className="h-4 w-4" />
              Tambah
            </button>
          </form>

          <form className="mb-4 flex flex-col gap-2 border-t border-outline-variant pt-4 sm:flex-row" onSubmit={handleRequestSkill}>
            <input
              name="nama_skill"
              placeholder="Nama keahlian baru (teks bebas)..."
              className="input-field sm:flex-1"
              required
              minLength={2}
              maxLength={60}
            />
            <select name="kategori" className="input-field sm:w-44" defaultValue="hard">
              <option value="hard">Teknis (Hard)</option>
              <option value="soft">Non-teknis (Soft)</option>
            </select>
            <select name="level" className="input-field sm:w-28" defaultValue={3}>
              {LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  Level {level}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary" disabled={isSkillPending}>
              <Plus className="h-4 w-4" />
              Ajukan
            </button>
          </form>
          <p className="mb-4 text-xs text-on-surface-variant">
            Keahlian baru dimoderasi admin terlebih dahulu sebelum muncul di
            profil dan direktori. Jika nama sudah ada, keahlian langsung
            ditambahkan ke profil Anda.
          </p>

          {skillState.error && (
            <div className="mb-3 rounded border border-error-container bg-error-container/40 px-3 py-2 text-sm text-error-on-container">
              {skillState.error}
            </div>
          )}

          {currentSkills.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Belum ada keahlian. Tambahkan keahlian Anda di atas.
            </p>
          ) : (
            <div className="space-y-2">
              {currentSkills.map((entry) => (
                <div
                  key={entry.skill_id}
                  className="flex items-center justify-between rounded border border-outline-variant px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{entry.skills?.nama_skill ?? 'Keahlian'}</span>
                    <span className="flex gap-0.5">
                      {LEVEL_OPTIONS.map((i) => (
                        <span
                          key={i}
                          className={`h-2 w-2 rounded-full ${
                            i <= entry.level ? 'bg-primary-container' : 'bg-wire-gray'
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-error"
                    onClick={() => void handleRemoveSkill(entry.skill_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
