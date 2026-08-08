import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';

const IMPORT_COLUMNS = [
  'nama',
  'angkatan',
  'tahun_lulus',
  'pekerjaan',
  'perusahaan',
  'email',
  'no_telepon',
  'alamat_tinggal',
] as const;

type ImportRow = {
  nama: string;
  angkatan: string | null;
  tahun_lulus: number;
  pekerjaan: string | null;
  perusahaan: string | null;
  email: string;
  no_telepon: string | null;
  alamat_tinggal: string | null;
};

/**
 * Minimal RFC-4180-ish CSV parser (handles quoted cells and escaped quotes).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

/** Bulk import alumni from CSV. Only admin users (RLS bypass) can import. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File CSV tidak ditemukan.' }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: 'File CSV kosong.' }, { status: 400 });
  }

  const header = rows[0].map((value) => value.trim().toLowerCase());
  const missingColumns = IMPORT_COLUMNS.filter((col) => !header.includes(col));
  if (missingColumns.length > 0) {
    return NextResponse.json(
      { error: `Kolom wajib tidak ditemukan: ${missingColumns.join(', ')}` },
      { status: 400 }
    );
  }

  const indexOf = (col: string) => header.indexOf(col);

  const data: ImportRow[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((row, rowIndex) => {
    const lineNumber = rowIndex + 2;
    const get = (col: string) => (row[indexOf(col)] ?? '').trim();

    const nama = get('nama');
    const email = get('email');
    const tahunRaw = Number(get('tahun_lulus'));

    if (!nama || !email) {
      errors.push(`Baris ${lineNumber}: nama dan email wajib diisi.`);
      return;
    }
    if (!Number.isInteger(tahunRaw) || tahunRaw < 1950 || tahunRaw > new Date().getFullYear() + 1) {
      errors.push(`Baris ${lineNumber}: tahun_lulus tidak valid (${get('tahun_lulus')}).`);
      return;
    }

    data.push({
      nama,
      angkatan: get('angkatan') || null,
      tahun_lulus: tahunRaw,
      pekerjaan: get('pekerjaan') || null,
      perusahaan: get('perusahaan') || null,
      email,
      no_telepon: get('no_telepon') || null,
      alamat_tinggal: get('alamat_tinggal') || null,
    });
  });

  if (data.length === 0) {
    return NextResponse.json(
      { error: `Tidak ada baris valid untuk diimpor. ${errors.join(' ')}` },
      { status: 400 }
    );
  }

  // Upsert by unique email so re-importing refreshes existing profiles.
  const { error } = await supabase
    .from('alumni')
    .upsert(data, { onConflict: 'email' });

  if (error) {
    return NextResponse.json({ error: `Gagal menyimpan: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    imported: data.length,
    skipped: errors.length,
    errors: errors.slice(0, 5),
  });
}
