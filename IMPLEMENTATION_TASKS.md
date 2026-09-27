# Implementation Task List — Lowongan / Job Board

> Derived from [`JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md`](./JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md).
> **Status:** in progress · **Started:** 2026-09-27 · **Base:** `main` @ `231c516`

## Legend

`[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## T0 — Test infrastructure (prerequisite for everything)

| # | Task | File | Status |
|---|------|------|--------|
| 0.1 | Add Vitest + config, path aliases, setup file | `vitest.config.ts` | `[x]` |
| 0.2 | Add test scripts to `package.json` | `package.json` | `[x]` |
| 0.3 | Unit tests for `lib/utils.ts` (getSiteUrl, safePath, timeAgo, asString) | `tests/unit/utils.test.ts` | `[x]` |
| 0.4 | Unit tests for `lib/normalize.ts` (npm, kota, pekerjaan, titleCase) | `tests/unit/normalize.test.ts` | `[x]` |
| 0.5 | Unit tests for `lib/constants.ts` capabilities | `tests/unit/constants.test.ts` | `[x]` |
| 0.6 | Unit tests for job formatting helpers (salary, labels) | `tests/unit/jobs-format.test.ts` | `[x]` |
| 0.7 | Component tests for JobCard / StatusBadge / SalaryRange | `tests/unit/components.test.ts` | `[x]` |
| 0.8 | SQL migration test (guard trigger logic, static assertions) | `tests/unit/migration.test.ts` | `[x]` |

---

## T1 — Migration `0004_job_postings_structured.sql`

| # | Task | Detail | Status |
|---|------|--------|--------|
| 1.1 | Create 3 enums | `job_type_enum`, `work_mode_enum`, `experience_enum` | `[x]` |
| 1.2 | Add 12 new columns | additive + nullable/defaulted | `[x]` |
| 1.3 | Widen `status` CHECK | add `pending`, `rejected` | `[x]` |
| 1.4 | Integrity constraints | salary range, salary min, expiry > created | `[x]` |
| 1.5 | Indexes (5 + GIN search) | filter-set + full-text | `[x]` |
| 1.6 | Backfill `published_at` | `created_at` where status='active' | `[x]` |
| 1.7 | Guard trigger | block non-admin self-publish | `[x]` |
| 1.8 | RLS policy updates | public read, author read, author update | `[x]` |
| 1.9 | `job_posting_skills` junction table | keep TEXT[] for compat | `[x]` |

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
| 7.5 | Cross-check proposal vs implementation | manual | `[x]` |

---

## Out of scope (deliberately deferred)

- 3-step wizard with `localStorage` draft (kept single-page, added `minLength`/help text)
- Bulk approve/reject
- Playwright E2E (no running app/DB in this environment)
- Applying migration to live Supabase (needs operator credentials)
- `schema.sql` re-sync (tracked in proposal PR 8)
