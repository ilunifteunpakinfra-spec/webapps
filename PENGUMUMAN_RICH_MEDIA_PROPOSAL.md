# Design Proposal — Pengumuman Rework: Rich Text, Images, Auto-Gallery

> **Status:** PROPOSAL — for review. **No code, schema, or config changed.**
> **Scope:** `app/pengumuman/**` — rich-text composer, inline images, auto-mirror to gallery.
> **Prepared:** 2026-09-27 · **Base:** `main` @ `16ce8f1`
> **Related:** [`JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md`](./JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md) §3 (rich-text renderer this reuses)

---

## 0. Summary

| # | Request | Approach | Risk |
|---|---------|----------|------|
| A | **Rich text in `isi`** | Reuse the Markdown + sanitize renderer from the jobs proposal | Medium — XSS boundary |
| B | **Insert images in the post** | New `announcement_images` table + client uploader to the `gallery` bucket | Medium |
| C | **Auto-show in gallery with caption** | `source_type`/`source_id` provenance on `event_gallery`; new photo enters the **existing** `pending` queue | Medium — moderation coupling |
| D | **Simple, elegant form** | 2-column on desktop, single column mobile; shared `RichTextEditor` | Low |

> ⚠️ **C is the decision that needs your input.** Auto-mirroring into the gallery means
> announcement images enter the same admin moderation queue as event photos. That is
> deliberate (§4) — but it means an approved announcement can show a *pending* (invisible)
> image. Two options are compared there.

---

## 1. Current state (verified)

| Fact | Evidence |
|---|---|
| `announcements` has 6 columns: `judul`, `isi`, `kategori`, `status`, `created_at`, `posted_by` | `0001_init.sql:115` |
| `isi` rendered as **plain text** via `whitespace-pre-line` | `app/pengumuman/page.tsx:141` |
| **No** detail page — the list renders full bodies inline | `app/pengumuman/page.tsx:140` |
| `announcement_category_enum` = `pencapaian`/`lowongan`/`event`/`umum` | `0001_init.sql:12` |
| `status` ∈ `('active','hidden')` — hide/restore only, **no pending state** | `0003:22-24` |
| Local `daysAgo()` — third duplicate of `timeAgo()` | `app/pengumuman/page.tsx:40` |
| Gallery: `event_gallery` has `event_id TEXT` (**no FK**), `alumni_id`, `foto_url`, `caption` | `0001_init.sql:170` |
| Gallery photos are `pending` by default, need `moderate_gallery` approval | `0018_gallery_moderation.sql:43` |
| `addGalleryPhotoAction` inserts with `status:'pending'` — **the precedent to follow** | `app/actions/gallery.ts:58-64` |
| `gallery` bucket + 4 storage policies already exist | `storage-policies.sql` |

**Reusable:** the `gallery` bucket, its RLS, the compression client, and the whole
`pending → active/hidden` moderation flow. This proposal adds no new storage infrastructure.

---

## 2. Part A — Rich text

Reuse from `JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md` §3.3:
`lib/jobs/description.ts` → **rename to `lib/content/rich-text.ts`** so jobs and
announcements share one audited implementation.

```ts
// lib/content/rich-text.ts
export function renderRichText(markdown: string | null | undefined): string
```

One renderer, one allowlist, one security boundary. Same rules: server-component only,
`dangerouslySetInnerHTML` in exactly one file, sanitize on **every** render.

Prose styles move from `.job-prose` to a shared `.rich-text` (same PR) so both pages use
identical typography.

**Existing `isi` values are plain text** — Markdown renders them unchanged, so **no data
migration is required.**

### 2.1 Length

```sql
-- Backfill first: 0001 has no limit.
UPDATE public.announcements SET isi = left(isi, 20000) WHERE char_length(isi) > 20000;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_isi_chk
  CHECK (isi IS NULL OR char_length(isi) <= 20000);
```

---

## 3. Part B — Images in the announcement

### 3.1 New table

```sql
CREATE TABLE public.announcement_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,     -- e.g. "<uid>/<uuid>.jpg"
  public_url      TEXT NOT NULL,
  caption         TEXT,              -- the "small part caption"
  alt_text        TEXT NOT NULL,     -- required for a11y
  position        INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT announcement_images_status_chk
    CHECK (status IN ('pending','active','hidden'))
);

CREATE INDEX idx_announcement_images_announcement
  ON public.announcement_images (announcement_id, position);

ALTER TABLE public.announcement_images ENABLE ROW LEVEL SECURITY;

-- The author sees their own; the public sees only approved ones.
CREATE POLICY "read_announcement_images" ON public.announcement_images
  FOR SELECT USING (status = 'active' OR public.is_admin());
```

