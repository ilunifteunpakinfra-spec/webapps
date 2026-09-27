# Design Proposal — Verified Status & Rich Description for Lowongan

> **Status:** PROPOSAL — for review. **No code, schema, or config changed.**
> **Scope:** `job_postings` verification flag + `deskripsi` content styling.
> **Prepared:** 2026-09-27 · **Base:** `main` @ `16ce8f1`
> **Related:** [`JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md`](./JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md)

---

## 0. Summary

Two requests, deliberately separated because they have different risk profiles:

| # | Request | Risk | Approach |
|---|---------|------|----------|
| A | **Admin sets Verified / Unverified** on a vacancy | Low | New `verification` column, admin-only write, RLS-enforced |
| B | **Richer `deskripsi` styling** | **High** | Server-rendered Markdown → sanitized HTML. **Never** `dangerouslySetInnerHTML` on raw input. |

> ⚠️ **B carries XSS risk.** `deskripsi` is currently rendered as plain text
> (`app/lowongan/[id]/page.tsx:94`, `whitespace-pre-line`). Moving to rich content is the
> single most security-sensitive change in this document. §4 is the core of it.

---

## 1. Current state (verified)

| Fact | Evidence |
|---|---|
| `deskripsi TEXT` — unbounded, no length CHECK | `migrations/0001_init.sql:92` |
| Rendered as **plain text**, line breaks only | `app/lowongan/[id]/page.tsx:94` |
| **No** markdown lib, **no** sanitizer, **no** `dangerouslySetInnerHTML` anywhere | `grep` over `app components lib` → none |
| No `@tailwindcss/typography` plugin | `tailwind.config.ts:96` — `plugins: []` |
| No `.prose` styles | `globals.css` — 0 matches |
| Admin gate pattern exists | `hasCapability(user,'moderate_jobs')` at `admin/moderation/page.tsx:148` |
| Moderation lifecycle already exists | `status` ∈ pending/active/hidden/rejected (migration `0004`) |

**Good news:** the codebase currently has no HTML-injection surface. This proposal must not
create one.

---

## 2. Part A — Verified / Unverified status

### 2.1 Naming: do NOT reuse `status`

`status` already means the **moderation lifecycle** (`pending → active/hidden/rejected`).
Reusing it for trust would conflate two different axes and break the existing admin queue.
This is a **separate, orthogonal** field.

### 2.2 Schema (migration `0005_job_verification.sql`)

```sql
-- Verification is an editorial trust signal, independent of moderation.
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS verification TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification IN ('verified', 'unverified')),
  ADD COLUMN IF NOT EXISTS verified_by   UUID REFERENCES public.alumni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobs_verification
  ON public.job_postings (status, verification, created_at DESC);
```

Backfill: existing rows default to `unverified` — **no row disappears**, nothing breaks.

### 2.3 State matrix

| | `verification` | `status` | Meaning |
|---|---|---|---|
| New posting | `unverified` | `pending` | Awaiting admin review |
| Approved, not vetted | `unverified` | `active` | Published, no trust mark |
| Approved + vetted | `verified` | `active` | Published with trust badge |
| Rejected | `unverified` | `rejected` | Not published |

### 2.4 Admin write path

New capability so verification can be delegated separately from moderation:

```ts
// lib/constants.ts — added to ADMIN_CAPABILITIES
'verify_jobs', // grant/revoke the Verified badge on a vacancy
```

```ts
// app/actions/moderation.ts
export async function setJobVerificationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await requireCapability('verify_jobs');
  if (denied) return denied;

  const jobId = readId(formData, 'job_id');
  const level = String(formData.get('verification') ?? '').trim();
  if (!jobId) return { error: 'Data lowongan tidak valid.' };
  if (level !== 'verified' && level !== 'unverified') {
    return { error: 'Status verifikasi tidak valid.' };
  }

  // Only a live posting can carry the badge.
  const supabase = await createClient();
  const { data: before } = await supabase
    .from('job_postings')
    .select('status, verification')
    .eq('id', jobId)
    .maybeSingle();
  if (!before) return { error: 'Lowongan tidak ditemukan.' };
  if (level === 'verified' && before.status !== 'active') {
    return { error: 'Hanya lowongan aktif yang dapat diverifikasi.' };
  }

  const admin = await getCurrentUser();
  const { error } = await supabase
    .from('job_postings')
    .update({
      verification: level,
      verified_by: level === 'verified' ? admin?.id ?? null : null,
      verified_at: level === 'verified' ? new Date().toISOString() : null,
    })
    .eq('id', jobId);

  if (error) return { error: error.message };

  await logActivity(supabase, `set_job_${level}`, 'job_postings', jobId, {
    from: before.verification,
    to: level,
  });
  revalidatePath('/lowongan');
  revalidatePath('/admin/moderation');
  return { success: true, message: level === 'verified'
    ? 'Lowongan ditandai terverifikasi.'
    : 'Tanda verifikasi dicabut.' };
}
```

