# Implementation Plan

[Overview]
Add an optional `npm` (Nomor Pokok Mahasiswa) field to the Alumni biodata across the full stack — database, types, self-service profile, admin management, and CSV import/export — and remediate three Postgres errors found in Supabase logs (`42702` ambiguous `oid`, `42703` missing `executed_at`, `42P01` missing `storage.policies`) by documenting correct catalog queries and verifying no application impact.

Scope & context. ILUNI FTE WebApps is a Next.js 15 (App Router) + Supabase application. The `alumni` table currently has no student-ID column. Investigation confirmed:

1. **Log errors are external, not from app code.** A repo-wide grep found zero references to `storage.policies`, `executed_at`, or unqualified `oid` in any TS/TSX/SQL/SH/MD file. The live `storage` schema contains only `buckets`, `buckets_analytics`, `buckets_vectors`, `migrations`, `objects`, `s3_multipart_uploads`, `s3_multipart_uploads_parts`, `vector_indexes` — there is genuinely no `storage.policies` table (RLS policies live in the `pg_policies` catalog view). Failed queries are not recorded in `pg_stat_statements`, so the offending statements cannot be recovered post-hoc. Conclusion: the three errors came from ad-hoc/external queries (Supabase Studio SQL editor, manual psql, or a BI tool) around 10:47–10:49 WIB on 2026-08-22. They are benign for the application; remediation = reference documentation + recurrence monitoring, no code change.
2. **User decision:** NPM is **optional** (tidak wajib). Defaults retained: unique across accounts via partial unique index (empty allowed), visible/editable only by profile owner and admin (not shown publicly), not collected at registration (`/daftar`).

High-level approach: one additive migration (`0017_add_npm.sql`) + mirror edits to canonical SQL files, a shared validation helper, then wire the field through the four existing surfaces (self profile form/action, admin modal/action/page, CSV import/export). No RLS policy changes are needed — existing policies (`owner_update_own_profile`, `admin_bypass_alumni`) already cover new columns because Supabase grants operate at table level.

[Types]
Single sentence describing the type system changes: add nullable `npm: string | null` to the two alumni row types and the CSV import row type, plus a shared normalizer return shape.

```ts
// lib/types.ts — added fields
export type AlumniRow = {
  // ...existing fields...
  npm: string | null;        // Nomor Pokok Mahasiswa; optional, digits only
};

export type AlumniAdminRow = {
  // ...existing fields...
  npm: string | null;
};

// app/api/admin/import/route.ts — extended row type
type ImportRow = {
  // ...existing fields...
  npm: string | null;
};
```

Validation rules (enforced in DB + app):
- Nullable; empty/whitespace input normalizes to `NULL`.
- If present: digits only, length 1–20 (`/^\d{1,20}$/`). Rejects letters, spaces, dashes.
- Uniqueness: partial unique index on non-empty values only.
- Shared helper return shape:

```ts
// lib/normalize.ts
export type NormalizedNpm = { value: string | null; error: string | null };
export function normalizeNpm(raw: string): NormalizedNpm;
```

[Files]
Single sentence describing file modifications: two new files (migration + docs) and twelve modified files wiring `npm` through every surface.

New files:
- `supabase/migrations/0017_add_npm.sql` — additive migration:
  ```sql
  -- 0017: Tambah kolom NPM (Nomor Pokok Mahasiswa) pada biodata alumni.
  ALTER TABLE public.alumni ADD COLUMN IF NOT EXISTS npm TEXT;
  COMMENT ON COLUMN public.alumni.npm IS 'Nomor Pokok Mahasiswa (opsional, digit saja)';
  -- Satu NPM tidak boleh dipakai dua akun; kosong diperbolehkan (data lama).
  CREATE UNIQUE INDEX IF NOT EXISTS alumni_npm_unique_idx
    ON public.alumni (npm) WHERE npm IS NOT NULL AND npm <> '';
  ```
- `docs/DATABASE_QUERY_REFERENCE.md` — correct introspection queries to prevent recurrence of the three logged errors:
  - Policies: query `pg_policies` (e.g. `select schemaname, tablename, policyname from pg_policies where schemaname='public';`) — never `storage.policies`.
  - Always qualify ambiguous columns in joins over catalogs that expose system `oid` columns (use aliases: `c.relname`, `t.typname`).
  - There is no `executed_at` column anywhere in this project's schema; use `created_at`.

Modified files:
- `supabase/schema.sql` — add `npm TEXT,` to `CREATE TABLE alumni` (after `angkatan`) and append the same partial unique index statement near other indexes.
- `supabase/apply-all.sql` — mirror the same two additions so fresh installs match migration state.
- `lib/types.ts` — add `npm: string | null;` to `AlumniRow` and `AlumniAdminRow`.
- `lib/normalize.ts` — add `normalizeNpm()` helper (see [Functions]); update the file header comment from "Filter Value Normalization" to also cover input-field normalization.
- `lib/csv-import.ts` — add `'npm'` to `IMPORT_COLUMNS`.
- `app/actions/alumni.ts` — `updateProfileAction`: parse + validate `npm`, include in update payload.
- `app/profil/edit/ProfileForm.tsx` — add optional "NPM" text input (`inputMode="numeric"`, placeholder "cth. 2020113123") in the grid next to Angkatan/Tahun Lulus.
- `app/actions/alumni-admin.ts` — `updateAlumniAdminAction`: parse + validate `npm`, include in update payload and in `logActivity` detail.
- `app/admin/alumni/page.tsx` — add `npm` to the `.select(...)` column list and to the `.or(...)` search pattern (`npm.ilike.${pattern}`).
- `app/admin/alumni/EditAlumniModal.tsx` — add optional NPM input bound to `row.npm`.
- `app/api/admin/import/route.ts` — extend `ImportRow`, read `get('npm')`, validate via `normalizeNpm`, push error lines for invalid values, include `npm` in data rows.
- `app/api/admin/export/route.ts` — add `'npm'` to `CSV_COLUMNS` (after `'angkatan'`).

