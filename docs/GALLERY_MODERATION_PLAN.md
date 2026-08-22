# Gallery Moderation Plan

[Overview]
Tambahkan alur moderasi foto galeri: upload masuk antrian **pending**, tampil publik setelah admin menyetujui (**pre-moderasi**), dan admin tetap bisa menyembunyikan foto aktif kapan saja (**pasca-moderasi**). Reject/delete bersifat **soft delete** (`status = 'hidden'`) sehingga tersembunyi dari front end, dan **hanya super admin** yang dapat melihat keseluruhan history termasuk foto tersembunyi serta memulihkan/menghapus permanen.

Model status (keputusan user: "1 dan 2" — pre + pasca-moderasi):

```
upload ──▶ pending ──(admin: Setujui)──▶ active ──(admin: Sembunyikan)──▶ hidden
                │                                                      ▲
                └────────────(admin: Tolak)────────────────────────────┘
hidden ──(super admin: Pulihkan)──▶ active
hidden ──(super admin: Hapus permanen)──▶ baris + file storage dihapus
```

Konteks kode saat ini: `event_gallery` belum punya kolom status; upload langsung publik (`public_read_event_gallery USING(true)`); satu-satunya moderasi adalah hard delete via RPC `admin_delete_gallery_photo`; policy `admin_bypass_event_gallery FOR ALL USING(is_admin())` membuat SEMUA admin bisa SELECT semua baris — harus dipecah agar history tersembunyi hanya untuk super admin. Pola yang sudah ada dipakai sebagai acuan: soft-hide jobs/announcements (`status` column + hide/restore actions) dan pre-moderasi skills (pending → approve/reject).

[Types]
Single sentence describing the type system changes: tambah union status galeri dan perbarui tipe baris galeri.

```ts
// lib/types.ts
export type GalleryStatus = 'pending' | 'active' | 'hidden';

export type EventGalleryRow = {
  id: string;
  event_id: string | null;
  alumni_id: string;
  foto_url: string | null;
  caption: string | null;
  status: GalleryStatus;
  created_at?: string;
};
```

Aturan status:
- `pending`: baru diunggah, menunggu moderasi; TIDAK tampil publik; terlihat oleh pemilik & admin `moderate_gallery`.
- `active`: disetujui; tampil publik.
- `hidden`: soft delete (hasil tolak/sembunyikan); TIDAK tampil publik; terlihat oleh pemilik & super admin saja.

[Files]
Single sentence describing file modifications: satu migrasi baru + mirror SQL, aksi galeri diperluas, halaman moderasi & galeri disesuaikan, tipe/konstanta diperbarui.

New files:
- `supabase/migrations/0018_gallery_moderation.sql`:
  ```sql
  -- Helper super admin (SECURITY DEFINER, aman untuk anon -> false)
  CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = ''
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'super_admin'
    );
  $$;

  -- Kolom status: baris lama otomatis 'active', upload baru default 'pending'
  ALTER TABLE public.event_gallery ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  ALTER TABLE public.event_gallery ALTER COLUMN status SET DEFAULT 'pending';
  ALTER TABLE public.event_gallery ADD CONSTRAINT event_gallery_status_check
    CHECK (status IN ('pending', 'active', 'hidden'));
  CREATE INDEX IF NOT EXISTS idx_event_gallery_status
    ON public.event_gallery (status, created_at DESC);

  -- SELECT tercakup: publik hanya active; pemilik lihat miliknya;
  -- admin moderate_gallery lihat pending; super admin lihat SEMUA (history)
  DROP POLICY IF EXISTS "public_read_event_gallery" ON public.event_gallery;
  CREATE POLICY "gallery_select_scoped"
    ON public.event_gallery FOR SELECT
    USING (
      status = 'active'
      OR alumni_id = auth.uid()
      OR (public.has_admin_capability('moderate_gallery') AND status = 'pending')
      OR public.is_super_admin()
    );

  -- INSERT pemilik wajib pending (anti-bypass moderasi dari klien)
  DROP POLICY IF EXISTS "auth_upload_event_photos" ON public.event_gallery;
  CREATE POLICY "auth_upload_event_photos"
    ON public.event_gallery FOR INSERT
    WITH CHECK (alumni_id = auth.uid() AND status = 'pending');

  -- Pecah bypass FOR ALL menjadi tulis-saja agar admin biasa tidak
  -- bisa SELECT history tersembunyi di level database
  DROP POLICY IF EXISTS "admin_bypass_event_gallery" ON public.event_gallery;
  CREATE POLICY "admin_insert_event_gallery"
    ON public.event_gallery FOR INSERT WITH CHECK (is_admin());
  CREATE POLICY "admin_update_event_gallery"
    ON public.event_gallery FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
  CREATE POLICY "admin_delete_event_gallery"
    ON public.event_gallery FOR DELETE USING (is_admin());
  ```
- Mirror perubahan ke `supabase/schema.sql` (definisi tabel 2.15 + bagian policy 5.15 + bagian 6) dan `supabase/apply-all.sql`.

