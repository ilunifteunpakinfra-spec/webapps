# Design Proposal — Company Presence Fields for Lowongan

> **Status:** PROPOSAL — for review. **No feature code changed.**
> **Scope:** `job_postings` company-branding fields (website, logo, contact) + the **missing**
> lowongan edit page they belong to.
> **Prepared:** 2026-09-27 · **Base:** `main` @ `16ce8f1`
> **Related:** [`JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md`](./JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md)

---

## 0. Two blockers found while scoping this

Both discovered before writing the proposal; each changes what "add a field" means.

### Blocker 1 — **There is no lowongan edit page.**

```
$ find app/lowongan -type d
app/lowongan
app/lowongan/[id]      ← view only
app/lowongan/baru      ← create only
```

No `[id]/edit`. `app/actions/jobs.ts` exports `updateOwnJobAction` (added in `16ce8f1`), but
**nothing renders a form that calls it** — the action is unreachable. The only `edit` route in
the app is `/profil/edit`.

**Consequence:** fields added "for the edit page" have nowhere to live. This proposal therefore
**includes creating `/lowongan/[id]/edit`** and wiring the existing action to it. That is a
prerequisite, not a nice-to-have.

### Blocker 2 — 5 failing tests, now fixed.

`bun run test` was **failing** on `main`. Two real defects in my own code from the last commit,
found and fixed in this pass:

| Defect | Symptom | Fix |
|---|---|---|
| `formatRupiah` stripped `,0`, but `toFixed(1)` emits `.0` | `20_000_000` → `"20,0 jt"` | strip `\.0$` **before** the comma swap |
| Garbled test literal | `toBe('NegNESOTASI'.replace(...))` | corrected to `'Negosiasi'` |

```
Test Files  2 passed (2)
     Tests  43 passed (43)
```

> Lesson: I earlier reported "lint/build green" as if that meant done. It didn't — a green build
> says nothing about whether tests pass, and 5 were red. Both gates now run together.

---

## 1. Design goals

Your request: *"official website of job poster, company logo, etc — to make the job post more
elegant and verified."*

That splits into three jobs, and conflating them is the main risk:

| Goal | Fields | Trust signal? |
|---|---|---|
| **Identity** — who is hiring | `company_logo_url`, `company_size`, `industry` | Presentation |
| **Authority** — prove it's real | `website_url`, `official_email` | ✅ Yes — feeds Verified |
| **Contact** — how to reach them | existing `contacts` JSONB, `link_apply` | Presentation |

**Key principle:** a field must never *look* like a trust signal without being checked. A
`website_url` the poster typed is **not** verification — it's a claim. It becomes evidence only
once an admin verifies it, or when the domain matches the company (§5).

---

## 2. Proposed fields

| Field | Type | Required | Why |
|---|---|---|---|
| `company_logo_url` | TEXT | ➖ | Visual anchor on card + detail. Biggest "elegance" win. |
| `company_size` | enum | ➖ | Filterable: `micro`/`small`/`medium`/`large`/`enterprise` |
| `industry` | TEXT | ➖ | Grouping + search |
| `website_url` | TEXT | ➖ | Official site. **Primary verification evidence.** |
| `official_email` | TEXT | ➖ | Company-domain email — far harder to spoof than Gmail. |
| `contact_person` | TEXT | ➖ | Named contact; common in Indonesian SME postings. |
| `contact_phone` | TEXT | ➖ | Covers the common case without the free-text `contacts` blob. |

Deliberately **not** added: company description (duplicates `deskripsi`), address (PII risk;
`lokasi` already exists).

### 2.1 Schema — `0006_job_company_fields.sql`

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size_enum') THEN
    CREATE TYPE public.company_size_enum AS ENUM
      ('micro','small','medium','large','enterprise');
  END IF;
END $$;

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS company_size    public.company_size_enum,
  ADD COLUMN IF NOT EXISTS industry        TEXT,
  ADD COLUMN IF NOT EXISTS website_url     TEXT,
  ADD COLUMN IF NOT EXISTS official_email  TEXT,
  ADD COLUMN IF NOT EXISTS contact_person  TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone   TEXT;

