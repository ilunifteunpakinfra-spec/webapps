---
title: Kelola Pengguna
version: 1.0.0
last_updated: 2026-08-10
pdf_export: true
---

# Kelola Pengguna

## Pendahuluan

Modul **Kelola Pengguna** memungkinkan **super admin** mengelola akun pengguna, termasuk **mempromosikan pengguna menjadi admin**, **menyesuaikan kemampuan admin**, dan **menonaktifkan akun** yang melanggar aturan.

::: warning Hak Akses
Halaman ini (`/admin/users`) hanya dapat diakses oleh **super admin**. Admin biasa yang membuka halaman ini akan diarahkan ke dasbor admin.
:::

## Membuka Halaman Kelola Pengguna

1. Masuk dengan akun **super admin**.
2. Buka menu **Admin**, lalu pilih **Kelola Pengguna**.
3. Daftar pengguna ditampilkan beserta informasi email, nama, peran, dan status akun.

## Mempromosikan Pengguna Menjadi Admin

1. Pada daftar pengguna, cari pengguna yang ingin dipromosikan.
2. Klik tombol **Promosikan ke Admin**.
3. Sistem akan menetapkan peran `admin` dengan **kemampuan bawaan** (semua kemampuan kecuali `manage_users`).
4. Pengguna tersebut langsung dapat mengakses panel admin sesuai kemampuannya.

### Menyesuaikan Kemampuan Admin

1. Klik tombol **Kelola Kemampuan** pada baris pengguna berperan admin.
2. Centang atau hapus centang kemampuan yang diinginkan dari daftar:
   - `manage_alumni`
   - `moderate_jobs`
   - `moderate_announcements`
   - `moderate_polls`
   - `moderate_groups`
   - `moderate_gallery`
   - `moderate_reports`
   - `view_audit`
   - `import_export`
3. Klik **Simpan**.
4. Kemampuan admin langsung diperbarui.

::: tip Prinsip
Berikan hanya kemampuan yang dibutuhkan untuk tugas admin tersebut (prinsip hak akses minimum).
:::

## Menurunkan Admin Menjadi Pengguna Biasa

1. Pada daftar pengguna, cari admin yang ingin diturunkan.
2. Klik tombol **Turunkan ke Pengguna**.
3. Konfirmasi tindakan.
4. Peran pengguna kembali menjadi `alumni` dan tidak dapat lagi mengakses panel admin.

## Menonaktifkan Akun (Ban)

Akun dapat dinonaktifkan jika pengguna melanggar aturan komunitas.

1. Pada daftar pengguna, klik tombol **Nonaktifkan** pada pengguna yang dituju.
2. Konfirmasi penonaktifan.
3. Pengguna tidak dapat masuk ke aplikasi hingga akun diaktifkan kembali.

### Mengaktifkan Kembali Akun

1. Cari pengguna dengan status **nonaktif** pada daftar.
2. Klik tombol **Aktifkan Kembali**.
3. Akun pengguna kembali dapat digunakan.

## Melihat Log Aktivitas

1. Buka menu **Admin**, lalu pilih **Log Aktivitas** (`/admin/audit`).
2. Log menampilkan riwayat tindakan admin: perubahan peran, verifikasi alumni, penghapusan konten, dan lainnya.

## Tips Pengelolaan

- Promosikan admin hanya kepada pengguna yang dipercaya dan dikenal.
- Tinjau kembali kemampuan admin secara berkala.
- Dokumentasikan keputusan penonaktifan akun untuk keperluan audit.

Lanjutkan ke [Kelola Alumni](/latest/admin/alumni) untuk mengelola data dan verifikasi alumni.
