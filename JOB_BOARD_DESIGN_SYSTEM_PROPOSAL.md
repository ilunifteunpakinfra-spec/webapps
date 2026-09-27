# Design System Proposal — Halaman Lowongan (Job Board)

> **Status:** PROPOSAL — for review, not yet implemented.
> **Scope:** `app/lowongan/**` (list, detail, form) + admin moderation queue.
> **Prepared:** 2026-09-27 · **Repo state:** `main` @ `231c516`
> **Stack:** Next.js 15.5.23 (App Router) · React 19 · Tailwind 3.4 · @supabase/ssr

---

## 0. Executive summary

The `/lowongan` feature is **functionally complete but structurally inconsistent**. It carries
7 free-text columns, no moderation *intake* (admins can only hide after the fact), and a UI that
reaches into raw Tailwind for spacing while the rest of the app uses `.card` / `.chip` primitives.

This proposal does three things, in priority order:

| # | Work | Why | Risk |
|---|------|-----|------|
| 1 | **Structured vacancy fields** (+migration) | 7 free-text columns → typed, validated, filterable data. Enables everything else. | Low (additive) |
| 2 | **Pre-publish moderation gate** (`pending → active`) | Admins currently only soft-hide *after* a post is public. This closes the abuse window. | Medium (touches RLS) |
| 3 | **UI/UX + design-system consolidation** | Extract `JobCard` / `JobFilters` / `StatusBadge`; stop ad-hoc class soup. | Low (presentational) |

**Key architectural insight:** the moderation *actions* already exist. `hideJobAction` /
`restoreJobAction` are wired, capability-gated (`moderate_jobs`), and logged to the audit trail.
What is missing is only the **`pending` state in the lifecycle** and the **structured fields**.

---

## 1. Current state audit

### 1.1 What already works — do not rebuild

| Capability | Location | Status |
|---|---|---|
| `status` column (`active`/`hidden`) | `supabase/migrations/0003_content_moderation.sql:18` | ✅ live |
| Index on `(status, created_at DESC)` | `0003_content_moderation.sql:26` | ✅ live |
| Hide / restore server actions | `app/actions/moderation.ts:55,79` | ✅ live |
| Capability gate `moderate_jobs` | `app/actions/moderation.ts:59,83` | ✅ live |
| Audit logging | `logActivity()` → `admin_log_activity` RPC | ✅ live |
| Admin queue tab + buttons | `app/admin/moderation/` + `ContentActions.tsx` | ✅ live |
| Community reporting | `ReportButton` on detail page (`:128`) | ✅ live |
| Server-side pagination (8/page) | `app/lowongan/page.tsx:50` | ✅ live |
| Public read filter | `.eq('status','active')` + expiry | ✅ live |
| Verified-alumni gate on create | `app/actions/jobs.ts:53` | ✅ live |

> ⚠️ **Note on `supabase/schema.sql`:** the standalone schema file (line 104) still shows
> `job_postings` **without** `status`. It drifted from `migrations/0003`. `schema.sql` is
> non-idempotent and is a snapshot, not the source of truth — but it should be re-synced from
> the migrations to avoid future drift. Track as a follow-up (PR 8).

### 1.2 Gaps