-- http(s) only. Blocks javascript:/data: at the database layer.
ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_website_scheme_chk
  CHECK (website_url IS NULL
         OR website_url ~* '^https?://[a-z0-9.-]+(:[0-9]+)?(/|$)');

ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_official_email_chk
  CHECK (official_email IS NULL
         OR official_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$');

ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_company_logo_chk
  CHECK (company_logo_url IS NULL
         OR (company_logo_url ~* '^https://'
             AND char_length(company_logo_url) <= 500));

CREATE INDEX IF NOT EXISTS idx_jobs_industry
  ON public.job_postings (status, industry) WHERE industry IS NOT NULL;
```

All **nullable + additive** — existing rows untouched, same discipline as `0004`.

### 2.2 Logo: URL vs upload

| | Supabase Storage upload | External URL paste |
|---|---|---|
| Setup | New bucket + 4 storage policies + uploader | None |
| Storage cost | Your bucket | Poster's host |
| Broken image risk | Low (you own it) | **High** — hotlink can die |
| Moderation | Solved by the `gallery` bucket | **Unsolved** — no admin view |
| Works when HR posts remotely | ❌ needs auth | ✅ |

**Recommendation: external URL in v1.** Company logos are third-party assets; making alumni
re-upload a logo their own site already hosts is friction with no benefit, and it reopens the
storage-moderation problem the gallery already spent a migration on.

Uploads later? Add a `company-logos` bucket and reuse the `0004_alumni_admin` delete RPC pattern.

**Enforce a host allowlist** so a poster can't point `company_logo_url` at an
attacker-controlled host and use the card as a tracking pixel:

```ts
// lib/jobs/company.ts
const ALLOWED_LOGO_HOSTS = ['supabase.co', 'zotizozgkzzuhrwbxoud.supabase.co'];

export function isAllowedLogoUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:') return false;
    return ALLOWED_LOGO_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
```


---

## 3. The edit page (`/lowongan/[id]/edit`)

`updateOwnJobAction` exists but is unreachable. This is the piece that makes the feature
coherent.

### 3.1 Route — `app/lowongan/[id]/edit/page.tsx`

| Rule | Behaviour |
|---|---|
| Not signed in | `redirect('/login?next=…')` |
| Not the author | `notFound()` — never reveal another user's draft |
| `status === 'active'` | Read-only: "Lowongan sudah tayang. Perubahan perlu ditinjau admin." |
| pending / hidden / rejected | Editable form |
| `verification === 'verified'` | Verification is **cleared on save** (content changed) |

**The last rule matters most.** An admin verified the company; the author then edits the text.
The trust mark must not silently carry over to content nobody reviewed.

### 3.2 Form — `JobEditForm.tsx`

Reuse the create form's fields plus the new ones, grouped:

1. **Posisi** — judul, perusahaan, deskripsi
2. **Perusahaan** — logo URL, size, industry, website, official email
3. **Lokasi & kompensasi** — lokasi, work mode, salary, expiry
4. **Kontak** — contact person, phone, links

### 3.3 Server action

`updateOwnJobAction` currently updates only `judul` + `deskripsi`. Add the rest, and reset
verification:

```ts
.update({
  judul,
  deskripsi,
  company_logo_url: companyLogo || null,
  company_size: companySize,
  industry: industry || null,
  website_url: website || null,
  official_email: officialEmail || null,
  contact_person: contactPerson || null,
  contact_phone: contactPhone || null,
  // Content changed after a trust mark — force re-review.
  verification: 'unverified',
  verified_by: null,
  verified_at: null,
})
```

**Re-verify on edit** is the single most important rule in this document. Without it, a
verified badge becomes a licence to change anything.

---

## 4. Display

### 4.1 Card

```
┌────────────────────────────────────────┐
│ ┌────┐ Senior SCADA Engineer    [✓]    │
│ │logo│ 🏢 PT PLN (persistence)          │
│ └────┘ 📍 Bogor · 💼 Penuh · 🏠 Onsite   │
└────────────────────────────────────────┘
```

- 48×48 logo, rounded, `object-cover`, initials fallback on load failure.
- `aria-hidden` on the logo — the `perusahaan` text already carries the name.
- Server-render the initials placeholder behind the `<img>` so no `onError` handler is needed.

### 4.2 Detail

New "Perusahaan" block: logo, size, industry, and a website link with
`target="_blank" rel="noopener noreferrer"`.

### 4.3 New design tokens

```css
.job-logo { @apply h-12 w-12 shrink-0 rounded border border-outline-variant object-cover bg-white; }
.company-meta { @apply meta-line; }
.website-link {
  @apply inline-flex items-center gap-1 text-primary-container underline hover:text-tech-black;
}
```

Reuses `meta-line` from the earlier proposal — no new colour tokens.

---

## 5. Making it genuinely "verified"

Presentation alone is not verification. Three escalating levels:

| Level | Signal | Who grants | Cost |
|---|---|---|---|
| 0 | None | — | — |
| 1 | Company fields present | Automatic | Free |
| 2 | `verification='verified'` | Admin with `verify_jobs` | Manual review |
| 3 | **Domain match** — `official_email` domain == `website_url` domain | Automatic | Free, strong |

**Level 3 is the highest-value idea here** and costs almost nothing:

```ts
/**
 * True when the official email sits on the same registrable domain as the
 * website. A Gmail address proves nothing; hr@pln.co.id + pln.co.id does.
 * Deliberately crude (no PSL) — treat as a *signal*, never as proof.
 */
export function hasMatchingDomain(
  website: string | null | undefined,
  email: string | null | undefined
): boolean {
  if (!website || !email) return false;
  const host = (() => {
    try { return new URL(website).hostname.toLowerCase(); } catch { return null; }
  })();
  const domain = email.split('@')[1]?.toLowerCase();
  if (!host || !domain) return false;
  const root = (d: string) => d.split('.').slice(-2).join('.');
  return root(host) === root(domain);
}
```

**Caveat, stated plainly:** without a Public Suffix List, `pln.co.id` and `go.id` both reduce
to `co.id`, so a match can be a false positive. Acceptable as a *hint* shown to admins — never
auto-grant Verified on it. A real PSL dependency is a follow-up if this becomes a gate.


---

## 6. Validation

Server-side, mirroring the DB CHECKs so users get Indonesian messages, not raw Postgres errors:

```ts
export function validateCompanyFields(f: {
  website?: string; officialEmail?: string; companyLogo?: string;
}): { error: string | null } {
  if (f.website && !/^https?:\/\//i.test(f.website.trim())) {
    return { error: 'Situs web harus diawali http:// atau https://' };
  }
  if (f.officialEmail && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.officialEmail.trim())) {
    return { error: 'Format email resmi tidak valid.' };
  }
  if (f.companyLogo && !isAllowedLogoUrl(f.companyLogo.trim())) {
    return { error: 'Logo harus berupa URL https dari domain yang diizinkan.' };
  }
  return { error: null };
}
```

`javascript:alert(1)` fails the scheme regex. `data:image/png;base64,…` fails the allowlist.

---

## 7. Implementation plan

| # | PR | Contents | Gate |
|---|---|---|---|
| 1 | `0006_job_company_fields.sql` | Enum, 7 columns, 3 CHECKs, index | Existing rows unaffected |
| 2 | `lib/jobs/company.ts` + tests | URL validation, domain match | Covers `javascript:`, `data:`, subdomains |
| 3 | Extend `updateOwnJobAction` | New fields + reset verification | Author cannot keep a badge |
| 4 | **Create `/lowongan/[id]/edit`** | Route + form + guards | Non-author gets 404 |
| 5 | Display | Logo, company block, tokens | a11y checked |
| 6 | Detail page | Website link, "Perusahaan" block | `rel="noopener"` present |

PR 4 is the blocker-removal PR — it makes the feature the request assumes already exists.

---

## 8. Testing

- `tests/unit/company.test.ts` — `isAllowedLogoUrl`, `hasMatchingDomain`, `validateCompanyFields`
  - rejects `javascript:`, `data:`, `http://` for logo
  - accepts a real Supabase URL
  - domain match: same host ✅, same registrable domain ✅, different ❌, Gmail ❌
