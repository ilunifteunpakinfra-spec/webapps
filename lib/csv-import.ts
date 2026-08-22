// ============================================
// ILUNI FTE WebApps - CSV Import Column Contract
// ============================================
// Kolom yang diterima oleh POST /api/admin/import. Template unduhan
// (/api/admin/import/template) memakai daftar yang sama agar tidak terjadi
// selisih antara format template dan parser. Kolom lain (status_verifikasi,
// created_at, dll.) dikelola otomatis oleh database.

export const IMPORT_COLUMNS = [
  'nama',
  'angkatan',
  'npm',
  'tahun_lulus',
  'pekerjaan',
  'perusahaan',
  'email',
  'no_telepon',
  'status_open_to_work',
] as const;
