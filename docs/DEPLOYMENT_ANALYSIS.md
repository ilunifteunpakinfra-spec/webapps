# Deployment Analysis Report: ILUNI FTE WebApps

> **Scope:** Production deployment readiness assessment for the ILUNI FT ELEKTRO UNPAK alumni platform (Next.js 14 App Router + Supabase).
> **Method:** Systematic review following the code-review checklist (functionality, security, performance, maintainability, testing), plus live verification of build, types, dependency audit, and deploy scripts.
> **Date:** 2026-08-05 · **Version:** 1.0.0

---

## Executive Summary

**Overall Deployment Readiness: ✅ 90% — live at `https://ilunifteunpak.vercel.app`; remaining items are config/housekeeping (auth URLs, GitHub secrets, key rotation).**

The application itself is **build-verified and feature-complete**: `bunx tsc --noEmit` passes, `bun run build` produces all 27 routes on **Next.js 15.5.23 + React 19**, all BRD v3.0 features from `CROSS_CHECK_ANALYSIS.md` are implemented (auth, directory, profile/upload, jobs, skills/endorsements, mentoring, referrals, groups, polls, announcements, event gallery, leaderboard, admin import/export), and RLS policies exist for every table.

| Area                                              | Status                                                             | Blocker?                             |
| --------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| Application build & types                         | ✅ Verified (27/27 routes, Next 15.5.23)                          | —                                   |
| Database schema + RLS                             | ✅ Applied & verified live (15 tables, 6 enums, RLS on all)       | —                                   |
| Migrations pipeline                               | ✅ `supabase/migrations/0001_init.sql` exists; schema applied     | —                                   |
| Storage buckets (`avatars`, `resumes`, `gallery`) | ✅ Created via REST + policies applied                            | —                                   |
| Supabase Auth URL configuration                   | ⚠️ Must be set in dashboard (email flows)                        | 🟡 (email confirmation/reset)      |
| GitHub Actions keep-alive                         | ⚠️ Workflow exists; secrets unconfigured                         | 🟡                                   |
| Dependency vulnerabilities                        | ✅ **0 advisories** (Next 14→15.5.23 upgrade + overrides)          | —                                   |
| Deploy scripts                                    | ⚠️ 3 defects found (see §4.2)                                    | 🟡                                   |
| Automated tests                                   | ❌ None in repo                                                    | 🟡 (manual QA plan provided)       |

---

## 1. Pre-Deployment Checklist (Blocking Items First)

### 🔴 1.1 Database Migration Pipeline (BLOCKER)

**Finding:** `scripts/deploy-supabase.sh` runs `supabase db push --project-ref ...`, which pushes local migration files from `supabase/migrations/`. **This directory does not exist** — the schema lives only in `supabase/schema.sql`. The push will either fail ("no migrations found") or deploy nothing.

**Fix (choose one):**

- **Option A (recommended):** Convert to a proper migration:
  ```bash
  mkdir -p supabase/migrations
  cp supabase/schema.sql supabase/migrations/0001_init.sql
  # Then re-run on every schema change: create numbered migration files
  ```

  ⚠️ `schema.sql` is **not idempotent** (plain `CREATE TABLE` without `IF NOT EXISTS`). Once applied, never re-run the same migration; always add new numbered migrations.
- **Option B:** Skip the CLI; apply `schema.sql` once via **Supabase Dashboard → SQL Editor**. Simpler for a one-time setup, but you lose migration history.

### 🔴 1.2 Storage Buckets + Policies (BLOCKER)

**Finding:** The app uploads files client-side with the anon key to three buckets: `avatars` (profile photos), `resumes` (PDF, ≤2MB), `gallery` (event photos, compressed client-side to 1280px JPEG). **No script creates these buckets or their policies** — they must be configured in the Supabase Dashboard.

**Required setup (Dashboard → Storage):**


| Bucket    | Visibility                   | Policies                                                                                                                                                         |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `avatars` | **Public**                   | `SELECT` public; `INSERT`/`UPDATE`/`DELETE` for `authenticated` where `bucket_id = 'avatars'` and `(storage.foldername(name))[1] = auth.uid()::text`             |
| `resumes` | **Private** (no public read) | `INSERT`/`UPDATE` for `authenticated` where folder = own uid. Resume is only shown as a status badge today; add a signed-URL route before making it downloadable |
| `gallery` | **Public**                   | `SELECT` public; `INSERT` for `authenticated` where folder = own uid                                                                                             |

