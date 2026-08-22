# Database Query Reference

Panduan query yang BENAR untuk introspeksi database Supabase proyek ini.
Dibuat setelah 3 error muncul di Supabase logs (2026-08-22, kode `42702`,
`42703`, `42P01`) — semuanya berasal dari query ad-hoc eksternal
(Studio SQL Editor / psql manual / BI tool), **bukan** dari kode aplikasi.

## 1. Melihat RLS Policies — gunakan `pg_policies`, BUKAN `storage.policies`

Tabel `storage.policies` **tidak ada** dan memang tidak pernah ada di Supabase.
Schema `storage` hanya berisi: `objects`, `buckets`, `buckets_analytics`,
`buckets_vectors`, `migrations`, `s3_multipart_uploads`,
`s3_multipart_uploads_parts`, `vector_indexes`.

```sql
-- ✅ BENAR: semua policies (public + storage)
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;

-- ❌ SALAH: relation "storage.policies" does not exist (42P01)
SELECT * FROM storage.policies;
```

Alternatif katalog inti: `pg_catalog.pg_policy` (join dengan `pg_class`
untuk nama tabel).

## 2. Hindari `oid` Ambiguous (42702)

Kolom sistem `oid` ada di banyak tabel katalog (`pg_class`, `pg_type`,
`pg_namespace`, dll.). Saat join dua tabel katalog, **selalu alias dan
kualifikasi kolom**:

```sql
-- ✅ BENAR: kolom dikualifikasi dengan alias
SELECT c.relname, t.typname
FROM pg_class c
JOIN pg_type t ON t.oid = c.reltype;

-- ❌ SALAH: column reference "oid" is ambiguous (42702)
SELECT relname, typname FROM pg_class JOIN pg_type ON oid = oid;
```

Catatan: tabel aplikasi kita (`public.*`) tidak menggunakan kolom `oid`;
error ini hanya relevan untuk query katalog sistem.

## 3. Tidak Ada Kolom `executed_at` (42703)

Tidak ada kolom bernama `executed_at` di schema manapun pada proyek ini.
Gunakan kolom timestamp yang benar:

| Kebutuhan | Kolom yang benar |
|---|---|
| Waktu dibuat baris | `created_at` |
| Update terakhir profil alumni | `updated_at` (tabel `alumni`) |
| Riwayat migrasi storage | `storage.migrations` (kolom: `id`, `name`, `hash`) |

```sql
-- ✅ BENAR
SELECT created_at FROM public.alumni ORDER BY created_at DESC LIMIT 5;
```

## 4. Query Introspeksi Berguna Lainnya

```sql
-- Struktur tabel alumni
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'alumni'
ORDER BY ordinal_position;

-- Daftar indeks
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';

-- Daftar fungsi custom
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
```

## 5. Verifikasi Sinkronisasi Lokal vs Server

Gunakan script bawaan repo:

```bash
bash scripts/check-supabase-sync.sh
```

Script ini membandingkan nama policy RLS antara file SQL lokal
(`supabase/schema.sql`, `supabase/storage-policies.sql`,
`supabase/migrations/*.sql`) dan server live via `pg_policies`.