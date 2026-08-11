// ============================================
// ILUNI FTE WebApps - Filter Value Normalization
// ============================================
// Normalisasi nilai dropdown filter (kota & pekerjaan) DI TAMPILAN,
// tanpa mengubah data mentah di database (histori data tetap utuh).

/** Akronim yang wajib tetap huruf besar saat title-case. */
const ACRONYMS = new Set([
  'IT',
  'SPV',
  'TL',
  'QA',
  'HSE',
  'AK3',
  'PNS',
  'ASN',
  'MEP',
  'IPTV',
  'OTT',
  'PT',
  'CV',
  'OF',
  'PJK3',
  'FTE',
  'UNPAK',
  'HRD',
  'GA',
  'HVAC',
  'PLC',
  'SCADA',
  'BMS',
  'SOP',
  'ME',
  'UI',
  'UX',
  'FM',
  'DKI',
  'DIY',
]);

/** Kata kunci / pola yang menandakan nilai kota sebenarnya alamat (bukan kota). */
const ADDRESS_PATTERN =
  /\b(jl\.?|jalan|no\.?|nomor|kel\.?|kelurahan|kec\.?|kecamatan|rt\.?|rw\.?|desa|perum(?:ahan)?|komplek(?:s)?|blok|gg\.?|gang|dusun)\b|\d|,/i;

/** Placeholder nilai pekerjaan yang tidak diisi (mis. "-"). */
const EMPTY_PLACEHOLDER = /^[-–—.]+$/;

/**
 * Ubah nilai menjadi title-case yang sadar akronim.
 * Contoh: "ELEKTRIKAL & ELEKTRONIK ENGINEER" -> "Elektrikal & Elektronik Engineer",
 * "technical support engineer" -> "Technical Support Engineer", "IT Support" tetap.
 */
export function titleCaseLabel(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((token) => {
      // Akronim (IT, HSE, PT, ...) wajib tetap huruf besar.
      const upper = token.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      // Token bertanda "/" (mis. "Elektrikal/Elektronik"): title-case tiap bagian.
      if (token.includes('/')) {
        return token
          .split('/')
          .map((part) => {
            if (!part) return part;
            const partUpper = part.toUpperCase();
            if (ACRONYMS.has(partUpper)) return partUpper;
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('/');
      }
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Normalisasi nilai kota untuk dropdown:
 * - trim & ratakan spasi
 * - buang bagian "- <provinsi>" (mis. "Medan - Sumatera Utara" -> "Medan")
 * - buang prefiks redundan "Kota"/"Kabupaten"/"Kab." (mis. "Kota Bogor" -> "Bogor")
 * - title-case
 * Mengembalikan null untuk nilai yang bukan kota (alamat) — nilainya tetap ada
 * di database, hanya tidak ditampilkan sebagai opsi filter (masuk daftar audit).
 */
export function normalizeKota(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (!value || ADDRESS_PATTERN.test(value)) return null;

  const city = value.split(' - ')[0].trim();
  const cleaned = city.replace(/^(kota|kabupaten|kab\.?)\s+/i, '').trim();
  if (!cleaned) return null;

  return titleCaseLabel(cleaned);
}

/**
 * Normalisasi nilai pekerjaan untuk dropdown: trim, ratakan spasi, title-case.
 * Mengembalikan null untuk placeholder kosong (mis. "-").
 * Nilai yang mencurigakan (mis. nama perusahaan di kolom jabatan) tetap tampil
 * tapi dicatat di daftar audit — tidak dihapus otomatis.
 */
export function normalizePekerjaan(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, ' ');
  if (!value || EMPTY_PLACEHOLDER.test(value)) return null;
  return titleCaseLabel(value);
}

export type FilterOptionRow = { field: string; value: string; jumlah: number };

/**
 * Gabungkan opsi filter dengan nilai yang ternormalisasi: nilai mentah yang
 * sama setelah normalisasi di-merge (jumlah dijumlahkan) dan diurutkan alfabetis.
 */
export function buildNormalizedOptions(
  rows: FilterOptionRow[],
  field: 'kota' | 'pekerjaan'
): { value: string; jumlah: number }[] {
  const merged = new Map<string, number>();
  for (const row of rows) {
    if (row.field !== field) continue;
    const normalized =
      field === 'kota' ? normalizeKota(row.value) : normalizePekerjaan(row.value);
    if (!normalized) continue;
    merged.set(normalized, (merged.get(normalized) ?? 0) + row.jumlah);
  }
  return [...merged.entries()]
    .map(([value, jumlah]) => ({ value, jumlah }))
    .sort((a, b) => a.value.localeCompare(b.value));
}