> The folder-prefix policy (`[1] = auth.uid()`) is the server-side guard that keeps users from overwriting other people's files. The `event_gallery` table RLS (`alumni_id = auth.uid()`) already prevents row spoofing.

### 🔴 1.3 Supabase Auth URL Configuration (BLOCKER for email flows)

**Finding:** `lib/utils.ts` `getSiteUrl()` reads `NEXT_PUBLIC_APP_URL` and falls back to `http://localhost:3000`. It is used for:

- Registration confirmation emails (`emailRedirectTo` → `/auth/callback?next=/profil/edit`)
- Password reset emails (`redirectTo` → `/reset-password`)

**Required setup (Dashboard → Authentication → URL Configuration):**

- **Site URL:** `https://<production-domain>` (not localhost!)
- **Redirect URLs:** add `https://<production-domain>/**` (keep `http://localhost:3000/**` for local dev)
- Set `NEXT_PUBLIC_APP_URL=https://<production-domain>` in the Vercel project (see §2).

If this is wrong, users clicking confirmation/reset links get redirected to localhost or see "unable to redirect" errors.

### 🟡 1.4 GitHub Secrets for Keep-Alive Workflow

**Finding:** `.github/workflows/keep-alive.yml` references `secrets.SUPABASE_URL` and `secrets.SUPABASE_ANON_KEY`. These do not exist until added to **Settings → Secrets and variables → Actions**:


| Secret              | Value                               |
| --------------------- | ------------------------------------- |
| `SUPABASE_URL`      | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | the project's anon key              |

Without them every scheduled run fails (3-day cadence, intended to prevent free-tier auto-pause).

---

## 2. Environment Configuration

### 2.1 Required Variables


| Variable                               | Used by                        | Runtime     | Value                                      |
| ---------------------------------------- | -------------------------------- | ------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | App (client + server clients)  | ✅ Vercel   | `https://<ref>.supabase.co`                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | App                            | ✅ Vercel   | anon (public) key                          |
| `NEXT_PUBLIC_APP_URL`                  | Email redirects (`getSiteUrl`) | ✅ Vercel   | `https://<production-domain>`              |
| `SUPABASE_SERVICE_ROLE_KEY`            | `scripts/create-admin.sh` only | ❌ local    | service role key —**never** add to Vercel |
| `SUPABASE_ACCESS_TOKEN`                | `scripts/deploy-supabase.sh`   | ❌ local/CI | Supabase personal token                    |
| `SUPABASE_PROJECT_ID`                  | deploy scripts                 | ❌ local/CI | project ref                                |
| `VERCEL_API_TOKEN`                     | `scripts/deploy-vercel.sh`     | ❌ local/CI | Vercel token                               |
| `VERCEL_PROJECT_ID` / `VERCEL_TEAM_ID` | deploy scripts                 | ❌ local/CI | Vercel project/team                        |

### 2.2 Verification Findings

- ✅ `.gitignore` excludes `.env` / `.env.*` while keeping `.env.example` (verified).
- ✅ No hardcoded secrets found in source (grep for `sk_live`/`service_role`/JWT-prefix patterns: clean).
- ⚠️ The app only needs the **anon key** at runtime; the service role key is used solely by the local admin-creation script. Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel environment variables.

---

## 3. Supabase Setup Runbook

1. Create project (free tier OK).
2. **Apply schema** (§1.1 — migration or SQL Editor).
3. **Create storage buckets + policies** (§1.2).
4. **Configure Auth URLs** (§1.3). Optionally customize confirmation email sender/template.
5. **Create the first admin** (local, after `.env` is populated):
   ```bash
   bash scripts/create-admin.sh
   ```

   The script creates the user via the Admin API with `user_metadata.role = super_admin|admin`. The app's `ensureAlumniProfile` creates the `alumni` row on first login, so no manual row is needed.
6. **Seed skills** are part of `schema.sql` (`INSERT INTO skills ...`), so they arrive with the schema.
7. **Manual QA in Supabase:** confirm RLS works — anonymous reads only see `visibilitas='public'` profiles; non-owners cannot update rows.