### 3.2 Storage

**Reuse the `gallery` bucket** — already public-read, already scoped by
`(storage.foldername(name))[1] = auth.uid()`, and already paired with the compression client
(`GALLERY_MAX_DIMENSION 1280`, `GALLERY_QUALITY 0.85`).

Path convention `announcement-images/<uid>/<uuid>.jpg`. This matters: the existing gallery
delete RPC matches `bucket_id='gallery' AND name = v_path`, so the same bucket keeps deletion
reachable without a new RPC.

### 3.3 Client uploader

`components/content/ImageUploader.tsx` (`'use client'`):

- Drag-and-drop **or** click-to-browse
- Client-side compression before upload (gallery settings)
- Per-image `alt_text` + `caption`
- Reorder via up/down buttons (no drag library — `position` is an integer)
- Reject non-`image/*` and > 8 MB before any network call
- Max 6 images per announcement

### 3.4 Accessibility — non-negotiable

`alt_text` is `NOT NULL`. Images render as:

```tsx
<img src={url} alt={alt_text} loading="lazy" className="announcement-img" />
```

No decorative `alt=""` shortcut — an announcement image carries meaning. The form blocks
submit until every image has alt text.

---

## 4. Part C — Auto-mirror to the gallery

Your requirement: *"the image insert on this page automatically add and can be showed on
gallery with small part caption or description."*

### 4.1 Design choice: **read-through, not a copy**

| | **Option 1 — copy rows** | **Option 2 — provenance (recommended)** |
|---|---|---|
| How | Duplicate each image into `event_gallery` | Add `source_type` / `source_id` to `event_gallery`; gallery unions both sources |
| Duplication | Two rows per image | One row |
| Caption drift | Copies go stale when the author edits | Single source of truth |
| Delete | Must delete from **both** tables | Cascade handles it |
| Migration | Backfill needed | Small ALTER |

**Recommended: Option 2.** Copying creates a synchronization problem immediately — edit the
caption in one place and the other is wrong. Provenance keeps one row.

### 4.2 Schema

```sql
ALTER TABLE public.event_gallery
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'event'
    CHECK (source_type IN ('event','announcement')),
  ADD COLUMN IF NOT EXISTS source_id   UUID;

CREATE INDEX idx_event_gallery_announcement
  ON public.event_gallery (source_type, source_id)
  WHERE source_type = 'announcement';

-- A mirrored row must point at a real announcement.
ALTER TABLE public.event_gallery
  ADD CONSTRAINT event_gallery_announcement_fk
  FOREIGN KEY (source_id) REFERENCES public.announcements(id) ON DELETE CASCADE;
```

> Existing rows default to `source_type='event'`, `source_id=NULL` — **no backfill needed**.

### 4.3 The moderation coupling — **DECIDED: Option A (auto-active)**

> **Decision (2026-09-27, maintainer): Option A.** Announcement images become `active` when the
> announcement is published, without a separate `moderate_gallery` approval step.
> The consequences and the compensating controls below are mandatory, not optional.

#### What A actually widens — read this before shipping

`event_gallery` is currently the **most moderated content surface** in the app. `0018` made
every upload `pending` by default and required `moderate_gallery`. Option A removes that gate
for one class of image. Concretely:

```
TODAY  any logged-in user  → upload → PENDING → needs moderate_gallery → ACTIVE
WITH A verified alumni     → post announcement → image goes straight to ACTIVE
```

The relevant boundary is **not** "any logged-in user" — it is **verified alumni**. Posting an
announcement already requires `status_verifikasi = true` (`app/actions/announcements.ts:49`,
RLS `verified_alumni_post_announcements` at `schema.sql:439`). So the widening is:

> **A verified alumnus gains the ability to publish an image to the public gallery.**

That is a real trust change and it is stated plainly here, in `SECURITY.md` (§4.3 note), and in
the code comments at the insert site.

#### Compensating controls — all four are required

A is only shippable with these. Each closes a specific hole the queue used to cover.

**C1 — Cap and rate-limit.** Hard limits in the schema, not just the form:

```sql
ALTER TABLE public.event_gallery
  ADD CONSTRAINT event_gallery_announcement_image_cap
  CHECK (source_type <> 'announcement' OR position IS NULL);
-- enforced in the action: max 6 images per announcement
```