| Gap | Evidence | Impact |
|---|---|---|
| **No pre-publish gate** | `0003:20` — `status IN ('active','hidden')` only | A post is public the instant it's created. `createJobAction` never sets status; the column default (`'active'`) publishes it. Admin can only hide *after*. |
| **Free-text `lokasi`** | `schema.sql:109` — `lokasi TEXT` | "Jakarta", "jakarta", "Remote", "Jakarta Raya" become 4 distinct filter values. Unfilterable. |
| **No employment type** | absent | Can't filter full-time vs contract vs internship. |
| **No salary range** | absent | Major filter expectation for job seekers; often the #1 decision factor. |
| **No experience level** | absent | "Senior Engineer" is only inferrable from a free-text title. |
| **No education requirement** | absent | |
| **`skill_required` is `TEXT[]`** | `schema.sql:111` | Free text split on commas. Bypasses the curated `skills` table (which has an approval workflow). Typos create duplicates. |
| **No contact / application channel** | `link_apply` only | Forces an external URL; many internal postings have none. |
| **No view tracking** | absent | Admin can't prioritise which vacancies matter. |
| **Card duplicates `daysAgo`** | `lowongan/page.tsx:21` | Re-implements `timeAgo()` from `lib/utils.ts:54`. Already fixed for the gallery list. |
| **Ad-hoc class soup** | `lowongan/page.tsx:99` | `max-w-[1280px]` hardcoded, while `tailwind.config.ts:93` defines `container-max: '1280px'`. Duplication. |
| **No empty-state guidance** | `:181` | "Belum ada lowongan aktif yang cocok." offers no path forward. |


---

## 2. Part 1 — Structured vacancy fields

### 2.1 Proposed schema (additive migration `0019_job_postings_structured.sql`)

> **Renamed:** originally drafted as `0004`, which collided with the pre-existing
> `0004_alumni_admin.sql`. It now runs last, after `0018_gallery_moderation`.

Design principle: **additive, nullable, defaulted** — so the 7 existing columns keep working and no
row is invalidated. New columns are the source of truth going forward.

```sql
-- 2.1.1 Controlled vocabularies
CREATE TYPE public.job_type_enum   AS ENUM ('full_time','part_time','contract','internship','freelance');
CREATE TYPE public.work_mode_enum  AS ENUM ('onsite','hybrid','remote');
CREATE TYPE public.experience_enum AS ENUM ('intern','junior','mid','senior','lead','principal');

-- 2.1.2 New columns
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS job_type      public.job_type_enum,
  ADD COLUMN IF NOT EXISTS work_mode     public.work_mode_enum,
  ADD COLUMN IF NOT EXISTS experience    public.experience_enum,
  ADD COLUMN IF NOT EXISTS education     TEXT,          -- min. education
  ADD COLUMN IF NOT EXISTS salary_min    INTEGER,       -- IDR
  ADD COLUMN IF NOT EXISTS salary_max    INTEGER,
  ADD COLUMN IF NOT EXISTS salary_period TEXT DEFAULT 'monthly'
                              CHECK (salary_period IN ('hourly','monthly','yearly')),
  ADD COLUMN IF NOT EXISTS contacts      JSONB DEFAULT '[]'::jsonb,  -- [{label,value,type}]
  ADD COLUMN IF NOT EXISTS views_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by   UUID REFERENCES public.alumni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_note TEXT;         -- reason for rejection

-- 2.1.3 Moderation lifecycle: add 'pending' + 'rejected'
ALTER TABLE public.job_postings
  DROP CONSTRAINT IF EXISTS job_postings_status_check;
ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_status_check
  CHECK (status IN ('pending','active','hidden','rejected'));

-- 2.1.4 Integrity
ALTER TABLE public.job_postings
  ADD CONSTRAINT job_salary_range_chk
  CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min),
  ADD CONSTRAINT job_salary_min_chk CHECK (salary_min IS NULL OR salary_min >= 0),
  ADD CONSTRAINT job_expiry_future_chk
  CHECK (expired_at IS NULL OR expired_at > created_at);

-- 2.1.5 Indexes for the new filter set
CREATE INDEX idx_jobs_type       ON public.job_postings (status, job_type,   created_at DESC);
CREATE INDEX idx_jobs_work_mode  ON public.job_postings (status, work_mode,  created_at DESC);
CREATE INDEX idx_jobs_experience ON public.job_postings (status, experience, created_at DESC);
CREATE INDEX idx_jobs_salary     ON public.job_postings (status, salary_max) WHERE salary_max IS NOT NULL;
CREATE INDEX idx_jobs_featured   ON public.job_postings (is_featured, created_at DESC) WHERE is_featured;
-- Full-text search across title + company + description
CREATE INDEX idx_jobs_search ON public.job_postings
  USING GIN (to_tsvector('simple',
    coalesce(judul,'') || ' ' || coalesce(perusahaan,'') || ' ' || coalesce(deskripsi,'')));
```

