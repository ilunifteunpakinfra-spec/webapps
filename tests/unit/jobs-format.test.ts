import { describe, it, expect } from 'vitest';
import {
  formatRupiah,
  formatSalaryRange,
  hasSalary,
  isExpired,
  formatExpiry,
  machineDate,
  parseSkillInput,
  validateSalary,
  jobTypeLabel,
  workModeLabel,
  experienceLabel,
  jobStatusLabel,
} from '@/lib/jobs/format';

describe('formatRupiah', () => {
  it('formats millions with a comma decimal', () => {
    expect(formatRupiah(2_500_000)).toBe('2,5 jt');
  });

  it('drops a trailing ,0 so 20jt reads cleanly', () => {
    expect(formatRupiah(20_000_000)).toBe('20 jt');
  });

  it('formats thousands', () => {
    expect(formatRupiah(50_000)).toBe('50 rb');
  });

  it('returns a dash for invalid or negative input', () => {
    expect(formatRupiah(-1)).toBe('-');
    expect(formatRupiah(Number.NaN)).toBe('-');
  });
});

describe('formatSalaryRange', () => {
  it('renders both bounds', () => {
    expect(formatSalaryRange(15_000_000, 20_000_000, 'monthly')).toBe(
      'Rp 15 jt–20 jt per bulan'
    );
  });

  it('renders a single figure when min equals max', () => {
    expect(formatSalaryRange(15_000_000, 15_000_000, 'monthly')).toBe(
      'Rp 15 jt per bulan'
    );
  });

  it('falls back to "Negosiasi" when nothing is disclosed', () => {
    expect(formatSalaryRange(null, null)).toBe('Negosiasi');
    expect(formatSalaryRange(undefined, undefined)).toBe('Negosiasi');
  });

  it('treats zero as undisclosed', () => {
    expect(formatSalaryRange(0, 0)).toBe('Negosiasi');
  });

  it('handles max-only with an "s/d" prefix', () => {
    expect(formatSalaryRange(null, 10_000_000)).toBe('s/d Rp 10 jt per bulan');
  });
});

describe('hasSalary', () => {
  it('detects a disclosed figure', () => {
    expect(hasSalary(1, null)).toBe(true);
    expect(hasSalary(null, 1)).toBe(true);
  });

  it('rejects zero and negatives', () => {
    expect(hasSalary(0, 0)).toBe(false);
    expect(hasSalary(-5, null)).toBe(false);
  });
});

describe('isExpired', () => {
  const now = new Date('2026-09-27T00:00:00Z').getTime();

  it('is true for a past date', () => {
    expect(isExpired('2026-01-01T00:00:00Z', now)).toBe(true);
  });

  it('is false for a future date', () => {
    expect(isExpired('2027-01-01T00:00:00Z', now)).toBe(false);
  });

  it('is false for null (no deadline)', () => {
    expect(isExpired(null, now)).toBe(false);
  });
});

describe('formatExpiry', () => {
  it('renders a closed date', () => {
    expect(formatExpiry('2026-12-01T00:00:00Z')).toContain('Tutup');
  });

  it('handles null and invalid input', () => {
    expect(formatExpiry(null)).toBe('Tanpa batas');
    expect(formatExpiry('not-a-date')).toBe('Tanpa batas');
  });
});

describe('machineDate', () => {
  it('normalises to ISO for the <time dateTime> attribute', () => {
    expect(machineDate('2026-09-27T10:00:00+07:00')).toBe('2026-09-27T03:00:00.000Z');
  });

  it('returns an empty string for absent/invalid input', () => {
    expect(machineDate(null)).toBe('');
    expect(machineDate('nope')).toBe('');
  });
});

describe('parseSkillInput', () => {
  it('splits, trims and dedupes', () => {
    expect(parseSkillInput('PLC, SCADA ,PLC, ')).toEqual(['PLC', 'SCADA']);
  });

  it('returns an empty array for blank input', () => {
    expect(parseSkillInput('   ')).toEqual([]);
  });
});

describe('validateSalary', () => {
  it('rejects max below min', () => {
    expect(validateSalary(20_000_000, 10_000_000).error).toMatch(/lebih besar/i);
  });

  it('rejects a negative minimum', () => {
    expect(validateSalary(-1, null).error).toMatch(/negatif/i);
  });

  it('accepts an ordered range', () => {
    expect(validateSalary(10, 20).error).toBeNull();
  });

  it('accepts blanks', () => {
    expect(validateSalary(null, null).error).toBeNull();
    expect(validateSalary('', '').error).toBeNull();
  });
});

describe('label lookups', () => {
  it('maps known enum values', () => {
    expect(jobTypeLabel('full_time')).toBe('Penuh Waktu');
    expect(workModeLabel('remote')).toBe('Remote');
    expect(experienceLabel('senior')).toBe('Senior');
    expect(jobStatusLabel('pending')).toBe('Menunggu Review');
  });

  it('returns a dash for unknown or null values', () => {
    expect(jobTypeLabel('nonsense')).toBe('-');
    expect(jobTypeLabel(null)).toBe('-');
    expect(jobStatusLabel(undefined)).toBe('-');
  });
});
