---
title: Ringkasan Panel Admin
version: 1.0.0
last_updated: 2026-08-10
pdf_export: true
---

# Ringkasan Panel Admin

## Pendahuluan

Panel Admin adalah pusat pengelolaan platform ILUNI FT ELEKTRO UNPAK. Melalui panel ini, admin dapat mengelola pengguna, data alumni, memoderasi konten, dan melakukan impor/ekspor data. Modul ini menjelaskan cara mengakses panel dan peran yang terlibat.

## Mengakses Panel Admin

1. Masuk dengan akun yang memiliki peran **admin** atau **super_admin**.
2. Klik menu **Admin** pada navigasi.
3. Anda akan diarahkan ke **Dasbor Admin**.

::: warning Hak Akses
- Halaman `/admin` hanya dapat diakses oleh pengguna dengan peran `admin` atau `super_admin`.
- Halaman **Kelola Pengguna** (`/admin/users`) dan **Log Aktivitas** (`/admin/audit`) hanya dapat diakses oleh **super_admin**.
- Pengguna biasa yang mencoba membuka halaman admin akan diarahkan kembali ke beranda.
:::

## Peran Admin

### Super Admin

Super admin memiliki **seluruh kemampuan** pengelolaan tanpa terkecuali, termasuk:

- Mengelola pengguna (menetapkan admin, menonaktifkan akun).
- Mengelola data alumni.
- Memoderasi seluruh jenis konten.
- Melakukan impor/ekspor data.
- Melihat log aktivitas.

### Admin (Delegasi)

Admin biasa memiliki kemampuan sesuai yang diberikan **super admin** saat promosi. Kemampuan yang tersedia:

| Kemampuan | Fungsi |
| --- | --- |
| `manage_users` | Promosi/demosi admin dan penonaktifan akun (praktiknya khusus super admin). |
| `manage_alumni` | Mengubah/menghapus data alumni dan verifikasi massal. |
| `moderate_jobs` | Menghapus/menutup lowongan. |
| `moderate_announcements` | Menghapus pengumuman. |
| `moderate_polls` | Menghapus/menutup polling. |
| `moderate_groups` | Menghapus grup atau mengeluarkan anggota. |
| `moderate_gallery` | Menghapus foto galeri beserta berkasnya. |
| `moderate_reports` | Menyelesaikan/menolak laporan komunitas. |
| `view_audit` | Membaca log aktivitas admin. |
| `import_export` | Impor/ekspor data CSV. |

Saat seorang pengguna dipromosikan menjadi **admin**, secara otomatis diberikan semua kemampuan **kecuali** `manage_users`. Super admin dapat menyesuaikan kemampuan tersebut kapan saja.

## Struktur Panel Admin

| Modul | Fungsi | Halaman |
| --- | --- | --- |
| **Dasbor** | Ringkasan statistik dan aktivitas. | `/admin` |
| **Kelola Pengguna** | Promosi/demosi admin, penonaktifan akun. | `/admin/users` |
| **Kelola Alumni** | Verifikasi dan pengelolaan data alumni. | `/admin/alumni` |
| **Moderasi Konten** | Peninjauan laporan dan konten. | `/admin/moderation` |
| **Impor & Ekspor** | Import/ekspor data CSV. | `/api/admin/import` dan `/api/admin/export` |

## Log Aktivitas

Super admin dapat melihat **log aktivitas** yang mencatat tindakan admin (misalnya perubahan peran, verifikasi alumni, atau penghapusan konten). Log ini berguna untuk audit dan pengawasan.

## Prinsip Pengelolaan

- **Prinsip kebutuhan minimum**: berikan kemampuan admin sesuai kebutuhan tugasnya.
- **Verifikasi data**: pastikan data alumni valid sebelum diverifikasi.
- **Moderasi yang adil**: tinjau setiap laporan secara objektif.

Lanjutkan ke [Kelola Pengguna](/latest/admin/pengguna) untuk panduan mengelola akun pengguna.