Max **6 images per announcement**, max **8 MB each**, and a per-user daily cap (e.g. 20
images/day) checked in the action. Unbounded image publishing from one account is the main
abuse vector once the queue is gone.

**C2 — Every announcement image is a reportable, hideable object.** The existing
`content_reports` flow (`target_type` list in `lib/constants.ts:64`) already supports
`'gallery'`, and `admin_delete_gallery_photo` already removes the row **and** the storage
object. Extend `target_type` with `'announcement'` so an announcement's images can be reported
directly, and ensure a `hidden` gallery row also hides inside its announcement.

**C3 — Audit trail.** Each auto-activation writes one `admin_activity_log` row
(`aksi: 'auto_publish_announcement_image'`, `target_type: 'announcement'`) with
`detail: { announcement_id, gallery_id, source: 'auto' }`. That way a question like *"who put
this in the gallery?"* is always answerable, even though no admin approved it.

**C4 — Admin surface to reverse it.** The moderation page must let an admin hide or delete an
auto-published image without a full approval flow. `GalleryActions` already does hide/delete;
it just needs to render for `source_type='announcement'` rows too.

#### Residual risk — accepted, with an escape hatch

Accepted: an abusive **verified** alumnus can put inappropriate images in the gallery without
pre-approval. Mitigations are C1–C4 plus the existing report button. If abuse appears in
practice, the escape hatch is a one-line change: flip the insert to `status: 'pending'` and the
queue is back. **Document that as the rollback**, so it is a known, cheap reversal rather than
a redesign.

#### Also worth doing

`announcements.status` is only `('active','hidden')` — there is **no pending state**, so
announcements publish instantly too. That is pre-existing behaviour and out of scope here, but
it means the announcement *text* was never reviewed either. Worth raising separately.


### 4.4 Caption propagation

When mirroring, `event_gallery.caption` is set from the image's own `caption`, and `event_id`
is set to the announcement title so the gallery can group/label it. If the author later edits
the caption, a server action re-syncs it — one direction only; the gallery never writes back.

---

## 5. Part D — The form: simple and elegant

### 5.1 Layout

Desktop 2-column, stacking on mobile. Left = write, right = guidance + status.

```
┌─────────────────────────────┬──────────────────────┐
│ Judul  [________________]   │  Tips menulis         │
│ Kategori [Umum        ▾]    │  ─────────────       │
│ ┌ toolbar ───────────────┐  │  • Judul < 80 char   │
│ │ B I • 1. 🔗            │  │  • ALT gambar wajib  │
│ └───────────────────────┘  │  • Maks 6 gambar    │
│ ┌ content ───────────────┐  │                      │
│ │ Tulis pengumuman…      │  │  Status gambar:      │
│ └───────────────────────┘  │  🖼 2 gambar         │
│                             │  ⏳ 1 menunggu      │
│ 🖼 Galeri (2)  [+ tambah]   │  review              │
│  [thumb] caption [x]        │  [ Publikasikan ]    │
└─────────────────────────────┴──────────────────────┘
```

"Elegant" means **less chrome, more writing**: the content box is the visual centre
(`min-h-[320px]`), the toolbar a single 40px row of ghost-icon buttons, and the right rail
muted help text that never competes with the content.

### 5.2 Shared editor

`components/content/RichTextEditor.tsx` — same toolbar spec as the jobs proposal §3.5
(`⌘/Ctrl+B/I/K`), same insert-at-cursor helper, same counter, same **no live preview** decision
(previewing would ship the sanitizer to the browser).

One editor, two consumers: `AnnouncementForm` and the future job form.

### 5.3 Admin-only publishing

Keep the existing gate: `canPost = ownProfile?.status_verifikasi === true`
(`app/pengumuman/page.tsx:81`). Verified alumni only, unchanged.

---

## 6. Pages

### 6.1 List — `/pengumuman`

The list renders the **entire** body of every announcement. With rich text and images that
becomes unusable. Change to a **teaser** card: title, category chip, relative time, author,
2-line clamp, optional 1-image thumbnail strip, click → new detail page.

Also replace the local `daysAgo()` with `timeAgo()` from `lib/utils` — that removes the
**third** duplicate of this helper in the codebase.

### 6.2 Detail — `/pengumuman/[id]` (new)

Full body via `renderRichText`, image gallery, author, report button, share-friendly metadata.

### 6.3 Image strip