> **Backfill:** existing rows get `job_type = 'full_time'`, `work_mode = 'onsite'`,
> `status` stays `'active'`. No row is touched beyond that.

### 2.2 Field matrix

| Field | Type | Required | Replaces / improves | Admin-editable |
|---|---|---|---|---|
| `judul` | TEXT | ✅ | — | ✏️ |
| `perusahaan` | TEXT | ✅ | — | ✏️ |
| `lokasi` | TEXT | ➖ | **keep** — now a *display* string; add `kota` later if needed | ✏️ |
| `job_type` | enum | ✅ | new | ✏️ |
| `work_mode` | enum | ✅ | new | ✏️ |
| `experience` | enum | ✅ | new | ✏️ |
| `education` | TEXT | ➖ | new | ✏️ |
| `salary_min` / `_max` | INTEGER | ➖ | new | ✏️ |
| `contacts` | JSONB | ➖ | complements `link_apply` | ✏️ |
| `skill_required` | TEXT[] | ➖ | **+** validated against `skills` | ✏️ |
| `status` | TEXT | — | **lifecycle** | ✅ approve/reject |
| `is_featured` | BOOLEAN | — | new | ✅ |
| `moderation_note` | TEXT | — | new | ✅ |
| `views_count` | INTEGER | — | new (auto) | — |

### 2.3 `skill_required` → curated `skills` table

The `skills` table already has a **pending → approved** workflow. Free-text skill entry bypasses it,
creating duplicates ("PLC" vs "plc" vs "PLC/SCADA").

**Proposal:** add a junction table, keeping `TEXT[]` for backward compatibility during transition.

```sql
CREATE TABLE public.job_posting_skills (
  job_id   UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id)          ON DELETE RESTRICT,
  PRIMARY KEY (job_id, skill_id)
);
```

Migration path: read from **both** (`skill_required` OR the junction), populate the junction lazily,
deprecate `TEXT[]` in a later release. **Do not drop it in this migration** — other code
(`lowongan/page.tsx:48`) filters on it via `.contains()`.

---

## 3. Part 2 — Moderation for admin control

### 3.1 Lifecycle

```
                 ┌──────────┐
   create ──────▶│ PENDING  │  ← default for new posts
                 └────┬─────┘
          approve   │   reject
      ┌─────────────┴──────────────┐
      ▼                            ▼
 ┌─────────┐  hide          ┌───────────┐
 │ ACTIVE  │───────────────▶│  HIDDEN   │
 └────┬────┘◀───────────────└───────────┘
      │      restore
      │  expire (expired_at < now)
      ▼
   (auto-archived)
```

`REJECTED` is terminal-for-author but reversible by admin (edit → resubmit).

### 3.2 Rollout strategy — the safe path

⚠️ **Do not flip the default to `pending` in the same migration that adds the column.** Every
existing row would become invisible, because `published_at` would be `NULL` and the public query
filters on `status='active'`.

**Two-phase rollout:**

**Phase A — additive (PR 1).** Add columns + `pending`/`rejected` to the CHECK. Default stays
`'active'`. New posts set `status='pending'`, `published_at=NULL`. Add:
```sql
-- Existing active rows count as published.
UPDATE public.job_postings
   SET published_at = created_at
 WHERE published_at IS NULL AND status = 'active';
```
RLS/public reads keep filtering `status='active'` → **nothing breaks**.

**Phase B — tighten (PR 6, after moderation is in use).** Backfill `published_at`, then flip the
column default to `'pending'` and make the RLS insert policy force it.

### 3.3 RLS changes

