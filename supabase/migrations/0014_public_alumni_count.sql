-- ============================================
-- 0014: Hitung total alumni terdaftar untuk direktori publik
-- RLS menyembunyikan profil alumni_only/private dari pengunjung anonim,
-- sehingga direktori menampilkan "X profil publik dari Y alumni terdaftar".
-- Fungsi ini hanya mengembalikan angka total (aggregate), bukan baris data,
-- sehingga tidak membocorkan profil yang tersembunyi.
-- ============================================
CREATE OR REPLACE FUNCTION public.count_alumni_total()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*) FROM public.alumni;
$$;

GRANT EXECUTE ON FUNCTION public.count_alumni_total() TO anon, authenticated;
