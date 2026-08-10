# Kebijakan Keamanan

## Versi yang Didukung

| Versi | Dukungan |
|---|---|
| Production (`main` / Vercel) | ✅ Didukung penuh |
| Branch `docs` | ✅ Didukung (dokumentasi saja) |
| Branch lain / development | ⚠️ Tidak didukung |

## Melaporkan Kerentanan

**JANGAN membuat Issue publik** untuk masalah keamanan. Gunakan salah satu saluran berikut:

1. **GitHub Private Vulnerability Reporting** (direkomendasikan):
   Buka halaman repo → *Security* → *Report a vulnerability*.
2. **Email:** `iluni.fte.unpak@gmail.com` — sertakan:
   - Deskripsi kerentanan dan dampaknya
   - Langkah reproduksi (jika ada)
   - Versi/commit yang terpengaruh
   - Saran mitigasi (jika ada)

Kami berkomitmen untuk merespons dalam **72 jam** dan menangani laporan secara rahasia hingga diperbaiki.

## Ruang Lingkup

Yang termasuk dalam ruang lingkup:

- Aplikasi web `https://ilunifteunpak.vercel.app`
- Konfigurasi Supabase (PostgreSQL, Auth, Storage, RLS)
- Workflow CI/CD (`.github/workflows/`)
- Skrip deployment (`scripts/`)

Yang **di luar** ruang lingkup (jangan laporkan di sini):

- Kerentanan pada dependensi pihak ketiga yang belum dieksploitasi di aplikasi ini — laporkan langsung ke vendor masing-masing
- Masalah lingkungan lokal pengembang tanpa dampak produksi

## Praktik Keamanan yang Diterapkan

- **Row Level Security (RLS)** di semua tabel Supabase — akses data dibatasi berdasarkan peran
- **Service role key** hanya digunakan server-side, tidak pernah terekspos ke browser
- **Kredensial** tersimpan di environment variables (`.env`), tidak pernah di-commit
- **Verifikasi email** wajib pada registrasi
- **Role-based access control** (super_admin / admin / alumni) dengan capability whitelist
- **Compression & validasi ukuran** file sebelum upload (foto profil, resume, galeri)
- **Dependabot** aktif untuk pemantauan dependensi (lihat `.github/dependabot.yml`)

## Proses Perbaikan

1. Laporan diterima & diklasifikasikan (severity, dampak)
2. Fix dikembangkan di branch terpisah dengan migrasi database tambahan bila diperlukan
3. Diuji (typecheck, lint, build, uji RLS)
4. Di-deploy ke produksi dan diumumkan ke pengelola
