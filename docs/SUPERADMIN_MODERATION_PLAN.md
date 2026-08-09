# Super Admin Management & Moderation — Implementation Plan

**Status:** In Progress — Phase 1 shipped (2026-08-08) · **Date:** 2026-08-08 · **Target:** ILUNI FT ELEKTRO UNPAK WebApps (Next.js 15 + Supabase)

---

## 1. Executive Summary

The platform already has a functional role system (`super_admin` / `admin` / alumni via `user_metadata.role`), a full RLS layer (15 `admin_bypass_*` policies), and a basic admin dashboard (stats, verification queue, CSV import/export). What is missing is **management and moderation depth**: there is no way for admins to manage user roles, ban accounts, edit/delete any content, review community reports, or see an audit trail of admin actions.

This plan proposes **4 feature groups** delivered in **4 phases**, with zero breaking changes to public pages. Every change is mapped to concrete existing files, tables, and policies. The database delta is a single additive migration (`0002_superadmin_moderation.sql`) that stays 1:1 with the live project.

**Effort estimate:** ~4–6 dev-days total (Phase 1 = 1–1.5 days).

**Key design decision — capability-based admin roles:** instead of a flat `admin` role, admins carry a set of **capabilities** (`moderate_jobs`, `moderate_polls`, `manage_alumni`, …). `super_admin` implicitly holds every capability and can promote any user to `admin` with a chosen subset. This lets the superadmin delegate moderation scopes per person.

**Security hardening included:** today `is_admin()` authorizes from `auth.users.raw_user_meta_data`, which the **user can edit themselves** via `supabase.auth.updateUser()` — a self-promotion risk. The plan moves role + capabilities to `raw_app_meta_data` (server-managed only) as part of the migration.

---

## 2. Current State (What Exists)

| Concern | Where | Notes |
|---|---|---|
| Role model | `lib/constants.ts` `ADMIN_ROLES = ['super_admin','admin']` | Both roles treated identically everywhere |
| Auth check | `lib/supabase/user.ts` `isAdminUser()` | Reads `user_metadata.role` |
| Authorization source | `is_admin()` reads `raw_user_meta_data->>'role'` | ⚠️ **user-editable via `updateUser()` — self-promotion risk** |
| Route guard | `middleware.ts` `ADMIN_PREFIXES = ['/admin']` | Blocks non-admins at edge |
| RLS bypass | `is_admin()` SECURITY DEFINER + 15 `admin_bypass_*` policies | Admins can already read/write every table at DB level |
| Admin dashboard | `app/admin/page.tsx` | Stats, angkatan/company bars, verification queue, CSV import/export |
| Admin actions | `app/actions/admin.ts` | Only `verifyAlumniAction` |
| Admin APIs | `app/api/admin/export`, `app/api/admin/import` | CSV export + import |

**Key insight:** because the `admin_bypass_*` policies exist, server-side admin **delete/update** operations already work at the database level. The missing pieces are the **actions, UI, and guardrails** — not the DB permissions.

---

## 3. Gap Analysis

| Capability needed | Missing today |
|---|---|
| Role management (promote/demote admin) | No UI, no RPC, role only settable in dashboard manually |
| Account bans / suspension | No concept wired to auth (`banned_until` unused) |
| Capability-based admin delegation | Roles are binary (`admin` = everything); no per-admin scopes, no promote-with-permissions UI |
| Authorization storage | Role lives in client-mergeable `user_metadata` |
| Delete/hide any content (jobs, polls, announcements, groups, gallery) | No actions or UI (DB allows it via RLS bypass) |
| Community reports / flags | No `content_reports` table |
| Audit trail of admin actions | No `admin_activity_log` table |
| Full alumni management (edit/delete/reset contribution/bulk verify) | Only single verify + CSV import |
| Moderation KPIs on dashboard | No pending-report / content counts |

---

## 4. Proposed Features

### F1 — Admin Role Hierarchy & Capability-Based Permissions

**Roles**
- `super_admin` — implicit **all** capabilities; the only role that can promote/demote/ban users.
- `admin` — has exactly the capabilities the superadmin granted at promotion time (adjustable later).
- alumni — no admin capabilities.

**Capability catalog** (canonical list in `lib/constants.ts` → `ADMIN_CAPABILITIES`):