```sql
-- Public: active, not expired, published
DROP POLICY IF EXISTS "public_read_active_jobs" ON public.job_postings;
CREATE POLICY "public_read_active_jobs" ON public.job_postings
  FOR SELECT USING (
    status = 'active'
    AND published_at IS NOT NULL
    AND (expired_at IS NULL OR expired_at > now())
  );

-- Author sees own posts regardless of status
CREATE POLICY "author_read_own_jobs" ON public.job_postings
  FOR SELECT USING (posted_by = auth.uid() OR public.can_moderate_jobs());

-- Author may edit own hidden/rejected post (to resubmit); may NOT self-publish
CREATE POLICY "author_update_own_jobs" ON public.job_postings
  FOR UPDATE USING (
    (posted_by = auth.uid() AND status IN ('hidden','rejected'))
    OR public.can_moderate_jobs()
  ) WITH CHECK (
    posted_by = auth.uid() OR public.can_moderate_jobs()
  );
```

**Critical — prevent self-publishing.** A client that can set `status='active'` bypasses review
entirely. Enforce server-side with a trigger, not just RLS:

```sql
CREATE OR REPLACE FUNCTION public.job_postings_guard_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;          -- admins may set any status
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'pending';
    NEW.published_at := NULL;
  ELSIF NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('active','rejected') THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menyetujui atau menolak lowongan';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER job_postings_guard_status_trg
  BEFORE INSERT OR UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.job_postings_guard_status();
```

> ⚠️ `public.is_admin()` must be `SECURITY DEFINER` with `search_path = ''` and a fully-qualified
> reference, per the 5.6 hardening already applied in `0002`. Reuse the existing function — do not
> redefine it.

### 3.4 New server actions

Extends `app/actions/moderation.ts` (same capability + audit pattern as `hideJobAction`):

```ts
approveJobAction   // pending|hidden → active   + published_at=now(), reviewed_by, reviewed_at
rejectJobAction    // → rejected (+ moderation_note, required)
featureJobAction   // is_featured toggle
bulkJobAction      // id[] + action — approve/reject/hide N at once
```

All must: gate on `moderate_jobs`, call `logActivity()`, `revalidatePath('/lowongan')` +
`revalidatePath('/admin/moderation')`. Audit `detail` should carry `{ from, to, note }`.

### 3.5 Admin UI

Extend the existing `ContentActions.tsx` (already handles `kind="job"`):

- Pending queue sorted first (`pending → 0` ordering, mirroring `GALLERY_STATUS_ORDER` at
  `moderation/page.tsx:67`)
- `Setujui` / `Tolak` (reject opens a required-note prompt)
- ⭐ Feature toggle
- Multi-select + bulk approve/reject
- Show `skill_required`, `salary`, `job_type` inline for fast triage

### 3.6 Author experience

`/lowongan/baru` success state must change from "Lowongan berhasil dipasang" to:

> **Lowongan terkirim dan sedang ditinjau admin.**
> Lowongan Anda akan tayang setelah disetujui. Anda dapat memantau statusnya di halaman ini.

Add `/lowongan/saya` — the author's own postings with status badges and edit/resubmit for
`hidden`/`rejected` (the RLS above permits it).


---

## 4. Part 3 — UI/UX & design system

### 4.1 Component inventory (extract from inline JSX)

| Component | File | Purpose |
|---|---|---|
| `<JobCard>` | `components/jobs/JobCard.tsx` | List card — server component |
| `<JobFilters>` | `components/jobs/JobFilters.tsx` | Type / mode / experience / salary / search |
| `<JobStatusBadge>` | `components/jobs/JobStatusBadge.tsx` | pending/active/hidden/rejected/expired |
| `<JobMeta>` | `components/jobs/JobMeta.tsx` | Icon+label row (location, mode, expiry) |
| `<SalaryRange>` | `components/jobs/SalaryRange.tsx` | Formats `salary_min`–`salary_max` |
| `<EmptyState>` | `components/EmptyState.tsx` | Reusable — replaces 5+ ad-hoc empties |
| `<JobFiltersBar>` | `components/jobs/JobFiltersBar.tsx` | Sticky filter bar + result count |