---

## 4. Vercel Deployment

### 4.1 Project Settings

- **Framework preset:** Next.js (auto-detected).
- **Install command:** `bun install` (Bun runtime supported by Vercel; `bun.lock` is committed). Node 18+ fallback also works via `package-lock.json`.
- **Build command:** `bun run build` (verified passing: 27/27 routes).
- **Environment variables:** the three `NEXT_PUBLIC_*` from §2.1.
- **Optional:** custom domain under Vercel → Domains.

### 4.2 Deploy Script Defects (found during review)


| # | File                                            | Defect                                                                                                                                                                                 | Impact                                                                                                   | Fix                                                                                       |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1 | `scripts/deploy-vercel.sh`                      | `bun run build` (plain `next build`) followed by `vercel deploy --prebuilt`. `--prebuilt` expects `.vercel/output` produced by `vercel build`, so the build artifact is wrong/missing. | Deploy may fail or ship a stale build                                                                    | Either drop`--prebuilt` (let Vercel build), or run `vercel build` instead of `next build` |
| 2 | `scripts/deploy-vercel.sh`, `scripts/deploy.sh` | Echo lines reference`$vercel_team_id` (lowercase, undefined) | Cosmetic — team link prints empty | Use `$VERCEL_TEAM_ID`                                                              |                                                                                                          |                                                                                           |
| 3 | `scripts/deploy-supabase.sh`                    | Link check tests`.supabase/config.toml` (leading dot) — the Supabase CLI creates `supabase/config.toml` + `supabase/.temp/project-ref`                                                | The check never matches, so`supabase link` re-runs every deploy (works, but noisy and network-dependent) | Test for`supabase/.temp/project-ref` or `supabase/config.toml`                            |

> None of these block a **manual** Vercel deploy (git push + Vercel build) — they only affect the local `bun run deploy` scripts.

---

## 5. Security Review

> Follows the code-review-checklist security section.

### 5.1 Input Validation — ✅ Good

- Server actions validate: email format, password ≥ 6 chars, `tahun_lulus` range (1960+), poll option count (≥ 2), announcement category against enum, referral/mentoring IDs.
- CSV import validates per-row (`nama`/`email` required, `tahun_lulus` integer range) and returns line-level errors.
- ⚠️ Client-side upload checks (PDF type, ≤2MB, image compression) are UX guards — the real enforcement is the **storage policy** (§1.2). Ensure policies are configured, not just the client checks.

### 5.2 Injection & XSS — ✅ Good

- No raw SQL anywhere; all queries use the Supabase query builder (parameterized under the hood).
- React escapes user content by default; announcements render with `whitespace-pre-line` (no `dangerouslySetInnerHTML` found).
- `next.config.js` sets `reactStrictMode: true`; `images.remotePatterns` is permissive (`**`) but pages use plain `<img>` tags, so no image-optimizer SSRF surface.

### 5.3 Authentication & Authorization — ✅ Good

- Server components use `auth.getUser()` (JWT-verified), never `getSession()`.
- `middleware.ts` protects `/admin` (role-checked against `ADMIN_ROLES`) and all mutation routes (`/profil/edit`, `/lowongan/baru`, `/mentoring/daftar-mentor`, `/referral/baru`, `/grup/baru`, `/polling/baru`, `/pengumuman/baru`).
- Admin API routes (`/api/admin/import`, `/api/admin/export`) independently verify `isAdminUser` and return 401 (verified in source).
- RLS covers all 15 tables; verified-alumni gating for jobs/announcements enforced at the DB level; 1-vote-per-user enforced by unique constraint + RLS.

### 5.4 Secrets — ✅ Good (with one caution)

- No hardcoded secrets in source (grep verified). `.env` gitignored.
- ⚠️ `NEXT_PUBLIC_*` values are public by design — use the **anon key**, never the service role key, in Vercel env.

### 5.5 Dependency Vulnerabilities — ✅ RESOLVED (2026-08-08)

`bun audit` previously reported **27 advisories (12 high)** — all Next.js 14.x advisories (SSRF, Server-Components DoS, cache poisoning) plus vulnerable transitive `postcss`.

**Remediation applied and deployed to production:**

