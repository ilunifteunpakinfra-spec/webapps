---
title: Tentang Aplikasi
version: 1.0.0
last_updated: 2026-08-10
pdf_export: true
---

# Tentang Aplikasi

## Deskripsi Umum

**ILUNI FT ELEKTRO UNPAK** adalah platform database alumni sekaligus wadah jejaring (networking) untuk **Ikatan Alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor**. Aplikasi ini mempertemukan para alumni lintas angkatan untuk:

- Saling terhubung melalui **direktori alumni** yang dapat dicari.
- Membagikan **lowongan kerja** dan memanfaatkan **sistem referral**.
- Mengikuti **program mentoring** antara alumni senior dan junior.
- Berdiskusi dalam **komunitas & grup** beserta forum diskusinya.
- Berinteraksi melalui **pengumuman**, **polling**, dan **galeri kegiatan**.
- Berkontribusi dan bersaing sehat di **peringkat kontribusi**.

## Fitur Utama

### Akun dan Profil

- Pendaftaran dengan email dan kata sandi, dilanjutkan verifikasi email.
- Profil alumni lengkap: data diri, pekerjaan, perusahaan, keahlian (skills), dan angkatan.
- Unggah **foto profil** dan **resume (PDF maksimal 2 MB)**.
- Toggle **Open to Work** untuk menampilkan ketersediaan menerima tawaran kerja.

### Jejaring Alumni

- **Direktori alumni** dengan pencarian dan filter (nama, angkatan, pekerjaan, perusahaan, keahlian).
- **Komunitas & grup** berdasarkan angkatan atau minat, dilengkapi **forum diskusi** berisi thread dan balasan.
- **Sistem referral** untuk meminta rekomendasi ke alumni di perusahaan tujuan.

### Peluang dan Pengembangan

- **Lowongan kerja** yang diunggah alumni terverifikasi, dapat disaring berdasarkan keahlian.
- **Program mentoring** dengan alur permintaan `pending → diterima → selesai`.

### Interaksi Komunitas

- **Pengumuman** dalam kategori pencapaian, lowongan, event, dan umum.
- **Polling** dengan aturan satu suara per pengguna.
- **Galeri kegiatan** untuk berbagi dokumentasi acara.
- **Peringkat kontribusi** berdasarkan skor kontribusi anggota.

### Moderasi dan Pengelolaan

- **Pelaporan konten** untuk menjaga kenyamanan komunitas.
- **Panel admin** untuk pengelolaan pengguna, data alumni, moderasi, serta impor/ekspor data CSV.

## Teknologi yang Digunakan

- **Framework**: Next.js (App Router)
- **Database & Autentikasi**: Supabase (PostgreSQL dengan Row Level Security)
- **Gaya**: Tailwind CSS

## Cara Mengakses

### Melalui Peramban

Aplikasi dapat diakses melalui alamat berikut:

- **Produksi (Vercel)**: `https://ilunifteunpak.vercel.app`
- **Lingkungan pengembangan lokal**: `http://localhost:3000` (setelah menjalankan `bun dev`)

### Dokumen Panduan Ini

Panduan ini disusun per modul. Gunakan menu navigasi di sisi kiri untuk berpindah antarmodul, atau tombol **Cari** di bagian atas untuk mencari topik tertentu.

::: tip Unduhan PDF
Versi lengkap panduan ini dapat diunduh dalam satu berkas PDF melalui tautan berikut:

[Unduh Manual Lengkap (PDF)](/webapps/pdfs/manual-latest.pdf)
:::

## Peran Pengguna

| Peran | Deskripsi |
| --- | --- |
| **Alumni (terdaftar)** | Pengguna yang sudah mendaftar dan memverifikasi email. Dapat mengisi profil, bergabung dengan grup, membuat polling, dan lain-lain. |
| **Alumni terverifikasi** | Alumni yang profilnya diverifikasi oleh admin. Memiliki hak membuat lowongan dan pengumuman. |
| **Admin** | Pengelola dengan kemampuan tertentu (misalnya moderasi konten, kelola data alumni) sesuai yang diberikan super admin. |
| **Super Admin** | Pengelola penuh. Dapat mengelola pengguna, menetapkan admin, dan mengakses seluruh modul moderasi. |

## Struktur Panduan

| Modul | Halaman |
| --- | --- |
| Panduan Pengguna | Memulai, Profil, Direktori, Lowongan, Mentoring, Referral, Grup, Pengumuman, Polling, Galeri, Peringkat, Melaporkan Konten |
| Panduan Admin | Kelola Pengguna, Kelola Alumni, Moderasi Konten, Impor & Ekspor CSV |
| Lainnya | Pemecahan Masalah |

Lanjutkan ke halaman [Memulai](/latest/mulai) untuk panduan pendaftaran dan masuk.
