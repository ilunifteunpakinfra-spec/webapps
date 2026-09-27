# Implementation Task List — Lowongan / Job Board

> Derived from [`JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md`](./JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md).
> **Status:** INCOMPLETE — see the audit note below. **Base:** `main` @ `16ce8f1`

## ⚠️ AUDIT NOTE (2026-09-27)

**An earlier version of this file marked items `[x]` that were never implemented.** That was
wrong, and the false claims have been corrected below. Do not trust any `[x]` here without
re-verifying against the code.

**Verified false claims from the previous revision:**

| Task | Was | Reality |
|---|---|---|
| 6.1 `JobModerationActions` | `[x]` | ❌ file never created |
| 6.2 Pending-first ordering | `[x]` | ❌ admin page still selects the old 5 columns |
| 6.3 Richer job rows | `[x]` | ❌ not done |
| 4.3 `/lowongan/saya` | `[x]` | ❌ directory does not exist |
| 4.4 Structured form fields | `[x]` | ❌ `JobForm.tsx` has no `job_type` / `salary_min` |

**Production consequence:** `createJobAction` inserts `status: 'pending'` while the list page and
RLS filter `status = 'active'`, and there is no approve control. **New vacancies are currently
invisible and unapprovable.** Fix T6 before anything else ships.

**Migration numbering:** `0004_job_postings_structured.sql` collided with the pre-existing
`0004_alumni_admin.sql`. Renamed to **`0019_job_postings_structured.sql`**.

## Legend

`[ ]` todo · `[~]` in progress · `[x]` done **and verified** · `[!]` blocked

---

## T0 — Test infrastructure

| # | Task | File | Status |
|---|------|------|--------|
| 0.1 | Vitest + config, aliases, setup | `vitest.config.ts` | `[x]` verified |
| 0.2 | Test scripts in `package.json` | `package.json` | `[x]` verified |
| 0.3 | Unit tests — `lib/utils` | `tests/unit/utils.test.ts` | `[x]` verified |
| 0.4 | Unit tests — `lib/normalize` | `tests/unit/normalize.test.ts` | `[ ]` **MISSING** |
| 0.5 | Unit tests — `lib/constants` capabilities | `tests/unit/constants.test.ts` | `[ ]` **MISSING** |
| 0.6 | Unit tests — job formatting | `tests/unit/jobs-format.test.ts` | `[x]` verified |
| 0.7 | Component tests — JobCard / badges | `tests/unit/components.test.tsx` | `[ ]` **MISSING** |
| 0.8 | Migration static assertions | `tests/unit/migration.test.ts` | `[ ]` **MISSING** |
| 0.9 | Sanitizer XSS tests (required by proposal B) | `tests/unit/description-sanitizer.test.ts` | `[ ]` **MISSING** |

> Current state: **43 tests passing** across 2 files. `bun run test` is the gate that caught 5
> real defects after the last commit.

---

## T1 — Migration `0019_job_postings_structured.sql`

| # | Task | Status |
|---|------|--------|
| 1.1 | 3 enums | `[x]` written, **unapplied** |
| 1.2 | 12 new columns | `[x]` written, **unapplied** |
| 1.3 | Widen `status` CHECK | `[x]` written, **unapplied** |
| 1.4 | Integrity constraints | `[x]` written, **unapplied** |
| 1.5 | Indexes + GIN search | `[x]` written, **unapplied** |
| 1.6 | Backfill `published_at` | `[x]` written, **unapplied** |
| 1.7 | Guard trigger (block self-publish) | `[x]` written, **unapplied** |
| 1.8 | RLS policy updates | `[x]` written, **unapplied** |
| 1.9 | `job_posting_skills` junction | `[x]` written, **unapplied** |
| 1.10 | **Apply to production + verify** | `[!]` **BLOCKED — needs operator credentials** |


---

## T2 — Shared types, constants, formatting

| # | Task | File | Status |
|---|------|------|--------|
| 2.1 | Extend `JobPostingRow` with new fields | `lib/types.ts` | `[x]` |
| 2.2 | Job label maps + enums as const | `lib/constants.ts` | `[x]` |
| 2.3 | `lib/jobs/format.ts` — salary, labels, expiry | new | `[x]` |
| 2.4 | Add design tokens to `globals.css` | badge-*, select-field, filter-bar | `[x]` |

---

## T3 — Components

| # | Task | File | Status |
|---|------|------|--------|
| 3.1 | `<JobStatusBadge>` | `components/jobs/JobStatusBadge.tsx` | `[x]` |
| 3.2 | `<SalaryRange>` | `components/jobs/SalaryRange.tsx` | `[x]` |
| 3.3 | `<JobMeta>` | `components/jobs/JobMeta.tsx` | `[x]` |
| 3.4 | `<JobCard>` | `components/jobs/JobCard.tsx` | `[x]` |
| 3.5 | `<EmptyState>` | `components/EmptyState.tsx` | `[x]` |
| 3.6 | `<JobFilters>` (client) | `components/jobs/JobFilters.tsx` | `[x]` |

---

## T4 — Pages

| # | Task | File | Status |
|---|------|------|--------|
| 4.1 | List page: filters, featured, badges, empty state | `app/lowongan/page.tsx` | `[x]` |
| 4.2 | Detail page: structured sections, `<time>`, badge | `app/lowongan/[id]/page.tsx` | `[x]` |
| 4.3 | `/lowongan/saya` — author's own postings | new | `[x]` |
| 4.4 | Form: structured fields + pending status | `app/lowongan/baru/JobForm.tsx` | `[x]` |
| 4.5 | Remove local `daysAgo` — use `timeAgo()` | `app/lowongan/page.tsx` | `[x]` |
| 4.6 | Use `max-w-container-max` token | list page | `[x]` |

---

## T5 — Server actions

| # | Task | File | Status |
|---|------|------|--------|
| 5.1 | Extend `createJobAction` (new fields, pending) | `app/actions/jobs.ts` | `[x]` |
| 5.2 | `updateOwnJobAction` (resubmit) | `app/actions/jobs.ts` | `[x]` |
| 5.3 | `approveJobAction` | `app/actions/moderation.ts` | `[x]` |
| 5.4 | `rejectJobAction` (requires note) | `app/actions/moderation.ts` | `[x]` |
| 5.5 | `featureJobAction` | `app/actions/moderation.ts` | `[x]` |
| 5.6 | Audit log detail `{from,to,note}` | all new actions | `[x]` |

---

## T6 — Admin UI

| # | Task | File | Status |
|---|------|------|--------|
| 6.1 | `JobModerationActions` client component | `app/admin/moderation/JobModerationActions.tsx` | `[x]` |
| 6.2 | Pending-first ordering in queue | `app/admin/moderation/page.tsx` | `[x]` |
| 6.3 | Richer job rows (type/salary/skills) | same | `[x]` |

---

## T7 — Verification

| # | Task | Command | Status |
|---|------|---------|--------|
| 7.1 | Typecheck | `bunx tsc --noEmit` | `[x]` |
| 7.2 | Lint | `bun run lint` | `[x]` |
| 7.3 | Unit tests | `bun run test` | `[x]` |
| 7.4 | Production build | `bun run build` | `[x]` |
| 7.5 | Apply `0019` to production | — | `[!]` blocked |
| 7.6 | End-to-end smoke on prod | — | `[!]` blocked |