| Change                                  | From          | To            | Notes                                                                 |
| ----------------------------------------- | ---------------- | ---------------- | ----------------------------------------------------------------------- |
| `next`                                  | `14.2.35`      | `15.5.23`      | Async request APIs; all pages with `params`/`searchParams` converted to `Promise` props; `lib/supabase/server.ts` `createClient()` now `async` (`await cookies()`) with all 42 server call sites awaited; browser client unchanged |
| `react` / `react-dom`                   | `18.3.1`       | `19.2.8`       | Peer-compatible with Next 15; no code changes required                 |
| `@types/react` / `@types/react-dom`    | `18.3.x`       | `19.2.x`       |                                                                       |
| `@supabase/ssr`                         | `0.5.2`        | `0.12.4`       | Same `createServerClient`/`createBrowserClient` API; middleware unchanged |
| `postcss` (direct + transitive override) | `8.4.31` (nested) | `8.5.25`      | `package.json` `overrides` forces a single fixed copy for `next`/`autoprefixer`/`tailwindcss` |
| `sharp` (override via next optional)    | `0.34.x`       | `0.35.3`       | libvips CVE fix (GHSA-f88m-g3jw-g9cj)                                  |

**Result: `bun audit` → 0 vulnerabilities.** Both `bun.lock` and `package-lock.json` (regenerated with `npm install --package-lock-only`) are in sync — Vercel installs with npm, so both lockfiles must stay current.

**Notes for future upgrades:**
- Vercel builds with **npm** (package-lock.json wins over bun.lock). Keep both lockfiles in sync.
- npm `overrides` require the direct dependency spec to match the override spec (EOVERRIDE otherwise) — direct `postcss` is now `^8.5.25`.
- `next lint` is deprecated on 15.x and removed in 16 — plan to move to ESLint 9 flat config before a 16 upgrade.
- `lucide-react@0.454.0` left unchanged (no advisories; 1.x renames icons and would need a sweep).

### 5.6 Supabase Database Linter — Findings Resolved (2026-08-08)

The Supabase security linter reported **7 warnings**; 4 fixed in the database, 2 accepted as intentional, 1 requires a dashboard toggle.

| Lint | Status | Resolution |
| ----------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `function_search_path_mutable` ×2 (`is_admin`, `update_updated_at`) | ✅ FIXED | `SET search_path = ''` pinned on both functions; `auth.*` references fully qualified. Applied via migration `security_hardening_search_path_storage_listing` |
| `public_bucket_allows_listing` ×2 (`avatars`, `gallery`) | ✅ FIXED | Dropped `public_read_avatars` / `public_read_gallery` — public bucket URLs are CDN-served without RLS; the app never calls `storage.from(...).list()` (verified in source). Re-add a narrower policy if an in-app object listing feature is built later |
| `anon/authenticated_security_definer_function_executable` (`is_admin`) | ⚠️ ACCEPTED (intentional) | `is_admin()` must stay executable by `anon`+`authenticated` because 15 `admin_bypass_*` RLS policies call it for every role — revoking `EXECUTE` would break all public reads. It only returns the **caller's own** admin status (`auth.uid()`), which their JWT already carries; not an information leak. Optional future hardening: move to a `private` schema + recreate policies |
| `auth_leaked_password_protection` | 🔶 MANUAL | Dashboard → Authentication → enable **"Prevent use of leaked passwords"** (HaveIBeenPwned check) |

**Migration:** `security_hardening_search_path_storage_listing` applied to `db.zotizozgkzzuhrwbxoud.supabase.co`. Repo files synced: `supabase/schema.sql`, `supabase/migrations/0001_init.sql`, `supabase/apply-all.sql`, `supabase/storage-policies.sql`.

---

## 6. Performance Review


