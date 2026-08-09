---
title: Kelola Alumni
version: 1.0.0
last_updated: 2026-08-10
pdf_export: true
---

# Kelola Alumni

## Pendahuluan

Modul **Kelola Alumni** memungkinkan admin (dengan kemampuan `manage_alumni`) mengelola data alumni, termasuk **memverifikasi profil**, **mengubah data**, dan **menghapus akun** apabila diperlukan.

## Membuka Halaman Kelola Alumni

1. Masuk dengan akun yang memiliki kemampuan `manage_alumni` (admin atau super admin).
2. Buka menu **Admin**, lalu pilih **Kelola Alumni**.
3. Daftar alumni ditampilkan beserta status verifikasi masing-masing.

## Memverifikasi Profil Alumni

Verifikasi menandakan bahwa data profil alumni telah diperiksa dan dianggap valid. Alumni terverifikasi mendapatkan hak tambahan, yaitu **membuat lowongan** dan **membuat pengumuman**.

### Memverifikasi Satu Alumni

1. Pada daftar alumni, cari alumni yang akan diverifikasi.
2. Periksa kelengkapan dan kebenaran datanya.
3. Klik tombol **Verifikasi**.
4. Status alumni berubah menjadi **Terverifikasi**.

### Verifikasi Massal (Bulk)

1. Centang beberapa alumni pada daftar.
2. Klik tombol **Verifikasi Massal**.
3. Konfirmasi tindakan.
4. Seluruh alumni terpilih langsung terverifikasi.

::: warning Kehati-hatian
Verifikasi massal hanya boleh dilakukan jika **seluruh data terpilih** sudah dipastikan valid, misalnya setelah impor CSV dari sumber terpercaya.
:::

## Mengubah Data Alumni

1. Pada daftar alumni, klik tombol **Ubah** pada alumni yang dituju.
2. Perbarui data yang diperlukan (nama, angkatan, pekerjaan, perusahaan, kontak, dan lain-lain).
3. Klik **Simpan**.

## Menghapus Akun Alumni

Penghapusan akun bersifat permanen dan menghilangkan data pengguna beserta konten terkaitnya.

1. Pada daftar alumni, klik tombol **Hapus**.
2. Konfirmasi penghapusan dengan teliti.
3. Akun dan data alumni dihapus dari sistem.

::: danger Hati-hati
Tindakan **menghapus akun tidak dapat dibatalkan**. Pastikan benar-benar diperlukan, misalnya atas permintaan pengguna sendiri atau pelanggaran berat.
:::

## Status Alumni

| Status | Keterangan |
| --- | --- |
| **Belum Terverifikasi** | Profil terdaftar tetapi belum diperiksa admin. |
| **Terverifikasi** | Profil telah diperiksa dan dianggap valid; dapat membuat lowongan dan pengumuman. |

## Tips Pengelolaan

- Lakukan verifikasi setelah memeriksa data pada sumber resmi (misalnya data angkatan).
- Gunakan impor CSV untuk pendataan awal, lalu verifikasi massal setelah data tervalidasi.
- Tangani penghapusan akun dengan prosedur yang jelas dan terdokumentasi.

Lanjutkan ke [Moderasi Konten](/latest/admin/moderasi) untuk meninjau laporan komunitas.
