-- ============================================
-- 0016: Opsi filter pencarian publik & statistik agregat
-- Dropdown filter (angkatan/pekerjaan/kota) dan angka agregat di beranda
-- mengikuti SEMUA alumni terdaftar, bukan hanya profil public.
-- Fungsi hanya mengembalikan agregat (field, value, jumlah) — bukan baris
-- data alumni — sehingga tidak membocorkan profil yang tersembunyi.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_filter_options()
RETURNS TABLE (field text, value text, jumlah bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 'angkatan', a.angkatan::text, count(*)::bigint
  FROM public.alumni a
  WHERE a.angkatan IS NOT NULL AND btrim(a.angkatan) <> ''
  GROUP BY a.angkatan
  UNION ALL
  SELECT 'pekerjaan', btrim(a.pekerjaan), count(*)::bigint
  FROM public.alumni a
  WHERE a.pekerjaan IS NOT NULL AND btrim(a.pekerjaan) <> ''
  GROUP BY btrim(a.pekerjaan)
  UNION ALL
  SELECT 'kota', btrim(a.alamat_tinggal), count(*)::bigint
  FROM public.alumni a
  WHERE a.alamat_tinggal IS NOT NULL AND btrim(a.alamat_tinggal) <> ''
  GROUP BY btrim(a.alamat_tinggal);
$$;

GRANT EXECUTE ON FUNCTION public.get_filter_options() TO anon, authenticated;