| Area                   | Assessment                                                                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-side pagination | ✅ Directory (12/page) and jobs (8/page) paginate server-side with`count: 'exact'`                                                                                                                                                                                   |
| Query optimization     | ✅ Indexes exist on all filter/sort columns (`nama`, `angkatan`, `perusahaan`, `pekerjaan`, `open_to_work`, `verifikasi`, `visibilitas`, `expired_at`, `kategori`, FKs)                                                                                              |
| Leaderboard            | ⚠️`/peringkat` aggregates full-table `select` of endorsements/jobs/polls/groups/announcements/gallery in JS. Fine at community scale (<10k rows), but should move to aggregate queries (`count(*) group by`) or cached `contribution_score` recomputation at scale |
| Images                 | ✅ Gallery uses`loading="lazy"` + client-side compression (1280px/0.85); avatars compressed to 512px                                                                                                                                                                 |
| Static optimization    | ✅ Home/admin/other pages are static (`○`) where dynamic data isn't needed; dynamic routes use `ƒ` (correct — Supabase reads). Note: pages consuming `searchParams` are now `ƒ` under Next 15 (per-request params)                                                   |
| N+1 queries            | ✅ Lists use joined selects (`alumni(nama)`) instead of per-row queries; polls fetch options/votes in bulk                                                                                                                                                           |

**Measured baseline — 2026-08-08, production (`https://ilunifteunpak.vercel.app`, Next 15.5.23):**

| Route        | Cold TTFB | Warm TTFB (×3)             | HTTP | Notes                                          |
| -------------- | ----------- | ---------------------------- | ------ | ------------------------------------------------- |
| `/`          | 2.50s     | 1.25s / 1.08s / 1.00s      | 200  | Dynamic: Supabase stats + alumni grid per request |
| `/direktori` | 1.95s     | 1.95s / 1.74s / 1.84s      | 200  | Heaviest query (joined alumni + skills, exact count) |
| `/login`     | 0.69s     | ~0.7s                       | 200  | Now `ƒ` (Next 15 `searchParams`); still fast      |
| `/profil/edit` | 0.37s   | —                           | 307→ `/login` | Middleware auth gate ✓                          |
| `/admin`     | —         | —                           | 307→ `/login?next=%2Fadmin` | Role gate ✓                          |

**Interpretation:** TTFB is dominated by Supabase query time on dynamic routes (each request re-runs DB reads; Vercel edge itself adds <50ms). At community scale this is acceptable. If TTFB must improve: add `revalidate`/ISR to public list pages (directory, jobs, gallery), cache home-page stats with a materialized aggregate, or move filter queries to PostgREST views.

---

## 7. Testing & QA Plan

**Finding:** No automated test suite exists (no `test` script, no test files). `bun run lint` (Next lint) and the build's type-check pass. The following **manual smoke-test matrix** should be executed against the production URL before go-live:


| #  | Scenario                                                                                                   | Expected                                                                 |
| ---- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 1  | Anonymous visit`/`, `/direktori`, `/lowongan`, `/grup`, `/polling`, `/pengumuman`, `/galeri`, `/peringkat` | Render; only public-visibility alumni visible                            |
| 2  | Register → email confirmation link                                                                        | Session created; redirected to`/profil/edit`; `alumni` row exists        |
| 3  | Login → edit profile → upload avatar + resume                                                            | Avatar visible; resume shows "terpasang"; PDF >2MB rejected              |
| 4  | Toggle Open to Work                                                                                        | Badge appears on directory/home                                          |
| 5  | Endorse a skill on another alumni profile                                                                  | Count +1; self-endorsement blocked                                       |
| 6  | Post job + announcement                                                                                    | Blocked for unverified; allowed after admin verification                 |
| 7  | Admin: verify user, view analytics, CSV export/import                                                      | Charts update; CSV round-trip works                                      |
| 8  | Create poll → vote twice                                                                                  | Second vote rejected ("sudah memberikan suara")                          |
| 9  | Gallery upload                                                                                             | Image appears in grid; lightbox navigates; unauthenticated upload hidden |
| 10 | Password reset                                                                                             | Email link →`/reset-password` → can sign in with new password          |
| 11 | Leaderboard                                                                                                | Scores reflect recent activity; top-3 medal styling                      |
| 12 | Mobile viewport (375px)                                                                                    | Navbar links collapse to`lg:` breakpoint; no horizontal scroll           |

**Optional (recommended for future sprints):** add Vitest unit tests for `lib/utils` (CSV parser, `asString`, `safePath`, media helpers) and Playwright smoke tests for the matrix above.

---

## 8. Post-Deployment Operations