**Reuse `timeAgo()` from `lib/utils.ts:54`** and delete the local `daysAgo()` at
`lowongan/page.tsx:21`. Do not add a third copy.

### 4.2 Reusing the existing design system

The app already has a coherent Material-ish token set. **Extend it; don't fork it.**

Available primitives (`app/globals.css`, `tailwind.config.ts`):
`card`, `card-accent`, `btn-primary/secondary/tertiary`, `chip`, `chip-active`, `input-field`,
`label-mono`, `section-title`, `hero-title`, `status-dot*` · `primary`, `surface`, `error`,
`outline-variant`, `on-surface-variant` · `font-montserrat/inter/mono`.

**Add only these tokens** (`globals.css`, mirroring the existing `@apply` style):

```css
/* Filter control — select, for job_type / work_mode / experience */
.select-field { @apply input-field appearance-none cursor-pointer; }

/* Result-count / meta line */
.meta-line { @apply text-sm text-on-surface-variant; }

/* Status badge — pending | active | hidden | rejected */
.badge-pending  { @apply chip border border-secondary-container bg-secondary-container/30 text-secondary; }
.badge-active   { @apply chip border border-primary-container/30 bg-primary-container/10 text-primary-container; }
.badge-hidden   { @apply chip border border-outline-variant bg-surface-container text-on-surface-variant; }
.badge-rejected { @apply chip border border-error-container bg-error-container/30 text-error-on-container; }

/* Featured vacancy marker */
.badge-featured { @apply chip border border-circuit-yellow bg-circuit-yellow/20 text-tech-black; }

/* Salary — numeric emphasis */
.salary-range { @apply font-mono text-sm font-semibold text-on-surface; }

/* Sticky filter bar on scroll */
.filter-bar { @apply sticky top-0 z-20 -mx-5 border-b border-outline-variant bg-surface/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8; }
```

Also **use the existing spacing token**: replace the hardcoded `max-w-[1280px]` with
`max-w-container-max` (`tailwind.config.ts:93` defines `container-max: '1280px'`).

### 4.3 Colour discipline

`on-surface-variant` is `#5e3f3b` (a warm brown) — used for all secondary text. It passes
contrast on `surface` `#f7f9fb`. Keep it. **Do not** introduce new greys; extend via
`surface-container*` and the existing `outline` family.

`primary-container` is `#e30613` — high-chroma red. Use it for **accent/action only**
(links, primary buttons, featured marks). Never as large text fill or background block; it
vibrates on white and fails comfort at length. `card-accent` already handles the accent-bar case.

### 4.4 List page — proposed layout

