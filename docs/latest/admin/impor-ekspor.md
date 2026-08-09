---
title: Impor & Ekspor CSV
version: 1.0.0
last_updated: 2026-08-10
pdf_export: true
---

# Impor & Ekspor CSV

## Pendahuluan

Admin dengan kemampuan `import_export` dapat **mengekspor** data alumni ke berkas CSV dan **mengimpor** data alumni dalam jumlah banyak dari berkas CSV. Fitur ini berguna untuk pendataan awal dan pencadangan data.

## Mengekspor Data Alumni (CSV)

1. Masuk dengan akun yang memiliki kemampuan `import_export`.
2. Buka halaman **Admin**, lalu pilih menu **Ekspor CSV**.
3. Klik tombol **Ekspor**.
4. Berkas CSV berisi data alumni akan diunduh ke perangkat Anda.

Berkas hasil ekspor dapat dibuka dengan aplikasi pengolah lembar kerja (misalnya Microsoft Excel atau Google Sheets).

## Mengunduh Template Impor

Template impor adalah berkas CSV kosong yang hanya berisi baris judul kolom. Gunakan template ini agar format impor selalu benar.

1. Buka halaman **Impor CSV** pada panel admin.
2. Klik tombol **Unduh Template**.
3. Berkas `template.csv` akan diunduh.

## Format Template Impor

Template impor berisi **8 kolom** dengan urutan berikut (pemisah titik koma `;`):

| Kolom | Keterangan |
| --- | --- |
| `nama` | Nama lengkap alumni. |
| `angkatan` | Tahun angkatan (contoh `2015`). |
| `tahun_lulus` | Tahun kelulusan (contoh `2019`). |
| `pekerjaan` | Jabatan atau profesi saat ini. |
| `perusahaan` | Nama perusahaan tempat bekerja. |
| `email` | Alamat email alumni. |
| `no_telepon` | Nomor telepon. |
| `status_open_to_work` | Status terbuka terhadap tawaran kerja: `true` atau `false`. |

### Contoh Isi Template

```csv
nama;angkatan;tahun_lulus;pekerjaan;perusahaan;email;no_telepon;status_open_to_work
Budi Santoso;2015;2019;Electrical Engineer;PLN;budi@contoh.com;081234567890;true
Siti Aminah;2016;2020;Data Analyst;Telkom;siti@contoh.com;081298765432;false
```

::: warning Penting
- Gunakan **titik koma (`;`)** sebagai pemisah kolom, bukan koma.
- **Baris pertama** adalah judul kolom dan tidak akan diimpor sebagai data.
- Jangan menambahkan kolom lain di luar 8 kolom tersebut.
:::

## Mengimpor Data Alumni

### Menyiapkan Berkas

1. Unduh template impor.
2. Isi data alumni pada template menggunakan aplikasi pengolah lembar kerja.
3. Simpan berkas dalam format **CSV**.

### Melakukan Impor

1. Buka halaman **Impor CSV** pada panel admin.
2. Pilih berkas CSV yang sudah diisi.
3. Klik tombol **Impor**.
4. Tunggu hingga proses selesai; sistem menampilkan ringkasan hasil impor.

### Perilaku Saat Impor

- **Status verifikasi** setiap alumni diimpor otomatis menjadi **`false`** (belum terverifikasi).
- **Tanggal dibuat** (`created_at`) diisi otomatis dengan **waktu impor**.
- Alumni dengan email yang sudah terdaftar diperbarui datanya (atau ditandai sesuai aturan sistem).

## Penanganan Data Tidak Valid

Jika terdapat baris yang gagal diimpor (misalnya email tidak valid atau kolom kosong), sistem menampilkan daftar baris yang bermasalah beserta alasannya. Perbaiki baris tersebut pada berkas lalu impor ulang.

## Verifikasi Setelah Impor

Karena status verifikasi otomatis **belum terverifikasi**, lakukan langkah berikut:

1. Periksa hasil impor pada halaman **Kelola Alumni**.
2. Validasi kebenaran data.
3. Gunakan **Verifikasi Massal** untuk memverifikasi data yang sudah dipastikan valid.

Lanjutkan ke [Pemecahan Masalah](/latest/troubleshooting) untuk membantu mengatasi kendala umum.