1. **Keep-alive:** after adding GitHub secrets (§1.4), trigger `workflow_dispatch` once to confirm the ping returns `200`/`4xx` (any HTTP response proves the endpoint is alive).
2. **Monitoring:** Supabase Dashboard → Database → Monitoring for connection/replication health; Vercel Analytics optional. No third-party APM configured (fine at this scale).
3. **Backups:** Supabase free tier includes daily backups (7-day retention) — verify they are enabled; note this only covers the DB, not Storage.
4. **Admin workflow:** verification of alumni happens in-app (`/admin`). Document the verification policy (who can verify, evidence required).
5. **Storage cleanup:** no lifecycle rules; event gallery and avatars accumulate. Add a periodic cleanup or accept free-tier limits.

---

## 9. Risk Register


| Risk                                                | Severity  | Likelihood                                           | Mitigation                                                 |
| ----------------------------------------------------- | ----------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| `supabase db push` fails on go-live (no migrations) | 🔴 High   | Certain                                              | §1.1 Option A or B before deploying                       |
| Email confirmation/reset links broken in prod       | 🔴 High   | High if`NEXT_PUBLIC_APP_URL`/Auth URLs misconfigured | §1.3; smoke test#2 and #10                                |
| Storage uploads 403 in prod                         | 🔴 High   | High (buckets not provisioned)                       | §1.2 before go-live                                       |
| Known Next.js high-severity advisories shipped      | 🟠 Medium | Certain (version pinned)                             | ✅ RESOLVED — upgraded to 15.5.23; `bun audit` = 0 (§5.5) |
| Deploy script`--prebuilt` mismatch                  | 🟡 Medium | High (only affects`bun run deploy`)                  | Use git-push Vercel build, or fix script (§4.2)           |
| Keep-alive silently failing                         | 🟡 Low    | Medium                                               | §1.4 + §8.1 manual trigger                               |
| Leaderboard full-table scans at scale               | 🟡 Low    | Low (<10k alumni)                                    | Aggregate queries / cached scores (§6)                    |
| Free-tier pause (DB) after inactivity               | 🟡 Low    | Low                                                  | Keep-alive workflow every 3 days                           |

---

## 10. One-Page Deployment Runbook

```text
PREREQUISITES
  □ Supabase project created; Vercel project connected to the repo
  □ .env populated locally (NEXT_PUBLIC_*, SUPABASE_*, VERCEL_*)
  □ GitHub secrets SUPABASE_URL + SUPABASE_ANON_KEY added

STEP 1 — DATABASE
  □ mkdir -p supabase/migrations && cp supabase/schema.sql supabase/migrations/0001_init.sql
    (or: apply schema.sql in Supabase SQL Editor — one time only)

STEP 2 — STORAGE (Supabase Dashboard)
  □ Create buckets: avatars (public), resumes (private), gallery (public)
  □ Add storage policies: public SELECT; authenticated INSERT/UPDATE/DELETE
    restricted to own uid folder

STEP 3 — AUTH (Supabase Dashboard)
  □ Authentication → URL Configuration → Site URL = production URL
  □ Redirect URLs = https://<domain>/**  (+ http://localhost:3000/** for dev)

STEP 4 — DEPLOY APP
  □ Vercel → Environment Variables:
      NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL=https://<production-domain>
  □ Push to main (Vercel auto-builds) — or: bun run deploy (after fixing §4.2)

STEP 5 — ADMIN + SMOKE TEST
  □ bash scripts/create-admin.sh   (uses SUPABASE_SERVICE_ROLE_KEY)
  □ Run the 12-scenario smoke matrix (§7) against the production URL
  □ Trigger keep-alive workflow once; confirm it succeeds

DONE — app is live. Track Next.js upgrade (§5.5) as the first maintenance item.
```

---

## 11. Open Questions for the Team

1. **~~Upgrade window~~** ✅ **RESOLVED (2026-08-08):** Next.js 14 → 15.5.23 + React 19 deployed to prod; 27 advisories → 0 (see §5.5, §12).
2. **Resume downloads:** Currently the resume is a status badge only. Should it be downloadable (adds a signed-URL route + `resumes` public-read or auth-read policy)?
3. **Admin verification policy:** Who approves `status_verifikasi` and what evidence is required?
4. **Backup expectations:** Confirm daily backups are acceptable for the alumni PII, and agree a retention/export policy for the CSV export feature.