```
┌──────────────────────────────────────────────────────────────┐
│ Lowongan Kerja                              [ Pasang Lowongan ]│
│ Peluang karier dari alumni dan perusahaan mitra              │
├──────────────────────────────────────────────────────────────┤
│ [🔍 Cari judul/perusahaan…] [Tipe ▾] [Mode ▾] [Level ▾]      │  ← .filter-bar
│ [Gaji ▾]  [chip chips…]                           12 lowongan│
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────┐ ┌───────────────────────┐  │
│ │ Senior SCADA Engineer   ⭐     │ │ PLC Programmer        │  │
│ │ 🏢 PT PLN · 5 hari lalu        │ │ 🏠 PT Siemens · 2h    │  │
│ │ 📍 Bogor · 💼 Penuh · 🏠 Onsite │ │ 📍 Jakarta · Hybrid   │  │
│ │ 🎓 S1 · 💰 Rp 15–20 jt/bln     │ │ 🎓 D3 · 💰 Negosiasi  │  │
│ │ [PLC] [SCADA] [Power Systems]   │ │ [PLC] [HMI]           │  │
│ │ ────────────────────────────    │ │ ────────────────────  │  │
│ │ Lihat Detail   [Minta Referral] │ │ Lihat Detail          │  │
│ └────────────────────────────────┘ └───────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Card anatomy** (fixed order, so scanning is predictable):
1. Title + `badge-featured` if featured
2. Company + relative time
3. `JobMeta` row — location · job type · work mode
4. Education + `SalaryRange` ("Negosiasi" when both null)
5. Skill chips (max 4 + `+N`)
6. Divider + actions

Cap skills at 4 with overflow — a 12-chip card breaks grid alignment.

### 4.5 Filter behaviour

- All filters are **URL state** (`?type=full_time&mode=remote&exp=senior&salary=15jt&q=scada`)
  so results are shareable and the back button works.
- `<select>` for enums; chip toggle for skills; a range slider or min-select for salary.
- Empty filter state → `<EmptyState>` with a **"Hapus semua filter"** action, not dead text.
- Show active filters as removable chips above the results.


### 4.6 Detail page

Restructure into labelled sections so it scans like a real vacancy posting:

```
Kembali
┌─────────────────────────────────────────────┐
│ Senior SCADA Engineer            [⭐ Featured]│
│ 🏢 PT PLN · 5 hari lalu                     │
│ [badge-pending]  (only if not active)       │
├─────────────────────────────────────────────┤
│ Ringkasan   📍 Bogor 💼 Penuh 🏠 Onsite     │  ← definition list
│            🎓 S1 Minimum  💰 Rp 15–20 jt/bln│
├─────────────────────────────────────────────┤
│ Deskripsi / Tanggung jawab                  │
│ Kualifikasi (bulleted, preserved whitespace)│
│ Skill yang dibutuhkan  [chips]              │
│ Kontak  [Email] [WhatsApp] [Website]        │  ← from contacts JSONB
├─────────────────────────────────────────────┤
│ [ Lamar Sekarang ] [ Minta Referral ] [⚑]   │
└─────────────────────────────────────────────┘
```

Add `<time dateTime={...}>` around dates (machine-readable), and increment `views_count` on view.

### 4.7 Form page — 3-step wizard

The current single long form mixes identity, logistics, and content. Split:

| Step | Fields | Validation |
|---|---|---|
| **1. Identitas** | judul, perusahaan, `job_type`, `experience` | required, min lengths |
| **2. Lokasi & kompensasi** | lokasi, `work_mode`, `salary_min/max`, `expired_at` | salary max ≥ min; expiry in future |
| **3. Detail** | deskripsi, education, skills (multi-select from `skills`), `link_apply`, contacts | description ≥ 50 chars |

- Save draft to `localStorage`; restore on mount (a 3-step form loses work on refresh).
- Review step showing a live `<JobCard>` preview before submit.
- Clear inline help under each field (`text-xs text-on-surface-variant`).
- Submit → `status: 'pending'`, redirect to `/lowongan/saya` with the "menunggu review" message.

### 4.8 Accessibility (WCAG 2.1 AA)

| Item | Fix |
|---|---|
| Chip links as filters | Add `aria-pressed` / `aria-current` on the active chip |
| Status conveyed by colour alone | Badge **text** carries the state; colour is redundant |
| `<select>` needs a label | Every control gets a real `<label htmlFor>` (chips currently have none) |
| Icon-only buttons | Minimum 44×44 touch target |
| Focus visibility | Never `outline-none` without a visible replacement |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` guard |
| Language | `lang="id"` on `<html>`; `aria-live="polite"` on the result count so filter changes announce |


---

## 5. Implementation plan

