// ============================================
// ILUNI FTE WebApps - Job Board Formatting
// Pure display helpers for vacancy postings. No DB or React access, so these
// are the safest layer to unit-test (see tests/unit/jobs-format.test.ts).
// ============================================

import {
  EXPERIENCE_LABELS,
  JOB_STATUS_LABELS,
  JOB_TYPE_LABELS,
  SALARY_PERIOD_LABELS,
  WORK_MODE_LABELS,
  type ExperienceLevel,
  type JobStatus,
  type JobType,
  type SalaryPeriod,
  type WorkMode,
} from '@/lib/constants';

/** Format an IDR amount as a compact "15 jt" / "2,5 jt" string. */
export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return '-';
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    // toFixed() yields a PERIOD decimal ("20.0"); strip the trailing ".0"
    // before switching to the Indonesian comma separator, otherwise
    // 20_000_000 renders as "20,0 jt".
    const trimmed = millions.toFixed(1).replace(/\.0$/, '');
    return `${trimmed.replace('.', ',')} jt`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `${thousands.toFixed(0)} rb`;
  }
  return String(amount);
}

/**
 * Render a salary range. Returns "Negosiasi" when no figure is disclosed, so
 * the card always shows something in the same slot.
 */
export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
  period: SalaryPeriod | null | undefined = 'monthly'
): string {
  const suffix = period ? SALARY_PERIOD_LABELS[period] : SALARY_PERIOD_LABELS.monthly;
  const hasMin = typeof min === 'number' && Number.isFinite(min) && min > 0;
  const hasMax = typeof max === 'number' && Number.isFinite(max) && max > 0;

  if (hasMin && hasMax && min !== max) {
    return `Rp ${formatRupiah(min as number)}–${formatRupiah(max as number)} ${suffix}`;
  }
  if (hasMin) return `Rp ${formatRupiah(min as number)} ${suffix}`;
  if (hasMax) return `s/d Rp ${formatRupiah(max as number)} ${suffix}`;
  return 'Negosiasi';
}

/** Whether a posting discloses any salary figure. */
export function hasSalary(
  min: number | null | undefined,
  max: number | null | undefined
): boolean {
  const valid = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  return valid(min) || valid(max);
}

/** Safe label lookup — unknown/null values fall back to a dash. */
export function jobTypeLabel(v: string | null | undefined): string {
  return JOB_TYPE_LABELS[v as JobType] ?? '-';
}

export function workModeLabel(v: string | null | undefined): string {
  return WORK_MODE_LABELS[v as WorkMode] ?? '-';
}

export function experienceLabel(v: string | null | undefined): string {
  return EXPERIENCE_LABELS[v as ExperienceLevel] ?? '-';
}

export function jobStatusLabel(v: string | null | undefined): string {
  return JOB_STATUS_LABELS[v as JobStatus] ?? '-';
}

/** True when the posting is past its closing date. */
export function isExpired(expiredAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiredAt) return false;
  const t = new Date(expiredAt).getTime();
  return Number.isFinite(t) && t < now;
}

/** "Tutup 12 Mei 2026" / "Tanpa batas" — used on cards and the detail page. */
export function formatExpiry(expiredAt: string | null | undefined): string {
  if (!expiredAt) return 'Tanpa batas';
  const d = new Date(expiredAt);
  if (Number.isNaN(d.getTime())) return 'Tanpa batas';
  return `Tutup ${d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;
}

/**
 * Visually-hidden `<time>` payload: a machine-readable ISO string, or an empty
 * string when the date is absent/invalid.
 */
export function machineDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** Parse a comma-separated skill input into a clean, deduped array. */
export function parseSkillInput(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * Validate the structured salary inputs.
 * Mirrors the DB CHECK constraints so the user gets an inline message instead
 * of a raw Postgres error.
 */
export function validateSalary(
  minRaw: string | number | null,
  maxRaw: string | number | null
): { error: string | null } {
  const toNum = (v: string | number | null): number | null => {
    if (v === null || v === '' || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const min = toNum(minRaw);
  const max = toNum(maxRaw);

  if (min !== null && min < 0) return { error: 'Gaji minimum tidak boleh negatif.' };
  if (min !== null && max !== null && max < min) {
    return { error: 'Gaji maksimum harus lebih besar dari gaji minimum.' };
  }
  return { error: null };
}
