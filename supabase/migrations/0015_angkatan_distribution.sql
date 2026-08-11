-- ============================================
-- 0015: Distribusi angkatan untuk beranda publik
-- Jumlah alumni per angkatan adalah data agregat, bukan profil individual,
-- sehingga ditampilkan untuk SEMUA alumni terdaftar (tidak mengikuti RLS
-- visibilitas profil). Fungsi ini hanya mengembalikan pasangan (angkatan,
-- jumlah), bukan baris data alumni, sehingga tidak membocorkan profil.
-- ============================================
CREATE OR REPLACE FUNCTION public.get_angkatan_distribution()
RETURNS TABLE (angkatan text, jumlah bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.angkatan::text AS angkatan, count(*)::bigint AS jumlah
  FROM public.alumni a
  WHERE a.angkatan IS NOT NULL AND a.angkatan <> ''
  GROUP BY a.angkatan
  ORDER BY a.angkatan::int ASC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_angkatan_distribution() TO anon, authenticated;
