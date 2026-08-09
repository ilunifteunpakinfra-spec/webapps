---
title: Moderasi Konten
version: 1.0.0
last_updated: 2026-08-10
pdf_export: true
---

# Moderasi Konten

## Pendahuluan

Modul **Moderasi Konten** adalah tempat admin meninjau **laporan** dari pengguna dan menindaklanjuti konten yang melanggar aturan komunitas. Admin juga dapat memoderasi konten secara langsung berdasarkan jenisnya.

## Meninjau Laporan

1. Masuk dengan akun yang memiliki kemampuan `moderate_reports`.
2. Buka menu **Admin**, lalu pilih **Moderasi Konten**.
3. Daftar laporan ditampilkan dengan informasi:
   - Jenis konten yang dilaporkan (lowongan, pengumuman, polling, grup, galeri, atau profil).
   - Alasan pelaporan.
   - Status laporan.

### Menindaklanjuti Laporan

1. Buka detail laporan.
2. Tinjau konten yang dilaporkan.
3. Pilih tindakan:
   - **Tindaklanjuti**: konten dianggap melanggar; hapus konten atau ambil tindakan lain (misalnya menonaktifkan pengguna).
   - **Selesaikan**: konten dinilai aman dan laporan ditutup.
   - **Tolak**: laporan dianggap tidak valid.
4. Klik **Simpan** untuk memperbarui status laporan.

## Memoderasi Konten Berdasarkan Jenis

### Lowongan (`moderate_jobs`)

- Hapus lowongan yang tidak valid, palsu, atau melanggar aturan.
- Tutup lowongan yang sudah tidak relevan.

### Pengumuman (`moderate_announcements`)

- Hapus pengumuman yang berisi informasi menyesatkan atau tidak pantas.

### Polling (`moderate_polls`)

- Hapus atau tutup polling yang provokatif atau melanggar aturan.

### Grup (`moderate_groups`)

- Hapus grup yang melanggar aturan.
- Keluarkan anggota yang berperilaku tidak pantas.

### Galeri (`moderate_gallery`)

- Hapus foto yang tidak pantas atau melanggar privasi. Penghapusan juga menghilangkan berkas foto dari penyimpanan.

## Status Laporan

| Status | Keterangan |
| --- | --- |
| **Baru** | Laporan masuk dan belum ditinjau. |
| **Ditindaklanjuti** | Konten dianggap melanggar dan telah diambil tindakan. |
| **Selesai** | Laporan ditinjau dan konten dinilai aman. |
| **Ditolak** | Laporan dianggap tidak valid. |

## Prinsip Moderasi

- Tinjau setiap laporan secara **objektif** dan berdasarkan aturan komunitas.
- Gunakan **prinsip hak akses minimum** — setiap admin hanya memoderasi jenis konten sesuai kemampuannya.
- Catat keputusan penting agar dapat diaudit melalui **log aktivitas**.

Lanjutkan ke [Impor & Ekspor CSV](/latest/admin/impor-ekspor) untuk pengelolaan data massal.