```css
.announcement-img { @apply w-full rounded border border-outline-variant object-cover; }
.announcement-gallery { @apply mt-4 grid grid-cols-2 gap-3 md:grid-cols-3; }
```

Reuses existing tokens; no new colours.


---

## 7. Implementation plan

| # | PR | Contents | Gate |
|---|---|---|---|
| 1 | `0020_announcement_rich_images.sql` | `announcement_images` table, RLS, `event_gallery` provenance | Existing rows unaffected |
| 2 | **`lib/content/rich-text.ts`** | Extract from jobs proposal; rename `.job-prose` → `.rich-text` | **XSS tests green** |
| 3 | `RichTextEditor` + `ImageUploader` | Shared components | Toolbar + a11y checked |
| 4 | Update `createAnnouncementAction` | Rich text, image insert, gallery mirror | Transactional |
| 5 | `/pengumuman/[id]` detail + teaser list | New page, `timeAgo` dedupe | Build green |
| 6 | Gallery union of both sources | `source_type` filter in `GalleryView` | Existing photos still show |

**PR 2 is the review gate** — do not merge 3–5 until the sanitizer tests pass.

> ⚠️ **Sequencing:** this shares `rich-text.ts` with the jobs proposal. Build **this** PR 2
> first, then the jobs description work reuses it. Do not implement the same renderer twice.

---

## 8. Testing

- `tests/unit/rich-text.test.ts` — **mandatory XSS suite**: `<script>` stripped, `onerror=`
  stripped, `javascript:` href stripped, `data:` href stripped, external link gets
  `rel="noopener"`, valid Markdown survives. **Reuse the jobs sanitiser tests verbatim.**
- `tests/unit/announcement-images.test.ts` — alt_text required, ≤ 6 images, position ordering,
  caption propagation
- `tests/unit/pengumuman-teaser.test.tsx` — clamps body, hides `pending` images from the public
- Integration (needs DB): publish with 2 images → 2 `pending` gallery rows with matching
  captions; approve one → appears publicly; delete the announcement → cascade clears the
  mirrored rows

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **XSS via `isi` or `alt_text`** | **Critical** | Shared allowlist renderer; `alt_text` rendered as a React attribute (auto-escaped), never HTML |
| Announcement image reaches gallery unreviewed | **High** | Default to option B (pending queue), §4.3 |
| Copy-into-gallery drift | High | Provenance, not duplication (§4.1) |
| Orphaned storage objects on cascade | Medium | `ON DELETE CASCADE` removes the row, not the object; extend `admin_delete_gallery_photo` |
| `event_gallery` grows unbounded | Low | `.limit(60)` already; add a `source_type` filter |
| Two rich-text renderers diverge | Medium | **One** `lib/content/rich-text.ts` — extract, don't duplicate |
| Teaser change breaks existing links | Low | No existing detail URLs, so nothing to break |
| Large uploads slow the form | Medium | Compress client-side, cap 6 images and 8 MB |

---

## 10. Open questions

1. **Gallery moderation for announcement images — pending (B) or auto-active (A)?** §4.3.
   I recommend **B**. This is the one decision I need before implementation.
2. **Should the body render images inline**, or images only in a strip below the text?
   Recommend **strip below** — inline images in Markdown are harder to moderate.
3. **Max 6 images per announcement?** Raise or lower.
4. **Should `event`-category announcements auto-mirror all images**, or is mirroring an
   explicit opt-in checkbox? Recommend **opt-in** — not every announcement is an event.
5. **Do we need a detail page now?** The teaser change requires it. Recommend yes; it is also
   what makes rich text readable.
6. **Apply the same editor to `polls` / `groups`?** Recommend later, once this is proven.

---

## 11. Related documentation

| Doc | Location |
|---|---|
| Verification + rich description (source of §2) | [`JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md`](./JOB_VERIFICATION_AND_DESCRIPTION_PROPOSAL.md) |
| Company fields (shares `lib/jobs`) | [`JOB_COMPANY_FIELDS_PROPOSAL.md`](./JOB_COMPANY_FIELDS_PROPOSAL.md) |
| Job board design system | [`JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md`](./JOB_BOARD_DESIGN_SYSTEM_PROPOSAL.md) |
| Implementation tasks | [`IMPLEMENTATION_TASKS.md`](./IMPLEMENTATION_TASKS.md) |

---

**Status:** Proposal only. No code, schema, or dependency was modified.
**Prepared:** 2026-09-27 · `main` @ `16ce8f1`