### 2.5 RLS — defence in depth

RLS limits *rows*; the guard trigger from `0004` limits *columns*. Verification needs both:

```sql
-- Non-admins may read verification; they may never write it.
DROP POLICY IF EXISTS "owner_update_own_job_posting" ON public.job_postings;
CREATE POLICY "owner_update_own_job_posting" ON public.job_postings
  FOR UPDATE
  USING (posted_by = auth.uid() OR public.is_admin())
  WITH CHECK (
    (posted_by = auth.uid() AND verification = (SELECT verification
                                                 FROM public.job_postings
                                                 WHERE id = job_postings.id))
    OR public.is_admin()
  );
```

The `WITH CHECK` subquery pins `verification` to its current value for non-admins, so an
author cannot self-grant the badge even if the trigger were removed.

```sql
-- Trigger: block verification changes from non-admins
CREATE OR REPLACE FUNCTION public.job_postings_guard_verification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;

  IF NEW.verification IS DISTINCT FROM OLD.verification THEN
    RAISE EXCEPTION 'Hanya admin yang dapat memverifikasi lowongan'
      USING ERRCODE = '42501';
  END IF;

  -- A new post always starts unverified, whatever the client sends.
  IF TG_OP = 'INSERT' THEN
    NEW.verification := 'unverified';
    NEW.verified_by  := NULL;
    NEW.verified_at  := NULL;
  END IF;

  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.job_postings_guard_verification() FROM PUBLIC;

DROP TRIGGER IF EXISTS job_postings_guard_verification_trg ON public.job_postings;
CREATE TRIGGER job_postings_guard_verification_trg
  BEFORE INSERT OR UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.job_postings_guard_verification();
```

### 2.6 Display

- **Card:** small `badge-verified` mark next to the title, next to `badge-featured`.
- **Detail:** a "Lowongan Terverifikasi" row in the Ringkasan block.
- **Filter:** add `?verified=1` to `JobFilters`.
- **Precedence:** if `status !== 'active'`, the status badge wins — a rejected post must never
  show a trust mark.

### 2.7 Design tokens

```css
.badge-verified {
  @apply chip border-primary-container bg-primary-container/15 text-primary-container;
}
```

---

## 3. Part B — Rich `deskripsi`

### 3.1 The decision: Markdown, not a WYSIWYG editor

| Option | Verdict | Reason |
|---|---|---|
| Raw HTML + `dangerouslySetInnerHTML` | ❌ **Never** | Stored XSS. Any poster, or anyone who injects a row, runs JS in every visitor's session. |
| `sanitize-html` / DOMPurify on stored HTML | ❌ | Sanitizing *stored* content is fragile — the rules must hold forever. |
| **Markdown → sanitize → render** | ✅ **Recommended** | Narrow input language, one parser, one allowlist, easy to test. |
| TipTap / Lexical (full WYSIWYG) | ⚠️ Defer | ~10 deps, ~150 kB, complex SSR. Justified only if authoring volume proves high. |

**Chosen: Markdown, authored with a small toolbar.** Poster-friendly without WYSIWYG weight.

### 3.2 Dependencies (add exactly two)

```bash
bun add marked sanitize-html
bun add -d @types/sanitize-html
```

- `marked` — parses Markdown → HTML.
- `sanitize-html` — allowlists the output **server-side**. This is the security boundary.

### 3.3 Render pipeline — `lib/jobs/description.ts`

```ts
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p','br','strong','em','del','code','pre','blockquote',
  'ul','ol','li','a','h3','h4','h5','h6','hr','table',
  'thead','tbody','tr','th','td','span',
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    '*': ['class'],
  },
  // Only these URL schemes. Blocks javascript:, data:, vbscript: …
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { a: ['http', 'https', 'mailto'] },
  allowedClasses: { '*': ['lang-*'] },
  transformTags: {
    // Every external link gets noopener + nofollow.
    a: sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer nofollow',
    }),
  },
  disallowedTagsMode: 'discard',
};

/**
 * Markdown -> sanitized HTML. NEVER returns unsanitized output.
 * Runs on the server only; the result is passed to
 * dangerouslySetInnerHTML on a component with no 'use client'.
 */
export function renderDescription(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const raw = marked.parse(markdown, { async: false, gfm: true, breaks: true });
  return sanitizeHtml(raw, OPTIONS);
}
```

