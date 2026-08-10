## Deskripsi

<!-- Jelaskan secara ringkas tujuan perubahan ini. Sertakan nomor issue yang direferensikan, mis. "Fixes #42". -->

## Jenis Perubahan

- [ ] 🐛 Bug fix
- [ ] ✨ Fitur baru
- [ ] 🔧 Refactor / perbaikan kode
- [ ] 📝 Dokumentasi
- [ ] ⚙️ CI / build / dependensi
- [ ] 🗄️ Perubahan database (migrasi Supabase)

## Checklist

- [ ] Kode mengikuti standar proyek (Clean Code, TypeScript strict)
- [ ] `npx tsc --noEmit` lolos tanpa error
- [ ] `bun run lint` lolos
- [ ] `bun run build` berhasil
- [ ] Perubahan database disertakan sebagai migrasi di `supabase/migrations/` **dan** disinkronkan ke `schema.sql` + `apply-all.sql`
- [ ] Tidak ada kredensial/secret yang ter-commit
- [ ] Dokumentasi terkait diperbarui (README / User Manual di branch `docs`)
- [ ] Branch sudah di-rebase dari `main` terbaru

## Cara Pengujian

<!-- Langkah-langkah untuk menguji perubahan ini. -->

1.
2.
3.

## Screenshot (opsional)

<!-- Seret & lepas screenshot sebelum/sesudah jika relevan. -->

## Catatan Tambahan

<!-- Informasi lain yang perlu diketahui reviewer. -->
