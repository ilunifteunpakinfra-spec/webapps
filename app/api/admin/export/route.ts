import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';

const CSV_COLUMNS = [
  'nama',
  'angkatan',
  'tahun_lulus',
  'pekerjaan',
  'perusahaan',
  'email',
  'no_telepon',
  'status_open_to_work',
  'status_verifikasi',
  'created_at',
] as const;

/** Export the full alumni directory as CSV (admin only). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: alumni, error } = await supabase
    .from('alumni')
    .select(CSV_COLUMNS.join(', '))
    .order('nama');

  if (error || !alumni) {
    return NextResponse.json({ error: 'Gagal mengambil data alumni' }, { status: 500 });
  }

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = alumni.map((row) =>
    CSV_COLUMNS.map((col) => escapeCell(row[col as keyof typeof row])).join(',')
  );
  const csv = [CSV_COLUMNS.join(','), ...rows].join('\n');

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="alumni-fte-unpak.csv"',
    },
  });
}