| Capability | Grants | Default for new admin |
|---|---|---|
| `manage_users` | promote/demote/ban (in practice super_admin only) | — |
| `manage_alumni` | edit/delete any alumni record, bulk verify/unverify, reset contribution | ✅ |
| `moderate_jobs` | delete/close job postings | ✅ |
| `moderate_announcements` | delete announcements | ✅ |
| `moderate_polls` | delete/close polls | ✅ |
| `moderate_groups` | delete groups / remove members | ✅ |
| `moderate_gallery` | delete gallery photos (incl. storage object) | ✅ |
| `moderate_reports` | resolve/dismiss community reports | ✅ |
| `view_audit` | read admin activity log | ✅ |
| `import_export` | CSV import/export | ✅ |

**Code**
- `lib/constants.ts`: add `SUPER_ADMIN_ROLES = ['super_admin']` and `ADMIN_CAPABILITIES` (catalog above).
- `lib/supabase/user.ts`: add `isSuperAdmin(user)`, `getAdminLevel(user)`, `hasCapability(user, capability)`.
- `app/actions/users.ts`: `setUserRoleAction(targetUid, role, capabilities[])` — super_admin only; validates names against `ADMIN_CAPABILITIES`.
- RPC `admin_set_role(target_uid, role, capabilities TEXT[])` — **super_admin enforced inside the function**; writes to `auth.users.raw_app_meta_data`.
- RPC `has_admin_capability(cap TEXT)` SECURITY DEFINER — defense in depth for moderation actions.
- Every admin/moderation action gates on `hasCapability()` in the server action **and** the RPC guard where applicable.
- UI: promote dialog with capability checkboxes (`/admin/users`); capability-gated buttons and nav items (actions the admin lacks are hidden/disabled).

### F2 — User Management (Accounts)
- `app/admin/users/page.tsx` — searchable table of `auth.users` joined to `alumni` (name, email, angkatan, role, verified, banned, created).
- Actions (`app/actions/users.ts`):
  - `setUserRoleAction(targetUid, role, capabilities[])` (super_admin only) — promote dialog renders capability checkboxes; demoting clears capabilities.
  - `banUserAction` / `unbanUserAction` — sets `auth.users.banned_until` via RPC; Supabase Auth blocks banned users at login, so no RLS change is needed.
- Capability badges shown per admin; audit each action (F5).