Explicitly NOT modified (verified during planning):
- `app/api/admin/import/template/route.ts` — derives its CSV header from `IMPORT_COLUMNS`, so adding `'npm'` there automatically updates the downloadable template; no code change required.
- `app/admin/alumni/AlumniTable.tsx` — NPM is intentionally NOT added as a table column (minimal scope); admins view/edit it via `EditAlumniModal` and can search by it. Optional future enhancement: add an "NPM" `<th>` column next to "Angkatan".
- `app/profil/[id]/page.tsx`, `components/AlumniCard.tsx`, `/daftar` registration flow — public display and registration collection are non-goals per user decision.

No files deleted or moved. No configuration changes.

[Functions]
Single sentence describing function modifications: one new shared validator, four modified server handlers, one modified page query.

New functions:
- `normalizeNpm(raw: string): { value: string | null; error: string | null }` in `lib/normalize.ts`. Purpose: single source of truth for optional-NPM parsing (trim → empty→null → digits-only 1–20 check → Indonesian error message `'NPM hanya boleh berisi angka (maks. 20 digit).'`). Keeps each caller under the 30-line function guideline.

Modified functions:
- `updateProfileAction(_prevState, formData)` in `app/actions/alumni.ts` — read `formData.get('npm')`, run `normalizeNpm`, return its error early, add `npm: normalized.value` to the `.update({...})` payload.
- `updateAlumniAdminAction(_prevState, formData)` in `app/actions/alumni-admin.ts` — same normalization; add `npm` to update payload; include `npm: normalized.value` in the `logActivity(supabase, 'update_alumni', ...)` detail object.
- `POST(request)` in `app/api/admin/import/route.ts` — per-row: `const npmResult = normalizeNpm(get('npm')); if (npmResult.error) { errors.push(\`Baris ${lineNumber}: ${npmResult.error}\`); return; }` then include `npm: npmResult.value` in the pushed row. Note: duplicate non-empty NPMs across rows will fail at upsert time with the unique-index violation; surface as `Gagal menyimpan: ...` (acceptable; message includes PG detail).
- `GET()` in `app/api/admin/export/route.ts` — no logic change beyond the constant array addition (select + header + cells derive from `CSV_COLUMNS`).
- Default page component in `app/admin/alumni/page.tsx` — extend select string and `.or()` filter as listed above.

Unchanged (explicitly): `ensureAlumniProfile` in `app/actions/alumni.ts` (no registration NPM), all RLS policies, all RPCs.

Removed functions: none.

[Classes]
Single sentence describing class modifications: none — the codebase uses React function components and plain TypeScript functions only; no classes exist or are introduced.

[Dependencies]
Single sentence describing dependency modifications: none — no new packages; the feature uses existing `@supabase/supabase-js`, Next.js server actions, and PostgreSQL built-ins.

[Testing]
Single sentence describing testing approach: static checks (lint + build), database-level assertions via psql, end-to-end manual flows, and the existing sync checker script.

1. Static: `npm run lint` and `npm run build` must pass with zero errors.
2. Database (after applying migration):
   - `\d public.alumni` shows `npm | text`.
   - `select indexdef from pg_indexes where indexname='alumni_npm_unique_idx';` exists.
   - Duplicate guard: `insert` two profiles with same non-empty NPM → second fails; both with `NULL` → both succeed.
3. Manual UI flows:
   - `/profil/edit`: save with empty NPM → success, stored NULL; save `2020113123` → persisted; save `abc` → inline error, no write.
   - `/admin/alumni`: edit modal shows/persists NPM; table search by NPM returns the row.
   - CSV import: template now includes `npm`; import row with invalid NPM reports `Baris N: NPM hanya boleh berisi angka`; valid import persists.
   - CSV export: header includes `npm`, values exported.
4. Sync: `bash scripts/check-supabase-sync.sh` still reports tables/functions/policies identical (column additions don't affect it, but confirms no drift).
5. Log errors: re-check Supabase logs 24h after deploy; expect zero new occurrences of the three codes from app traffic (they never came from the app); if they recur, capture source via `pg_stat_activity` sampling or a log drain.

[Implementation Order]
Single sentence describing the implementation sequence: database first, shared contract second, then each consumer surface, docs, and finally verification.

1. Create `supabase/migrations/0017_add_npm.sql` (column + comment + partial unique index).
2. Mirror into `supabase/schema.sql` and `supabase/apply-all.sql`.
3. Apply to server: `npm run deploy:supabase` (or `psql "$DATABASE_URL" -f supabase/migrations/0017_add_npm.sql`); verify with `bash scripts/check-supabase-sync.sh` and the psql assertions in [Testing].
4. Add `normalizeNpm()` to `lib/normalize.ts`; add `npm` fields to `lib/types.ts`; add `'npm'` to `IMPORT_COLUMNS` in `lib/csv-import.ts`.
5. Wire self-service: `updateProfileAction` in `app/actions/alumni.ts`, then the NPM input in `app/profil/edit/ProfileForm.tsx`.
6. Wire admin: `updateAlumniAdminAction` in `app/actions/alumni-admin.ts`, select/search in `app/admin/alumni/page.tsx`, input in `EditAlumniModal.tsx`.
7. Wire CSV: import route row handling, export route column list.
8. Create `docs/DATABASE_QUERY_REFERENCE.md` (log-error remediation).
9. Run `npm run lint && npm run build`; fix any findings.
10. Execute manual test matrix from [Testing]; re-check Supabase logs for recurrence.