---

*Prepared following the code-review-checklist methodology (context → functionality → quality → security → performance → tests). Validation performed: `bunx tsc --noEmit` ✅, `bun run build` ✅ (27/27 routes), `bun audit` ⚠️ (27 advisories), deploy-script source review ⚠️ (3 defects), secrets grep ✅.*

---

## 12. Deployment Progress Log

**Date: 2026-08-05 — Live deployment session (Supabase project `zotizozgkzzuhrwbxoud`)**


| Step                              | Status  | Evidence / Notes                                                                                                                                                                                |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credentials in`.env` (gitignored) | DONE    | New-style keys (`sb_publishable_` / `sb_secret_`); prior `.env` backed up to `.env.backup-20260805`                                                                                             |
| REST + Auth API reachable         | DONE    | `/rest/v1/` returns 404 (auth OK, relation missing); `/auth/v1/health` 200                                                                                                                      |
| Schema present in project         | BLOCKED | Fresh project — all 15 tables return 404. CROSS_CHECK's "schema deployed" assumption was WRONG. Must apply`supabase/schema.sql` (one-time SQL Editor paste, or CLI push after `supabase link`) |
| Storage buckets created           | DONE    | `avatars` (public), `gallery` (public), `resumes` (private) via Storage REST API with service key                                                                                               |
| Storage policies                  | PENDING | SQL written at`supabase/storage-policies.sql` — apply in SQL Editor after schema (idempotent)                                                                                                  |
| Migrations dir                    | DONE    | `supabase/migrations/0001_init.sql` = copy of `schema.sql` (for future CLI pushes)                                                                                                              |
| Auth Admin API (service key)      | DONE    | `GET /auth/v1/admin/users` -> 200, empty list. `create-admin.sh` will work                                                                                                                      |
| Admin user                        | PENDING | Needs admin email/password/name (interactive)                                                                                                                                                   |
| Auth URL config                   | PENDING | Dashboard -> Authentication -> URL Configuration (Site URL + email redirects)                                                                                                                   |
| Vercel deploy                     | PENDING | Needs git-push/auto-build or`VERCEL_*` tokens                                                                                                                                                   |
| Keep-alive workflow               | PENDING | Exists; needs GitHub secrets`SUPABASE_URL` + `SUPABASE_ANON_KEY`                                                                                                                                |

**Security:** `SUPABASE_SERVICE_ROLE_KEY` (sb_secret) bypasses RLS — kept local-only; **rotate it in the dashboard after deploy** (it was shared in plaintext chat). Never put it in `NEXT_PUBLIC_*` or Vercel.

**Update (same day) — schema applied via direct DB connection:**

- Root cause of the failed SQL-editor paste: `CREATE POLICY "auth_insert_skills" ... FOR INSERT USING (...)` — Postgres requires `WITH CHECK` for INSERT policies (error 42601). Fixed in `supabase/schema.sql` (USING -> WITH CHECK); `supabase/migrations/0001_init.sql` re-synced.
- Created `supabase/reset.sql` (idempotent drop of all ILUNI objects) and generated `supabase/apply-all.sql` (reset + schema + storage policies, one-shot).
- Applied via `psql` to `db.zotizozgkzzuhrwbxoud.supabase.co` as superuser `postgres` (the `webapps` role the user provided failed auth; postgres user works and is preferable — schema owned by superuser keeps `is_admin()` SECURITY DEFINER able to read `auth.users`).
- Verified live: 15 tables, 6 enums, 15 seed skills, RLS enabled on all 15 tables, 54 public + 8 storage policies, `is_admin()` executes without error.
- `DATABASE_URL` added to gitignored `.env` (percent-encoded password).
- Admin user created via Auth Admin API (email confirmed, no verification email needed): id `84dd9985-b152-4607-b3c1-8f90e221da1d`, email iluni.fte.unpak@gmail.com, role super_admin, user_metadata.nama=Superadmin. `alumni` row auto-creates on first login via `ensureAlumniProfile`.

**Update (2026-08-08) — Next 15 upgrade + dependency remediation + production deploy:**