Modified files:
- `app/actions/gallery.ts` — ubah `addGalleryPhotoAction` (insert `status: 'pending'`, pesan "menunggu moderasi") + tambah 5 aksi moderasi (lihat [Functions]).
- `app/admin/moderation/page.tsx` — `GalleryRow` + query tambah `status`; seksi Galeri: urutkan pending dulu, tombol per status (Setujui/Tolak untuk pending, Sembunyikan untuk active, Pulihkan/Hapus-permanen untuk hidden — dua terakhir hanya super admin), chip status.
- `app/galeri/page.tsx` / `app/galeri/GalleryView.tsx` — chip "Menunggu moderasi" pada foto milik sendiri yang masih pending (query sudah `select('*')`).
- `app/galeri/PhotoUploadForm.tsx` — pesan sukses: "Foto terkirim dan menunggu persetujuan admin."
- `lib/types.ts` — `GalleryStatus` + `EventGalleryRow`.
- `lib/constants.ts` — perbarui komentar capability `moderate_gallery` (setujui/tolak/sembunyikan foto).

Tidak ada file dihapus. RPC `admin_delete_gallery_photo` TETAP ada (dipakai hapus permanen super admin).

[Functions]
Single sentence describing function modifications: satu aksi diubah, lima aksi baru di `app/actions/gallery.ts`.

Modified functions:
- `addGalleryPhotoAction(_prevState, formData)` di `app/actions/gallery.ts` — insert dengan `status: 'pending'` eksplisit; pesan sukses menjadi "Foto terkirim dan menunggu persetujuan admin."; tetap revalidate `/galeri`.

New functions (semua di `app/actions/gallery.ts`, pola `requireCapability` + `logActivity` seperti `moderation.ts`):
- `approveGalleryPhotoAction(_prevState, formData)` — capability `moderate_gallery`; validasi baris ber-status `pending`; update `status='active'`; log `approve_gallery_photo`; revalidate `/galeri`, `/admin/moderation`.
- `rejectGalleryPhotoAction(_prevState, formData)` — capability `moderate_gallery`; `pending → hidden` (soft delete); log `reject_gallery_photo`.
- `hideGalleryPhotoAction(_prevState, formData)` — capability `moderate_gallery`; `active → hidden` (pasca-moderasi); log `hide_gallery_photo`.
- `restoreGalleryPhotoAction(_prevState, formData)` — **hanya super admin** (cek `isSuperAdmin(user)`, bukan capability); `hidden → active`; log `restore_gallery_photo`.
- `deleteGalleryPhotoAction(_prevState, formData)` — **ubah gate dari `moderate_gallery` menjadi super admin saja**; tetap panggil RPC `admin_delete_gallery_photo` (hapus baris + file storage secara permanen); log `delete_gallery_photo`.

Guard umum: setiap aksi memvalidasi `photo_id`, dan update selalu menyertakan `.eq('id', photoId)` plus guard status asal (mis. approve hanya jika status='pending') agar idempotent dan tidak melompati alur.

Removed functions: tidak ada.

[Classes]
Single sentence describing class modifications: tidak ada — pola function components & server functions saja.

[Dependencies]
Single sentence describing dependency modifications: tidak ada paket baru.

[Testing]
Single sentence describing testing approach: uji RLS di level DB via psql, alur UI manual, lint/build, dan sync checker.

1. DB (psql, transaksi rollback):
   - Anon `SELECT` → hanya `active`.
   - Pemilik `SELECT` → miliknya termasuk pending/hidden.
   - Admin `moderate_gallery` → active + pending, TIDAK melihat hidden.
   - Super admin → semua baris.
   - INSERT pemilik dengan `status='active'` → DITOLAK policy (wajib pending).
2. UI manual:
   - Upload sebagai alumni → muncul chip "Menunggu moderasi" di galeri milik sendiri; tidak terlihat di jendela anon/incognito.
   - `/admin/moderation` tab Galeri: pending muncul dengan tombol Setujui/Tolak; setelah approve tampil publik.
   - Sembunyikan foto aktif → hilang dari publik; admin biasa tidak melihatnya lagi di daftar moderasi; super admin melihatnya dengan tombol Pulihkan/Hapus permanen.
   - Hapus permanen (super admin) → baris hilang + file storage terhapus.
3. Statik: `npm run lint` && `npm run build` lolos.
4. Sinkronisasi: `bash scripts/check-supabase-sync.sh` IDENTICAL setelah mirror SQL.

[Implementation Order]
Single sentence describing the implementation sequence: database dulu, lalu server actions, UI admin, UI publik, verifikasi.

1. Buat `supabase/migrations/0018_gallery_moderation.sql`; mirror ke `schema.sql` & `apply-all.sql`.
2. Terapkan ke server: `psql "$DATABASE_URL" -f supabase/migrations/0018_gallery_moderation.sql`; jalankan `scripts/check-supabase-sync.sh`.
3. Perbarui `app/actions/gallery.ts` (ubah add + 5 aksi baru).
4. Perbarui `app/admin/moderation/page.tsx` (query + tombol per status + flag super admin).
5. Perbarui `app/galeri/*` (chip pending, pesan upload).
6. Perbarui `lib/types.ts` & komentar `lib/constants.ts`.
7. `npm run lint && npm run build`.
8. Uji matriks [Testing] + cek ulang Supabase logs.