import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { safePath, timeAgo, formatDate, asString } from '@/lib/utils';

describe('safePath', () => {
  it('accepts a normal absolute path', () => {
    expect(safePath('/direktori')).toBe('/direktori');
  });

  it('rejects protocol-relative URLs (open-redirect guard)', () => {
    // "//evil.com" resolves to a different host — must never be allowed.
    expect(safePath('//evil.com')).toBe('/');
  });

  it('rejects absolute URLs pointing off-site', () => {
    expect(safePath('https://evil.com/x')).toBe('/');
  });

  it('uses the fallback for undefined/empty', () => {
    expect(safePath(undefined)).toBe('/');
    expect(safePath(undefined, '/login')).toBe('/login');
  });

  it('rejects a relative path without a leading slash', () => {
    expect(safePath('direktori')).toBe('/');
  });
});

describe('asString', () => {
  it('returns undefined when absent', () => {
    expect(asString(undefined)).toBeUndefined();
  });

  it('returns a plain string unchanged', () => {
    expect(asString('PLN')).toBe('PLN');
  });

  it('takes the first value of a repeated param', () => {
    expect(asString(['first', 'second'])).toBe('first');
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-09-27T12:00:00Z').getTime();
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('labels today', () => {
    vi.setSystemTime(now);
    expect(timeAgo('2026-09-27T08:00:00Z')).toBe('Hari ini');
  });

  it('labels yesterday', () => {
    vi.setSystemTime(now);
    expect(timeAgo('2026-09-26T08:00:00Z')).toBe('Kemarin');
  });

  it('counts whole days', () => {
    vi.setSystemTime(now);
    expect(timeAgo('2026-09-24T08:00:00Z')).toBe('3 hari lalu');
  });

  it('returns "Baru" for a null date', () => {
    expect(timeAgo(null)).toBe('Baru');
  });
});

describe('formatDate', () => {
  it('formats an ISO string', () => {
    expect(formatDate('2026-09-27T00:00:00Z')).toContain('2026');
  });

  it('returns a dash for null/undefined', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });
});

describe('getSiteUrl', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it('prefers NEXT_PUBLIC_APP_URL', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ilunifteunpak.vercel.app/';
    const { getSiteUrl: fresh } = await import('@/lib/utils');
    // Trailing slash must be stripped so `${getSiteUrl()}/reset-password` is valid.
    expect(fresh()).toBe('https://ilunifteunpak.vercel.app');
  });

  it('falls back to the Vercel host, not localhost', async () => {
    // Regression guard: an unset APP_URL must never send reset emails to
    // http://localhost:3000 in production.
    process.env.NEXT_PUBLIC_VERCEL_URL = 'my-app-abc123.vercel.app';
    const { getSiteUrl: fresh } = await import('@/lib/utils');
    expect(fresh()).toBe('https://my-app-abc123.vercel.app');
  });

  it('still yields localhost when nothing is configured', async () => {
    const { getSiteUrl: fresh } = await import('@/lib/utils');
    expect(fresh()).toBe('http://localhost:3000');
  });
});
