'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import {
  EXPERIENCE_LEVELS,
  EXPERIENCE_LABELS,
  JOB_TYPES,
  JOB_TYPE_LABELS,
  SALARY_FILTER_STEPS,
  WORK_MODES,
  WORK_MODE_LABELS,
  type ExperienceLevel,
  type JobType,
  type WorkMode,
} from '@/lib/constants';

type Props = {
  skillOptions: string[];
  activeSkill: string | null | undefined;
  total: number;
};

const PLACEHOLDER = '— Semua —';

/**
 * Filter bar for the job board. All state lives in the URL so results are
 * shareable, survive a refresh, and work with the back button.
 */
export default function JobFilters({ skillOptions, activeSkill, total }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Merge a patch into the current query and navigate. Page always resets. */
  const apply = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      params.delete('page'); // a new filter always restarts pagination
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  const current = (key: string) => searchParams.get(key) ?? '';

  const hasFilters =
    Boolean(current('type')) ||
    Boolean(current('mode')) ||
    Boolean(current('exp')) ||
    Boolean(current('salary')) ||
    Boolean(current('q')) ||
    Boolean(activeSkill);

  return (
    <div className="filter-bar mb-6" data-testid="job-filters">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="job-search" className="sr-only">
          Cari lowongan
        </label>
        <input
          id="job-search"
          type="search"
          defaultValue={current('q')}
          placeholder="Cari judul atau perusahaan…"
          className="input-field max-w-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              apply({ q: (e.target as HTMLInputElement).value });
            }
          }}
        />

        <label htmlFor="job-type" className="sr-only">
          Tipe pekerjaan
        </label>
        <select
          id="job-type"
          className="select-field max-w-[10rem]"
          value={current('type')}
          onChange={(e) => apply({ type: e.target.value || null })}
        >
          <option value="">{PLACEHOLDER} Tipe</option>
          {JOB_TYPES.map((t: JobType) => (
            <option key={t} value={t}>
              {JOB_TYPE_LABELS[t]}
            </option>
          ))}
        </select>

        <label htmlFor="job-mode" className="sr-only">
          Mode kerja
        </label>
        <select
          id="job-mode"
          className="select-field max-w-[9rem]"
          value={current('mode')}
          onChange={(e) => apply({ mode: e.target.value || null })}
        >
          <option value="">{PLACEHOLDER} Mode</option>
          {WORK_MODES.map((m: WorkMode) => (
            <option key={m} value={m}>
              {WORK_MODE_LABELS[m]}
            </option>
          ))}
        </select>

        <label htmlFor="job-exp" className="sr-only">
          Level pengalaman
        </label>
        <select
          id="job-exp"
          className="select-field max-w-[9rem]"
          value={current('exp')}
          onChange={(e) => apply({ exp: e.target.value || null })}
        >
          <option value="">{PLACEHOLDER} Level</option>
          {EXPERIENCE_LEVELS.map((e2: ExperienceLevel) => (
            <option key={e2} value={e2}>
              {EXPERIENCE_LABELS[e2]}
            </option>
          ))}
        </select>

        <label htmlFor="job-salary" className="sr-only">
          Gaji minimum
        </label>
        <select
          id="job-salary"
          className="select-field max-w-[9rem]"
          value={current('salary')}
          onChange={(e) => apply({ salary: e.target.value || null })}
        >
          {SALARY_FILTER_STEPS.map((s) => (
            <option key={s.label} value={s.value ?? ''}>
              {s.value ? `Gaji ${s.label}` : 'Semua gaji'}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="btn-tertiary"
          >
            Hapus filter
          </button>
        )}
      </div>

      {skillOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => apply({ skill: null })}
            className={!activeSkill ? 'chip-active' : 'chip'}
            aria-pressed={!activeSkill}
          >
            Semua
          </button>
          {skillOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => apply({ skill: activeSkill === s ? null : s })}
              className={activeSkill === s ? 'chip-active' : 'chip'}
              aria-pressed={activeSkill === s}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="meta-line mt-3" aria-live="polite">
        {total} lowongan aktif ditemukan
      </p>
    </div>
  );
}
