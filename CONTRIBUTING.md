# Pedoman Kontribusi

Terima kasih sudah ingin berkontribusi ke **ILUNI FT ELEKTRO UNPAK WebApps**! 🎉

Proyek ini dikelola oleh Ikatan Alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor. Dengan berkontribusi, Anda setuju untuk mengikuti [Kode Etik](CODE_OF_CONDUCT.md).

## Struktur Branch

| Branch | Tujuan | Mekanisme |
|---|---|---|
| `main` | Aplikasi produksi (Next.js + Supabase) | Vercel Git Integration (`https://ilunifteunpak.vercel.app`) |
| `docs` | User Manual VitePress + PDF | GitHub Pages via `.github/workflows/deploy-docs.yml` |

> **Penting:** Kode aplikasi & perubahan Supabase di-commit ke `main`. Perubahan dokumentasi user manual di-commit ke branch `docs`. Kedua branch sengaja **divergen** — jangan mencampur pekerjaan antar branch.

## Cara Berkontribusi

### 1. Laporkan Bug / Ajukan Fitur

- Gunakan template **Bug Report** atau **Feature Request** pada [GitHub Issues](https://github.com/ilunifteunpakinfra-spec/webapps/issues).
- Sertakan langkah reproduksi, hasil yang diharapkan vs aktual, dan (jika relevan) screenshot.
- Satu isu = satu masalah.

### 2. Persiapan Lingkungan

```bash
# 1. Clone repository
git clone https://github.com/ilunifteunpakinfra-spec/webapps.git
cd webapps

# 2. Setup dependensi & file .env
bun run setup

# 3. Isi kredensial di .env
nano .env

# 4. Jalankan development server
bun dev
```

Persyaratan: **Bun >= 1.3.14**, **Node.js >= 18**, akun Supabase, akun Vercel.

### 3. Buat Perubahan

```bash
git checkout main
git pull origin main
git checkout -b feat/nama-fitur-anda
```

Konvensi penamaan branch:

| Prefix | Untuk |
|---|---|
| `feat/` | Fitur baru |
| `fix/` | Perbaikan bug |
| `refactor/` | Refactor tanpa perubahan perilaku |
| `docs/` | Perubahan dokumentasi |
| `chore/` | Tugas pemeliharaan (deps, CI, dll.) |

### 4. Standar Kode

- Ikuti prinsip **Clean Code**: fungsi kecil & fokus, nama deskriptif, tanpa komentar berlebihan.
- Gunakan TypeScript strict — pastikan `npx tsc --noEmit` lolos tanpa error.
- Jangan commit file `.env`, `node_modules/`, `.next/`, atau artefak build (sudah di-`.gitignore`).
- Perubahan Supabase (schema/RLS) **selalu** disertakan sebagai migrasi di `supabase/migrations/NNNN_*.sql` **dan** disinkronkan ke `supabase/schema.sql` + `supabase/apply-all.sql`.
- Jangan pernah menjalankan `schema.sql`/`apply-all.sql` langsung ke database produksi — gunakan migrasi tambahan.

### 5. Commit

Gunakan [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(profile): tambah toggle open-to-work
fix(auth): perbaiki validasi email pada registrasi
docs(manual): tambah panduan modul mentoring
chore(deps): update dependensi keamanan
```

### 6. Kirim Pull Request

- Pastikan branch Anda up-to-date dengan `main`: `git pull --rebase origin main`.
- Isi template PR dengan lengkap (deskripsi, perubahan, cara tes).
- Tunggu CI (`typecheck-and-lint`) hijau sebelum di-merge.
- Setelah di-merge, Vercel akan otomatis deploy ke produksi.

## Menjalankan Verifikasi Lokal

```bash
bun run lint        # ESLint
bunx tsc --noEmit   # TypeScript typecheck
bun run build       # Production build (wajib lolos)
```

## Kontribusi Dokumentasi (Branch `docs`)

User Manual dikelola sebagai **Docs-as-Code** dengan VitePress:

```bash
git checkout docs
cd docs
npm ci
npm run dev        # preview http://localhost:5173
npm run build      # build statis
```

- Setiap halaman wajib memiliki frontmatter YAML (`title`, `version`, `last_updated`).
- Jaga hierarki heading semantik (jangan lompat `#` → `###`).
- Setelah perubahan, commit `docs(manual): ...` dan push — CI akan build & publish ke GitHub Pages.

## Butuh Bantuan?

Buka [SUPPORT.md](SUPPORT.md) atau buat issue baru di GitHub.