**Rules that must hold:**

1. `renderDescription()` is the **only** way description HTML reaches the page.
2. It is called in a **server component**. The consuming component must not be `'use client'`.
3. `dangerouslySetInnerHTML` appears in **exactly one file** (`JobDescription.tsx`), with a
   comment explaining why the input is already sanitized.
4. `sanitizeHtml` runs **after** `marked`, always, with no code path that skips it.


### 3.4 Length limits

```sql
-- Backfill FIRST: 0001 has no limit, so an existing long row would fail the
-- new CHECK and abort the whole migration.
UPDATE public.job_postings
   SET deskripsi = left(deskripsi, 20000)
 WHERE char_length(deskripsi) > 20000;

ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_deskripsi_chk
  CHECK (deskripsi IS NULL OR char_length(deskripsi) <= 20000);
```

Cap **raw Markdown** at 20 000 chars (~400 rendered words). Also enforce it in
`createJobAction` with a friendly message, so users never hit a raw DB error.

### 3.5 Authoring toolbar — `components/jobs/DescriptionEditor.tsx`

A `'use client'` textarea with a formatting toolbar. No editor library.

| Button | Action | Shortcut |
|---|---|---|
| B | wrap selection in `**` | `⌘/Ctrl+B` |
| I | wrap selection in `*` | `⌘/Ctrl+I` |
| Bullet | prefix `- ` per line | — |
| Numbered | prefix `1. ` per line | — |
| Heading | prefix `### ` | — |
| Quote | prefix `> ` | — |
| Code | wrap in `` ` ``, or fence | — |
| Link | `[text](https://)` | `⌘/Ctrl+K` |

**Behaviour:**
- `textarea` + `selectionStart/End`; the insert helper preserves the cursor position.
- Live character counter against the 20 000 cap; turns to `text-error` past 90%.
- Help text: `Ctrl+B tebal · Ctrl+I miring · Ctrl+K tautan`.
- **No live preview.** A client component cannot import the server-only sanitizer, so a preview
  would mean shipping `marked` + `sanitize-html` to the browser (~40 kB gz) and sanitizing
  client-side, where it can be bypassed or skipped. The detail page is the preview.

### 3.6 Read view — `components/jobs/JobDescription.tsx`

```tsx
// Server component. `markdown` MUST be rendered via renderDescription().
import { renderDescription } from '@/lib/jobs/description';

export default function JobDescription({ markdown }: { markdown: string | null }) {
  const html = renderDescription(markdown);
  if (!html) return null;
  return (
    <section className="job-prose" data-testid="job-description">
      {/* Safe: renderDescription() already allowlisted every tag/attribute. */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
```

### 3.7 Prose styles

Do **not** add `@tailwindcss/typography` — a large surface for a one-page need that would
restyle the whole app. Hand-write a scoped block reusing existing tokens:

```css
/* Scoped to job descriptions only — no global prose reset. */
.job-prose { @apply text-sm leading-relaxed text-on-surface; }
.job-prose h3 { @apply font-montserrat text-lg font-bold mt-4 mb-2 text-on-surface; }
.job-prose h4 { @apply font-montserrat text-base font-bold mt-3 mb-1 text-on-surface; }
.job-prose p  { @apply mb-3; }
.job-prose ul { @apply list-disc pl-5 mb-3 space-y-1; }
.job-prose ol { @apply list-decimal pl-5 mb-3 space-y-1; }
.job-prose a  { @apply text-primary-container underline; }
.job-prose blockquote {
  @apply border-l-4 border-outline-variant pl-3 my-3 text-on-surface-variant italic;
}
.job-prose code {
  @apply font-mono text-xs bg-surface-container px-1 py-0.5 rounded;
}
.job-prose pre {
  @apply font-mono text-xs bg-surface-container p-3 rounded my-3 overflow-x-auto;
}
.job-prose pre code { @apply bg-transparent p-0; }
.job-prose table { @apply w-full text-sm my-3 border-collapse; }
.job-prose th { @apply border-b-2 border-outline-variant py-2 text-left font-mono text-xs uppercase; }
.job-prose td { @apply border-b border-outline-variant py-2 align-top; }
.job-prose hr { @apply border-outline-variant my-4; }
```

### 3.8 Migration of existing content

Existing `deskripsi` values are **plain text**. Markdown renders plain text unchanged, so they
keep looking correct — **no data migration required**. The only visible change is that blank
lines become paragraph breaks, which `breaks: true` already handles.

---

## 4. Security review — Part B specifically

| Threat | Control |
|---|---|
| `<script>alert(1)</script>` in a posting | Blocked by `allowedTags` allowlist |
| `<img onerror=...>` | `img` not in allowlist; `on*` never allowed |
| `[click](javascript:alert(1))` | Blocked by `allowedSchemes` |
| `[click](data:text/html,...)` | Blocked by `allowedSchemes` |
| `<a target="_blank">` tabnabbing | Forced `rel="noopener noreferrer"` |
| CSS class injection | `allowedClasses` limits to `lang-*` |
| Payload hidden in a code block | `pre`/`code` allowed, but attributes still filtered |
| Malicious link in a **stored** post | Re-sanitized on **every** render, not once at write |

**Required tests** (the security regression net — §6):

1. `<script>` stripped
2. `onerror=` stripped
3. `javascript:` href stripped
4. `data:` href stripped
5. external link gets `rel="noopener"`
6. legitimate Markdown (`**bold**`, `- list`, `[a](https://x)`) survives intact


---

## 5. Implementation plan

| # | PR | Contents | Gate |
|---|---|---|---|
| 1 | `0005_job_verification.sql` | Column, index, RLS, guard trigger, length backfill | Existing rows unaffected |
| 2 | **Markdown renderer** | `lib/jobs/description.ts` + deps | **Security tests pass** |
| 3 | Prose styles + `JobDescription` | `globals.css`, component | Detail page renders |
| 4 | `DescriptionEditor` | Toolbar, shortcuts, counter | Replaces plain textarea |
| 5 | `verify_jobs` capability + action | `constants.ts`, `moderation.ts` | Audit row written |
| 6 | Verification UI | Badge on card/detail, admin toggle, `?verified` filter | Badge hidden unless `active` |

**PR 2 is the review gate.** Do not merge 3–4 until the sanitizer tests are green.

---

## 6. Testing

```bash
bun add -d @testing-library/dom
```

New suites:
- `tests/unit/description-sanitizer.test.ts` — the 6 cases in §4. **Mandatory.**
- `tests/unit/job-description.test.tsx` — renders allowed markup, asserts stripped markup absent.
- `tests/unit/description-editor.test.tsx` — toolbar wraps selection, counter enforces cap.

Integration (manual, needs a DB):
- Post as verified alumnus → `verification='unverified'`, `status='pending'`.
- Admin approves → `status='active'`, still unverified, no badge.
- Admin verifies → badge shows on card + detail.
- Author attempts `PATCH verification='verified'` → **rejected by trigger**.

---

## 7. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| XSS via stored `deskripsi` | **Critical** | Allowlist + re-sanitize per render + mandatory tests (§4) |
| Sanitizer rule drift on upgrade | High | Pin versions; review `marked`/`sanitize-html` changelogs |
| `dangerouslySetInnerHTML` copied elsewhere | High | Single consuming file; lint rule + code comment |
| `marked` pulls DOM deps client-side | Medium | Only import from a server component |
| 20 kB CHECK fails on an existing long post | Medium | Backfill `left(deskripsi,20000)` **before** adding the constraint |
| `verify_jobs` not granted to existing admins | Medium | Add to `DEFAULT_ADMIN_CAPABILITIES`; super_admin bypasses anyway |
| Author self-grants Verified | High | RLS `WITH CHECK` **and** trigger |
| Rejected post still shows Verified badge | Medium | Precedence rule §2.6 |

---

## 8. Open questions

1. **Who can verify — super_admin only, or delegated admins?** Recommend a new `verify_jobs`
   capability defaulting to admins, same as `moderate_jobs`.
2. **Should Verified be reversible?** Recommend yes, with an audit trail (implemented above).
3. **Markdown or plain text with line breaks only?** Markdown is more capable; if posters are
   non-technical, the toolbar hides the syntax entirely. Recommend Markdown + toolbar.
4. **Should Verified outrank Featured in ranking?** Recommend no — Featured is a curation slot,
   Verified is a trust signal. Keep them independent.
5. **Is the 20 000-char cap right?** ~400 words. Raise if long roles are common.
6. **Do other content types need this?** `announcements` and `polls` also have `deskripsi`
   bodies. Recommend reusing the same renderer — as a **separate PR**, not this one.

---

## 9. Related documentation

| Doc | Location |
|---|---|
| Job board design system | [`JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md`](./JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md) |
| Implementation tasks | [`IMPLEMENTATION_TASKS.md`](./IMPLEMENTATION_TASKS.md) |
| Deployment addresses | [`DEPLOYMENT_ADDRESSES.md`](./DEPLOYMENT_ADDRESSES.md) |

---

**Status:** Proposal only. No code, schema, dependency, or config was modified.
**Prepared:** 2026-09-27 · `main` @ `16ce8f1`

