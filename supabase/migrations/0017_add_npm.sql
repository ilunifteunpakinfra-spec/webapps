-- ============================================
-- 0017: Tambah kolom NPM (Nomor Pokok Mahasiswa)
-- ============================================
-- NPM bersifat OPSIONAL (tidak wajib) pada biodata alumni.
-- - Nullable: data lama & pengguna yang tidak mengisi tetap valid.
-- - Validasi format di level aplikasi: digit saja, maks 20 karakter.
-- - Partial unique index: satu NPM tidak boleh dipakai dua akun,
--   namun kosong (NULL / string kosong) diperbolehkan.

ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS npm TEXT;

COMMENT ON COLUMN public.alumni.npm IS 'Nomor Pokok Mahasiswa (opsional, digit saja)';

CREATE UNIQUE INDEX IF NOT EXISTS alumni_npm_unique_idx
  ON public.alumni (npm) WHERE npm IS NOT NULL AND npm <> '';