| # | PR | Contents | Gate |
|---|---|---|---|
| 1 | `0019_job_postings_structured.sql` | Columns, enums, constraints, indexes, `published_at` backfill, GIN search | Existing rows unchanged; `status` still `active` |
| 2 | Components | `JobCard`, `JobMeta`, `StatusBadge`, `SalaryRange`, `EmptyState` + tokens | Visual parity on `/lowongan` |
| 3 | Filters | URL-state filtering, `<select>`s, search, salary | `?` params work; no JS needed to filter |
| 4 | Form | 3-step wizard, validation, skill multi-select, draft save | Reuses `createJobAction` contract |
| 5 | Author view | `/lowongan/saya`, status badges, edit/resubmit | RLS allows own-post edit |
| 6 | Moderation | approve/reject/feature/bulk actions + guard trigger + RLS | **Cannot self-publish** (test it) |
| 7 | Admin UI | Pending queue, reject-with-note, bulk, feature toggle | Audit rows written |
| 8 | Follow-up | Re-sync `schema.sql` from migrations | Drift closed |

**PR 1 and 6 are the load-bearing ones.** Everything else is presentation that can land in any
order. PR 6 ships last so the `pending` default is already understood by the time admins see it.

---

## 6. Testing plan

The repo currently has **no automated tests** — so PR 1 and PR 6 should add them.

**Migration/RLS (highest risk):**
- Existing rows survive PR 1 with `status='active'`, `published_at` set.
- Insert as a normal verified alumnus → `status` forced to `pending`.
- `UPDATE status='active'` as non-admin → **raises**.
- Public `SELECT` returns only `active` + unexpired + `published_at IS NOT NULL`.
- Author can read/update own `rejected` post; **cannot** set `active`.

**Functions:** salary range check, expiry-after-creation check, `salary_period` enum.

**Smoke:** 12 scenarios from `DEPLOYMENT_ANALYSIS.md` §7 extended with — approve a pending post →
appears publicly; reject with note → author sees reason; feature → pinned to top.

---

## 7. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Self-publishing bypass | Medium | Guard trigger (not just RLS) — test explicitly |
| Existing rows vanish on default flip | **High** if done naively | Two-phase rollout, PR 6 last, backfill first |
| `skill_required` breakage | Medium | Keep `TEXT[]`; junction table is additive; read both |
| Slow list page from 4 filters | Low | Composite indexes; the GIN index covers search |
| Admin queue overload | Low | Pending-first sort + bulk actions; cap queue at 50 |
| Scope creep | **High** | Ship PRs 1–3 (data + UI) as the value core; 5–7 are follow-ups |
| `schema.sql` drift continues | Medium | PR 8 re-syncs it; document that migrations are source of truth |

---

## 8. Open questions for the maintainer

1. **Should salary be mandatory?** Requiring it improves data quality but may reduce posting volume.
   Recommend: optional, with "Negosiasi" when absent.
2. **Approve-all-pending, or auto-approve trusted posters?** e.g. verified alumni with N prior
   accepted posts could publish directly. Would cut admin load significantly.
3. **`contacts` JSONB vs separate table?** JSONB is simpler and fits the 1–3 contact case; a table
   is better if you need per-contact reporting. Recommend JSONB now.
4. **Featured vacancies — paid promotion or admin-curated?** Affects whether this needs Stripe.
5. **Retention policy for `hidden`/`rejected` posts?** Soft-hide keeps the audit trail; confirm
   there's no GDPR/retention concern for rejected content.
6. **Keep `lokasi` free text, or add structured `kota`/`provinsi`?** A structured field enables
   geographic filtering, but needs a province dataset to populate.

---

## 9. Related documentation

| Doc | Location |
|---|---|
| Project README | [`README.md`](./README.md) |
| Deployment analysis | [`docs/DEPLOYMENT_ANALYSIS.md`](./docs/DEPLOYMENT_ANALYSIS.md) |
| Moderation plan | [`docs/SUPERADMIN_MODERATION_PLAN.md`](./docs/SUPERADMIN_MODERATION_PLAN.md) |
| Deployment addresses | [`DEPLOYMENT_ADDRESSES.md`](./DEPLOYMENT_ADDRESSES.md) |

---

**Status:** Proposal only — no code, schema, or config was changed by this document.
**Prepared:** 2026-09-27 · `main` @ `231c516`