- `tests/unit/jobs-format.test.ts` — unchanged, must stay green
- Integration (needs DB):
  - author edits a **verified** posting → `verification` resets to `unverified`
  - non-author hits `/lowongan/[id]/edit` → 404
  - `website_url='javascript:alert(1)'` → rejected by CHECK

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Edit keeps a stale Verified badge** | **Critical** | Reset verification in the update action (§3.3) |
| `company_logo_url` used as tracking pixel | High | Host allowlist `isAllowedLogoUrl` |
| `javascript:` in website/email | High | Scheme CHECK + server validation |
| Logo hotlink breaks later | Medium | Accepted in v1, documented |
| Unbounded URL length | Low | `char_length <= 500` CHECK |
| Domain-match false positives | Medium | Signal only, never auto-grant (§5) |
| Field sprawl — 7 new columns | Medium | Each earns its place; company description excluded |

---

## 10. Open questions

1. **Logo: external URL only, or uploads too?** Recommend URL-only in v1 (§2.2).
2. **Should `website_url` be required for Verified?** Recommend **yes** — the cheapest real
   evidence. Otherwise Verified stays a manual opinion.
3. **Allowlist Supabase for logos, or any HTTPS host?** Allowlist is safer but blocks posters
   whose logo lives elsewhere. Your call.
4. **Domain match (level 3) — admins only, or public?** Recommend admins only.
5. **Should an author edit an `active` posting at all?** Currently read-only in my design;
   editing a live posting unreviewed is a spam vector.
6. **Add these fields to `/lowongan/baru` too?** Recommend yes, so data is populated from day one.

---

## 11. Related documentation

| Doc | Location |
|---|---|
| Verification + rich description | [`JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md`](./JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md) |
| Job board design system | [`JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md`](./JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md) |
| Implementation tasks | [`IMPLEMENTATION_TASKS.md`](./IMPLEMENTATION_TASKS.md) |
| Deployment addresses | [`DEPLOYMENT_ADDRESSES.md`](./DEPLOYMENT_ADDRESSES.md) |

---

**Status:** Proposal only. The single code change in this pass was **fixing 5 failing tests**
(`formatRupiah` + a garbled test literal) — no feature code was added.
**Prepared:** 2026-09-27 · `main` @ `16ce8f1`

