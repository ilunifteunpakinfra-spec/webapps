# Changelog

Semua perubahan penting pada proyek **ILUNI FT ELEKTRO UNPAK WebApps** dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan versioning mengikuti [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Added

- Pengajuan keahlian free-text oleh alumni dengan moderasi admin (status `pending` → `approved`/`rejected`)
  - Kolom `status`, `requested_by`, `requested_level` pada tabel `skills`
  - RPC `request_skill` dan `admin_approve_skill`
  - Capability admin baru: `moderate_skills`
- Opsi visibilitas profil **Pribadi** (khusus akun admin); non-admin memilih Publik atau Alumni

### Changed

- Halaman direktori/beranda menampilkan profil publik secara real-time dari Supabase (bukan data statis)

### Fixed

- Import CSV alumni: hanya kolom yang ditentukan (`nama;angkatan;tahun_lulus;pekerjaan;perusahaan;email;no_telepon;status_open_to_work`), verifikasi default `false`, `created_at` = waktu import
- Promote user ke admin gagal dengan "column unset not exist" — perbaikan pada alur `admin_set_role`

## [2.0.0] - 2026-08-10

### Added

- Platform lengkap: direktori alumni, skill & endorsement, mentoring, job board, referral, pengumuman, grup, polling, galeri event
- Admin dashboard dengan analitik
- Schema Supabase lengkap (15 tabel) dengan RLS
- User Manual VitePress + PDF di branch `docs`
- CI/CD: Vercel (production) + GitHub Pages (dokumentasi) + keep-alive Supabase

### Security

- RLS di semua tabel, role-based access control, verifikasi email wajib