| Step                             | Status  | Evidence / Notes                                                                                                                             |
| ---------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Next 14→15.5.23 + React 19 upgrade | DONE    | `bunx tsc --noEmit` ✓, `bun run build` ✓ (27/27 routes). Async API migration: `lib/supabase/server.ts` `createClient()` now async; 10 pages converted to `Promise<params/searchParams>`; 42 server-client call sites awaited |
| Dependency audit                  | DONE    | `bun audit`: **27 → 0 vulnerabilities**. `next@15.5.23`, `react@19.2.8`, `@supabase/ssr@0.12.4`, `postcss@8.5.25` + `sharp@0.35.3` via `package.json` `overrides` |
| Lockfiles synced                  | DONE    | Vercel installs with npm → `package-lock.json` regenerated (`npm install --package-lock-only`); `bun.lock` also current                       |
| Production deploy                 | DONE    | `vercel build --prod` ✓ → `vercel deploy --prebuilt --prod` → aliased `https://ilunifteunpak.vercel.app` (HTTP 200)                          |
| Route protection verified live    | DONE    | `/profil/edit` → 307 `/login`; `/admin` → 307 `/login?next=%2Fadmin` (middleware role gate)                                                   |
| Performance baseline              | DONE    | See §6: `/` warm TTFB ~1.0s, `/direktori` ~1.8s (Supabase-query dominated)                                                                      |
| Supabase Auth URL config          | PENDING | Dashboard → Authentication → URL Configuration: Site URL + email redirects (§1.3)                                                               |
| GitHub secrets (keep-alive)       | PENDING | Repo `ilunifteunpakinfra-spec/webapps` → Settings → Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (§1.4)                                          |
| Key rotation                      | PENDING | Rotate `SUPABASE_SERVICE_ROLE_KEY` (sb_secret, shared in chat) in dashboard; update `.env` + Vercel anon key if it rotates (§5.4)                  |
| Smoke test matrix                 | PENDING | Run 12 scenarios from §7 against prod with the super-admin account                                                                               |

**Update (2026-08-08, part 2) — live error triage + DB verification:**

| Investigation                     | Verdict | Evidence / Notes                                                                                                                              |
| ----------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| "URL and Key are required" error  | ✅ RESOLVED (environmental) | Error is supabase-js's `createClient(url, key)` guard → fires only when `NEXT_PUBLIC_*` is unset **at build time**. Verified the prod build inlines both values in every browser-client chunk: `/galeri` (`page-3fcca0e8a29da373.js`), `/reset-password` (`page-1a3eebdc2b97da59.js`), `/profil/edit` (`page-7757cf781dd33efd.js`) — live chunk hashes match the local `vercel build` output exactly. Not a deployment defect; repros only when running locally without `.env` (e.g. `bun run dev` elsewhere, or a stale browser tab) |
| Auth actually working live        | ✅ Confirmed | Live DB now has **3 `alumni` rows** auto-created via `ensureAlumniProfile`: Superadmin (verified), MOCHAMAD RIDWAN (2010), Irwan Abdurachman (2001, open-to-work) — real user sign-ins since deploy |
| SQL 42601 re-check                | ✅ Root cause confirmed | User's SQL-editor paste failed with `42601: only WITH CHECK expression allowed for INSERT`. Git history: commit `91b7370` had `CREATE POLICY "auth_insert_skills" ... FOR INSERT USING (...)`; fixed to `WITH CHECK` in `3a9a01b` (HEAD). Current `schema.sql`/`migrations/0001_init.sql` are clean (all 9 INSERT policies use `WITH CHECK`; `FOR ALL USING` — e.g. the 15 `admin_bypass_*` — empirically verified valid in PG 15). Do not re-paste an old copy of the file; DB is already fully deployed (see below) |
| Live schema state                 | ✅ Verified 2026-08-08 | 15 tables, 6 enums, **54 policies**, 15 RLS tables, 15 seed skills, 3 storage buckets, 8 storage policies — matches `schema.sql` exactly |
| `PollForm` missing-module error   | ✅ Resolved (stale) | `app/polling/baru/PollForm.tsx` exists; `bunx tsc --noEmit` exits 0. Editor diagnostic was stale |
| Re-applying schema                | ⚠️ NOT idempotent | Re-running `schema.sql` fails at line 9 (`type "visibilitas_enum" already exists`). Never re-run without `supabase/reset.sql` first (verified live) |
