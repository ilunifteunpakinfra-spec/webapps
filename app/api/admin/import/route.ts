import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/supabase/user';
import { NextResponse } from 'next/server';
import { IMPORT_COLUMNS } from '@/lib/csv-import';

type ImportRow = {
  nama: string;
  angkatan: string | null;
  tahun_lulus: number;
  pekerjaan: string | null;
  perusahaan: string | null;
  email: string;
  no_telepon: string | null;
  status_open_to_work: boolean;
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

/** Parse a human-friendly boolean cell; empty counts as false, invalid returns null. */
function parseBooleanCell(raw: string): boolean | null {
  const value = raw.trim().toLowerCase();
  if (value === '' || ['false', '0', 'tidak', 't', 'no'].includes(value)) return false;
  if (['true', '1', 'ya', 'y', 'yes'].includes(value)) return true;
  return null;
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
    const openToWork = parseBooleanCell(get('status_open_to_work'));

    if (!nama || !email) {
      errors.push(`Baris ${lineNumber}: nama dan email wajib diisi.`);
      return;
    }
    if (!Number.isInteger(tahunRaw) || tahunRaw < 1950 || tahunRaw > new Date().getFullYear() + 1) {
      errors.push(`Baris ${lineNumber}: tahun_lulus tidak valid (${get('tahun_lulus')}).`);
      return;
    }
    if (openToWork === null) {
      errors.push(
        `Baris ${lineNumber}: status_open_to_work tidak valid (${get('status_open_to_work')}). Gunakan true/false, ya/tidak, atau 1/0.`
      );
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
      status_open_to_work: openToWork,
    });
  });

  if (data.length === 0) {
    return NextResponse.json(
      { error: `Tidak ada baris valid untuk diimpor. ${errors.join(' ')}` },
      { status: 400 }
    );
  }

  // Upsert by unique email so re-importing refreshes existing profiles.
  // `status_verifikasi` dan `created_at` dikelola database: baris baru otomatis
  // status_verifikasi=false dan created_at = tanggal & waktu import.
  //
  // Baris BARU wajib `visibilitas = 'public'` agar alumni hasil import langsung
  // tampil di dashboard publik (sama seperti pendaftaran mandiri). Baris yang
  // SUDAH ADA tidak disentuh `visibilitas`-nya — pilihan privasi pengguna
  // (alumni_only/private) tetap dipertahankan saat re-import.
  const emails = data.map((row) => row.email);
  const { data: existingRows } = await supabase
    .from('alumni')
    .select('email')
    .in('email', emails);
  const existingEmails = new Set((existingRows ?? []).map((row) => row.email));

  const newRows = data
    .filter((row) => !existingEmails.has(row.email))
    .map((row) => ({ ...row, visibilitas: 'public' as const }));
  const updateRows = data.filter((row) => existingEmails.has(row.email));

  let error: { message: string } | null = null;

  if (newRows.length > 0) {
    const { error: insertError } = await supabase
      .from('alumni')
      .upsert(newRows, { onConflict: 'email' });
    error = insertError;
  }

  if (!error && updateRows.length > 0) {
    const { error: updateError } = await supabase
      .from('alumni')
      .upsert(updateRows, { onConflict: 'email' });
    error = updateError;
  }

  if (error) {
    return NextResponse.json({ error: `Gagal menyimpan: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    imported: data.length,
    skipped: errors.length,
    errors: errors.slice(0, 5),
  });
}