### F3 — Content Moderation (All Features)
- `app/actions/moderation.ts` — typed delete/restore actions per entity, all guarded by `isAdminUser()`:
  - `deleteJobAction`, `deleteAnnouncementAction`, `deletePollAction` (cascades options/votes), `deleteGroupAction`, `deleteGalleryPhotoAction` (removes storage object too), `deleteEndorsementAction`, `deleteSkillAction` (admin override of a user's self-rating), `closePollAction` (soft-expire).
- `app/admin/moderation/page.tsx` — queue of recent content per type with quick "Hapus" / "Tutup" buttons, plus a resolved-items tab.
- Report buttons (F4) feed the same page.

### F4 — Community Reports (Flag & Review)
- New table `content_reports` (below) + RLS (authenticated can insert own report; admins read/resolve).
- `app/actions/reports.ts`: `submitReportAction` (any logged-in user), `resolveReportAction` (admin: keep/remove + close).
- "Laporkan" buttons added to: job detail, announcement, poll, group, gallery photo, profile.

### F5 — Audit Log
- New table `admin_activity_log` (below) + RLS (admins only, via `is_admin()`).
- SECURITY DEFINER RPC `admin_log_activity(aksi, target_type, target_id, detail)` called by every admin mutation.
- `app/admin/audit/page.tsx` — filterable log (action, admin, target, timestamp).

### F6 — Alumni Management (Admin CRUD) ✅ SHIPPED (Phase 3)
- `app/admin/alumni/page.tsx` — full table with server-side pagination + search (nama/angkatan/pekerjaan/perusahaan/email).
- `app/actions/alumni-admin.ts`: `updateAlumniAdminAction` (edit any field, e.g. fix typos, angkatan), `deleteAlumniAdminAction` (cascade removes profile + related rows + storage objects + auth account), `resetContributionAction`, `bulkVerifyAction` (list of ids), `unverifyAlumniAction`.
- Verification actions record `verify/unverify` entries in the audit log via `admin_log_activity` (no schema column needed).

### F7 — Dashboard & Moderation KPIs
- Extend `app/admin/page.tsx`: pending reports count, flagged-content count, unverified ratio, registrations per month (mini bar chart), quick links to new admin sections.
- New `app/admin/nav` component (shared admin sub-navigation) — `components/admin/AdminNav.tsx`.

---

## 5. Database Changes (Single Additive Migration)

File: `supabase/migrations/0002_superadmin_moderation.sql` (mirrored into `supabase/schema.sql` + `supabase/apply-all.sql`).

### 5.1 New tables

```sql
-- Community reports (any authenticated user can flag content)
CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES alumni(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN
    ('job', 'announcement', 'poll', 'group', 'gallery', 'profile')),
  target_id UUID NOT NULL,
  alasan TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_by UUID REFERENCES alumni(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_content_reports_status ON content_reports (status, created_at DESC);

-- Audit trail of admin actions
CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES alumni(id) ON DELETE SET NULL,
  aksi TEXT NOT NULL,          -- e.g. 'verify_alumni', 'delete_job', 'set_role'
  target_type TEXT,            -- e.g. 'alumni', 'job_postings'
  target_id UUID,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_admin_activity_created ON admin_activity_log (created_at DESC);
```

### 5.2 New SECURITY DEFINER RPCs (follow the hardened `is_admin()` pattern: `SET search_path = ''`, fully-qualified `auth.*`)

```sql
-- Promote/demote + grant capabilities — super_admin ONLY (checks caller's own role).
-- Role + capabilities live in raw_app_meta_data (NOT client-editable).
CREATE OR REPLACE FUNCTION admin_set_role(target_uid UUID, new_role TEXT, capabilities TEXT[] DEFAULT '{}')
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  caller_role TEXT;
  valid_caps TEXT[] := ARRAY['manage_alumni','moderate_jobs','moderate_announcements',
                            'moderate_polls','moderate_groups','moderate_gallery',
                            'moderate_reports','view_audit','import_export'];
BEGIN
  SELECT raw_app_meta_data->>'role' INTO caller_role FROM auth.users WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'super_admin' THEN RETURN false; END IF;
  -- strip any capability not in the whitelist
  SELECT ARRAY(SELECT cap FROM unnest(capabilities) AS t(cap)
               WHERE t.cap = ANY(valid_caps))
    INTO capabilities;
  UPDATE auth.users SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', new_role, 'capabilities', to_jsonb(capabilities))
  WHERE id = target_uid;
  RETURN FOUND;
END; $$;

-- Capability check for moderation actions (defense in depth; mirrors is_admin pattern)
CREATE OR REPLACE FUNCTION has_admin_capability(cap TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE meta jsonb;
BEGIN
  SELECT raw_app_meta_data INTO meta FROM auth.users WHERE id = auth.uid();
  IF meta->>'role' = 'super_admin' THEN RETURN true; END IF;
  RETURN meta->'capabilities' ? cap;
END; $$;

-- One-time migration: copy existing role claims from user_meta -> app_meta.
-- Run once after deploy; then is_admin() reads app_meta only (see §9).
CREATE OR REPLACE FUNCTION admin_migrate_roles()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n INT := 0; r RECORD;
BEGIN
  FOR r IN SELECT id, raw_user_meta_data->>'role' AS role FROM auth.users
           WHERE raw_app_meta_data->>'role' IS NULL
             AND raw_user_meta_data->>'role' IS NOT NULL
  LOOP
    UPDATE auth.users SET raw_app_meta_data =
      COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', r.role, 'capabilities', to_jsonb(ARRAY[]::TEXT[]))
    WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;

-- Ban / unban accounts (admin+)
CREATE OR REPLACE FUNCTION admin_ban_user(target_uid UUID, until_ts TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN false; END IF;
  UPDATE auth.users SET banned_until = until_ts WHERE id = target_uid;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION admin_unban_user(target_uid UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN false; END IF;
  UPDATE auth.users SET banned_until = NULL WHERE id = target_uid;
  RETURN FOUND;
END; $$;

-- Audit log writer (admins only)
CREATE OR REPLACE FUNCTION admin_log_activity(
  p_aksi TEXT, p_target_type TEXT, p_target_id UUID, p_detail JSONB DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RETURN false; END IF;
  INSERT INTO public.admin_activity_log (admin_id, aksi, target_type, target_id, detail)
  VALUES (auth.uid(), p_aksi, p_target_type, p_target_id, p_detail);
  RETURN true;
END; $$;
```

> `admin_ban_user`/`admin_unban_user` must also **revoke EXECUTE from `anon`** (linter lint 0028/0029 hardening — only `authenticated` keeps it, or use a `grant` to restrict). The existing `is_admin()` precedent keeps `anon` exec for RLS, but ban/role RPCs should be `REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated` and re-granted only to `authenticated` (still callable only when the function's internal admin check passes).

> **`is_admin()` re-point:** the existing function (used by the 15 `admin_bypass_*` policies) is re-pointed to read `raw_app_meta_data->>'role'`, with a temporary fallback to `raw_user_meta_data` during the migration window, then the fallback is dropped after `admin_migrate_roles()` runs.

> **Enforcement depth (decision for Phase 2):** capabilities are enforced in server actions + RPCs from day 1. For hard DB-level enforcement, the blanket `admin_bypass_*` policies can be split later into: `FOR SELECT USING (is_admin())` (any admin can read — required by dashboard/audit pages) + per-capability `FOR INSERT/UPDATE/DELETE` policies (e.g. `job_postings` → `has_admin_capability('moderate_jobs')`). Until then, a capable admin could mutate any table by calling PostgREST directly — acceptable for an internal admin team, but worth closing.

### 5.3 RLS for new tables

```sql
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_report_content" ON content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "admin_manage_reports" ON content_reports FOR ALL USING (public.is_admin());
-- reporters can see the status of their own reports
CREATE POLICY "reporter_view_own" ON content_reports FOR SELECT
  USING (reporter_id = auth.uid());

ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_activity" ON admin_activity_log FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_write_activity" ON admin_activity_log FOR INSERT USING (public.is_admin());
```

### 5.4 Permission notes
- Admin mutations use the existing `admin_bypass_*` policies — **no new per-table bypass policies needed**.
- `admin_set_role` is deliberately super_admin-only **inside** the function (defense in depth beyond UI).

---

## 6. Impact Matrix — Existing Source Code

| File | Change | Risk |
|---|---|---|
| `lib/supabase/user.ts` | Add `isSuperAdmin()`, `getAdminLevel()`, `hasCapability()` | None (additive) |
| `lib/constants.ts` | Add `SUPER_ADMIN_ROLES`, `ADMIN_CAPABILITIES`, `REPORT_TARGETS`, `ACTIVITY_ACTIONS` | None (additive) |
| `lib/supabase/user.ts` | Add `isSuperAdmin()`, `getAdminLevel()` | None (additive) |
| `middleware.ts` | Add `SUPER_ADMIN_PREFIXES = ['/admin/users','/admin/audit']` gate | Low — existing admin checks untouched |
| `app/admin/page.tsx` | Add `AdminNav`, KPI cards (reports pending, unverified), quick links | Low — layout additive |
| `app/actions/admin.ts` | Extend with `unverifyAlumniAction`, `bulkVerifyAction`, `setContributionAction`; audit-log calls | Low — same pattern as `verifyAlumniAction` |
| `components/Navbar.tsx` | Add admin dropdown links to new sections | Low |
| `app/actions/*.ts` (jobs, polls, announcements, groups, gallery, skills) | No signature changes; moderation lives in new `app/actions/moderation.ts` | **None** — public flows untouched |
| `app/lowongan/[id]`, `app/pengumuman`, `app/polling`, `app/galeri`, `app/grup`, `app/profil/[id]` | Optional "Laporkan" buttons (Phase 2/3) | Low |
| `supabase/schema.sql`, `0001_init.sql`, `apply-all.sql` | Append §8 (new tables + RPCs + RLS + grants); **re-point `is_admin()` to `raw_app_meta_data`** | Must stay 1:1 with live DB |
| `docs/DEPLOYMENT_ANALYSIS.md` | Document migration + RPC permission model | None |

**Explicit non-goals:** no changes to public read/insert policies, no renaming, no breaking form contracts, no changes to the login/register flow, no payment features.

---

## 7. New Files

```
app/actions/users.ts            # setUserRole, ban, unban
app/actions/moderation.ts       # delete/close per entity + audit
app/actions/reports.ts          # submitReport, resolveReport
app/actions/alumni-admin.ts     # update/delete alumni, reset contribution, bulk verify
app/admin/users/page.tsx        # account & role management (promote w/ capability checkboxes)
app/admin/users/PromoteDialog.tsx  # role select + capability checkboxes
app/admin/moderation/page.tsx   # content queue + reports queue (tabs, capability-gated)
app/admin/alumni/page.tsx       # full alumni CRUD (paginated)
app/admin/audit/page.tsx        # admin activity log viewer
components/admin/AdminNav.tsx   # shared sub-navigation
components/admin/ConfirmButton.tsx  # destructive-action confirm wrapper
components/admin/StatusBadge.tsx    # role / verification / report status badge
```

---

## 8. Implementation Phases

### Phase 1 — Foundation & Accounts (1–1.5 days) ✅ SHIPPED
- ✅ Migration `0002_superadmin_moderation.sql` (tables, RPCs, RLS, grants) → applied to live + synced `schema.sql`/`apply-all.sql`/`reset.sql`/`create-admin.sh`.
- ✅ `SUPER_ADMIN_ROLES`, `ADMIN_CAPABILITIES`, `DEFAULT_ADMIN_CAPABILITIES`, `isSuperAdmin()`, `getAdminLevel()`, `hasCapability()` (roles now read from `app_metadata`).
- ✅ `app/actions/users.ts` (setUserRole/ban/unban, all audited) + `app/admin/users/page.tsx` + promote dialog with capability checkboxes + `AdminNav`.
- ⏳ Moderation skeleton deferred to Phase 2 (only audit + user management landed; `content_reports` table + RLS are ready in the migration).
- ✅ Audit log wired to verify + role + ban/unban actions (`app/admin/audit/page.tsx`).
- ✅ `middleware.ts` super_admin gate for `/admin/users` + `/admin/audit` (roles from `app_metadata`).
- ✅ **Exit criteria:** `bunx tsc --noEmit` clean, `bun run build` clean (29 routes), live DB migration applied, live smoke test passed (superadmin → `admin_list_users` → 4 users with correct roles).
- ⚠️ **Linter note:** 6 new 0029 (authenticated-exec SECURITY DEFINER) findings on the admin RPCs are **accepted-by-design** — the functions must be callable by signed-in users and enforce admin/super_admin internally (same precedent as the existing `is_admin()` acceptance). `anon` EXECUTE is fully revoked (no new 0028 findings). `auth_sync_app_role` kept SECURITY INVOKER + `search_path=''` (no linter finding).

### Phase 2 — Full Content Moderation (1–2 days) 🚧 MOSTLY SHIPPED
- ✅ Migration `0003_content_moderation.sql` (soft-hide `status` columns for `job_postings` + `announcements`, `admin_delete_gallery_photo` SECURITY DEFINER RPC w/ storage-object removal, grants) → applied to live + synced `schema.sql`/`apply-all.sql`/`reset.sql`.
- ✅ `app/actions/moderation.ts` (hide/restore job & announcement, close/delete poll, delete group, delete gallery photo, delete endorsement, force-delete skill rating — all capability-gated + audited).
- ✅ `app/actions/reports.ts` (submit/report + resolve/dismiss, capability-gated, audited) + `components/ReportButton.tsx` (modal, login-gated).
- ✅ `app/admin/moderation/page.tsx` with Laporan / Konten tabs + `ReportActions`/`ContentActions` client buttons (capability-disabled, confirm dialogs, Indonesian).
- ✅ `AdminNav` gains Moderasi link (superOnly: false); middleware `/admin` gate already covers it.
- ✅ Report buttons mounted on job detail, pengumuman, polling, grup detail, galeri (photo card overlay), profil.
- ✅ Public reads filter `status='active'` (lowongan list + skill chips + detail, pengumuman, home jobs count).
- ⚠️ Exit criteria: tsc + build clean, live smoke of hide/restore + gallery delete RPC, deploy, commit — **in progress**.

### Phase 3 — Alumni Admin (1 day) ✅ SHIPPED
- ✅ Migration `0004_alumni_admin.sql` (`admin_delete_alumni` SECURITY DEFINER RPC: full account deletion — alumni row cascade + storage objects + `auth.users`) + `0005_storage_delete_fix.sql` (sets `storage.allow_delete_query` GUC — Supabase's `protect_objects_delete` trigger blocks direct `storage.objects` DELETE otherwise; also fixes the same latent bug in `admin_delete_gallery_photo` from Phase 2). Applied to live + synced `schema.sql`/`apply-all.sql`/`reset.sql`.
- ✅ `app/admin/alumni/page.tsx` — search (nama/angkatan/pekerjaan/perusahaan/email) + server-side pagination (20/page), gated on `manage_alumni` (not super-only).
- ✅ `app/actions/alumni-admin.ts` — updateAlumniAdminAction / deleteAlumniAdminAction / verifyAlumniAction / unverifyAlumniAction / bulkVerifyAlumniAction / resetContributionAction; all capability-gated (`requireCapability('manage_alumni')`) + audited via `admin_log_activity`.
- ✅ `app/admin/alumni/AlumniTable.tsx` + `EditAlumniModal.tsx` — bulk selection + verify bar, per-row edit modal, verify/unverify, reset contribution, delete with confirm (self-delete hidden; RPC blocks it too).
- ✅ `AdminNav` gains Alumni link (`showAlumni` prop, visible per `manage_alumni` capability; call sites updated in dashboard + moderation; super-only pages default to shown).
- ✅ CSV import contract stays stable (no role column — deferred as planned).
- ✅ Exit criteria: tsc + build clean (32 routes), live migration applied, live smoke passed (superadmin → `admin_delete_alumni` → true; alumni row + auth account deleted; non-admin attacker → false).

### Phase 4 — KPIs & Polish (1 day)
- Dashboard: pending reports, unverified %, registrations/month.
- Audit viewer filters; admin sub-nav active states; empty states; loading skeletons.

---

## 9. Security Considerations

1. **RPC hardening** — every new SECURITY DEFINER function gets `SET search_path = ''` + fully-qualified `auth.*`/`public.*` (matches linter lint 0011 fixes already applied).
2. **`user_metadata` is NOT an authorization store.** Any client can call `updateUser({data:{...}})` and merge arbitrary keys into `raw_user_meta_data` — the current `is_admin()` would read a self-assigned `role: 'admin'`. Migration `0002` moves role + capabilities to `raw_app_meta_data` and re-points `is_admin()`; server actions and RPCs read **only** app_meta.
2. **Least privilege** — `admin_set_role` enforces super_admin **inside** the function; UI-level checks are defense-in-depth only.
3. **Ban semantics** — `banned_until` is enforced by Supabase Auth itself (login blocked), zero RLS surface.
4. **Audit integrity** — `admin_activity_log` insertable only via `admin_log_activity` (RLS), so anon/authenticated can never forge entries; logs are append-only in practice.
5. **Delete scope** — confirm dialogs + `ActionState` errors; deletion of an alumni profile cascades (FK `ON DELETE CASCADE` already in schema) — warn in UI.
6. **Linter** — run `get_advisors` (security) after migration; revoke any RPC `EXECUTE` that should not be public.

---

## 10. Validation Plan

- `bunx tsc --noEmit` + `bun run build` (32 routes) after each phase.
- Supabase MCP: `apply_migration` on `zotizozgkzzuhrwbxoud`, `execute_sql` spot-checks, `get_advisors` for new warnings.
- Manual smoke: super_admin login → promote admin → admin logs in → ban user → verify banned login blocked → delete a test job → check audit log rows.
- Live deploy: `vercel deploy --prod` after code changes.

---

## 11. Open Questions for the Team

1. **Capability model**: confirm the capability catalog (10 items in F1). Default set for newly promoted admins = all moderation + `manage_alumni` + `view_audit` + `import_export` (everything **except** `manage_users`)? Should `moderate_*` stay per-entity or collapse to one `moderate_content`?
2. Should regular `admin` be allowed to **delete** content, or only hide it (soft-hide) with super_admin doing hard deletes? (Proposal: admins delete content they have capability for; super_admin can also delete users.)
3. Do we want a "hide" (soft, restores later) in addition to "delete" for jobs/announcements? (Proposal: soft-hide via `expired_at`/a new `status` column for jobs+announcements; hard delete for polls/groups/gallery.)
4. CSV import stays as-is (no role column) — confirm.
