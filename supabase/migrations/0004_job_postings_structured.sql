-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Job Board: Structured Vacancy Fields
-- Additive migration on top of 0003_content_moderation.sql
--
-- Design principles:
--   1. ADDITIVE ONLY. Every existing column is preserved and every existing row
--      stays valid. `skill_required TEXT[]` is deliberately NOT dropped because
--      app/lowongan/page.tsx still filters on it via `.contains()`.
--   2. TWO-PHASE MODERATION. This migration only widens the `status` CHECK to
--      allow 'pending'/'rejected'. The column DEFAULT stays 'active' and the
--      public RLS still reads 'active', so NOTHING becomes invisible here.
--      Phase B (a later migration) flips the default after `published_at` is
--      backfilled and the moderation queue is in use.
--   3. DEFENCE IN DEPTH. RLS limits *rows*; the guard trigger limits *columns*,
--      because a client could otherwise simply write status='active' on INSERT
--      and bypass review entirely.
--
-- Idempotency: every statement is IF NOT EXISTS / OR REPLACE / guarded.
-- ============================================

-- ============================================
-- 10.1 CONTROLLED VOCABULARIES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_type_enum') THEN
    CREATE TYPE public.job_type_enum AS ENUM (
      'full_time', 'part_time', 'contract', 'internship', 'freelance'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_mode_enum') THEN
    CREATE TYPE public.work_mode_enum AS ENUM ('onsite', 'hybrid', 'remote');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_enum') THEN
    CREATE TYPE public.experience_enum AS ENUM (
      'intern', 'junior', 'mid', 'senior', 'lead', 'principal'
    );
  END IF;
END
$$;

-- ============================================
-- 10.2 NEW COLUMNS (nullable / defaulted)
-- ============================================

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS job_type        public.job_type_enum,
  ADD COLUMN IF NOT EXISTS work_mode       public.work_mode_enum,
  ADD COLUMN IF NOT EXISTS experience      public.experience_enum,
  ADD COLUMN IF NOT EXISTS education       TEXT,
  ADD COLUMN IF NOT EXISTS salary_min      INTEGER,
  ADD COLUMN IF NOT EXISTS salary_max      INTEGER,
  ADD COLUMN IF NOT EXISTS salary_period   TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS contacts        JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS views_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by     UUID REFERENCES public.alumni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_note TEXT;

-- Default job_type/work_mode for pre-existing rows so the list view can render
-- a badge for every row instead of falling back on every request.
UPDATE public.job_postings SET job_type  = 'full_time' WHERE job_type  IS NULL;
UPDATE public.job_postings SET work_mode = 'onsite'     WHERE work_mode IS NULL;

-- ============================================
-- 10.3 MODERATION LIFECYCLE: widen the CHECK
-- ============================================
-- Drop first: PG has no `ADD CONSTRAINT IF NOT EXISTS`, and the 0003 constraint
-- may be unnamed, so it cannot be widened in place. We re-add it immediately
-- with the full value set, so the table is never left unconstrained.

ALTER TABLE public.job_postings
  DROP CONSTRAINT IF EXISTS job_postings_status_check;

ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_status_check
  CHECK (status IN ('pending', 'active', 'hidden', 'rejected'));

-- Backfill: rows already public count as published. This is what makes the
-- Phase B default flip safe later on.
UPDATE public.job_postings
   SET published_at = created_at
 WHERE published_at IS NULL
   AND status = 'active';

-- ============================================
-- 10.4 INTEGRITY CONSTRAINTS
-- ============================================

ALTER TABLE public.job_postings
  DROP CONSTRAINT IF EXISTS job_postings_salary_range_chk,
  DROP CONSTRAINT IF EXISTS job_postings_salary_min_chk,
  DROP CONSTRAINT IF EXISTS job_postings_salary_period_chk,
  DROP CONSTRAINT IF EXISTS job_postings_expiry_future_chk,
  DROP CONSTRAINT IF EXISTS job_postings_views_count_chk;

ALTER TABLE public.job_postings
  ADD CONSTRAINT job_postings_salary_range_chk
    CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min),
  ADD CONSTRAINT job_postings_salary_min_chk
    CHECK (salary_min IS NULL OR salary_min >= 0),
  ADD CONSTRAINT job_postings_salary_period_chk
    CHECK (salary_period IS NULL OR salary_period IN ('hourly', 'monthly', 'yearly')),
  ADD CONSTRAINT job_postings_views_count_chk
    CHECK (views_count >= 0),
  ADD CONSTRAINT job_postings_expiry_future_chk
    CHECK (expired_at IS NULL OR created_at IS NULL OR expired_at > created_at);

-- ============================================
-- 10.5 INDEXES FOR THE NEW FILTER SET
-- ============================================

CREATE INDEX IF NOT EXISTS idx_jobs_type
  ON public.job_postings (status, job_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_work_mode
  ON public.job_postings (status, work_mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_experience
  ON public.job_postings (status, experience, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_salary
  ON public.job_postings (status, salary_max) WHERE salary_max IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_featured
  ON public.job_postings (is_featured, created_at DESC) WHERE is_featured;

-- Full-text search across title + company + description.
CREATE INDEX IF NOT EXISTS idx_jobs_search
  ON public.job_postings
  USING GIN (to_tsvector('simple',
    coalesce(judul, '') || ' ' ||
    coalesce(perusahaan, '') || ' ' ||
    coalesce(deskripsi, '')));

-- ============================================
-- 10.6 CURATED SKILLS JUNCTION
-- ============================================
-- Transitional: the UI reads BOTH `skill_required` (legacy TEXT[]) and this
-- table. `TEXT[]` is dropped only in a later release, once no query filters
-- on it with .contains().

CREATE TABLE IF NOT EXISTS public.job_posting_skills (
  job_id   UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id)          ON DELETE RESTRICT,
  PRIMARY KEY (job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_job_posting_skills_skill
  ON public.job_posting_skills (skill_id);

ALTER TABLE public.job_posting_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_job_posting_skills" ON public.job_posting_skills;
CREATE POLICY "read_job_posting_skills" ON public.job_posting_skills
  FOR SELECT USING (true);


-- ============================================
-- 10.7 GUARD TRIGGER — block self-publishing
-- ============================================
-- RLS restricts which ROWS a client may touch, but the INSERT policy is
-- WITH CHECK (posted_by = auth.uid() AND verified), which says nothing about
-- the `status` COLUMN. Without this trigger an author could post
-- status='active' and go live unreviewed, which is the exact abuse window the
-- moderation gate exists to close.
--
-- The function reuses public.is_admin() (SECURITY DEFINER, search_path = '',
-- app_metadata-based) rather than redefining it, per the 5.6 hardening.

CREATE OR REPLACE FUNCTION public.job_postings_guard_status() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Admins may move a row through any state.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- New posts always start in review, whatever the client asked for.
    NEW.status        := 'pending';
    NEW.published_at  := NULL;
    NEW.reviewed_by   := NULL;
    NEW.reviewed_at   := NULL;
    NEW.moderation_note := NULL;
    RETURN NEW;
  END IF;

  -- Authors may edit content on their own hidden/rejected post so they can
  -- resubmit, but they may never move it into a moderated state themselves.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('active', 'rejected') THEN
    RAISE EXCEPTION
      'Hanya admin yang dapat menyetujui atau menolak lowongan'
      USING ERRCODE = '42501';
  END IF;

  -- Any other self-driven status change also clears the review trail.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.published_at   := NULL;
    NEW.reviewed_by    := NULL;
    NEW.reviewed_at    := NULL;
    NEW.moderation_note := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.job_postings_guard_status() FROM PUBLIC;

DROP TRIGGER IF EXISTS job_postings_guard_status_trg ON public.job_postings;
CREATE TRIGGER job_postings_guard_status_trg
  BEFORE INSERT OR UPDATE ON public.job_postings
  FOR EACH ROW
  EXECUTE FUNCTION public.job_postings_guard_status();

-- ============================================
-- 10.8 RLS — public visibility, author access
-- ============================================
-- Replaces the 0001 `public_read_job_postings` (USING true), which would
-- otherwise leak 'pending'/'rejected' rows the moment the CHECK allows them.
--
-- The INSERT policy is intentionally NOT changed here: it already restricts
-- to verified alumni, and the trigger now owns the status column.

DROP POLICY IF EXISTS "public_read_job_postings" ON public.job_postings;
DROP POLICY IF EXISTS "public_read_active_jobs"   ON public.job_postings;

CREATE POLICY "public_read_active_jobs" ON public.job_postings
  FOR SELECT
  USING (
    status = 'active'
    AND published_at IS NOT NULL
    AND (expired_at IS NULL OR expired_at > now())
  );

-- Authors may read their own rows in any state (to track review progress).
DROP POLICY IF EXISTS "author_read_own_jobs" ON public.job_postings;
CREATE POLICY "author_read_own_jobs" ON public.job_postings
  FOR SELECT
  USING (posted_by = auth.uid() OR public.is_admin());

-- Replace the 0001 `owner_manage_job_posting` (FOR ALL, USING posted_by).
-- FOR ALL also granted authors DELETE and an unconstrained UPDATE WITH CHECK;
-- scoping it to SELECT + UPDATE lets an author correct a rejected post without
-- being able to delete rows or self-publish (the trigger enforces the rest).
DROP POLICY IF EXISTS "owner_manage_job_posting" ON public.job_postings;

CREATE POLICY "owner_read_own_job_posting" ON public.job_postings
  FOR SELECT
  USING (posted_by = auth.uid() OR public.is_admin());

CREATE POLICY "owner_update_own_job_posting" ON public.job_postings
  FOR UPDATE
  USING (posted_by = auth.uid() OR public.is_admin())
  WITH CHECK (posted_by = auth.uid() OR public.is_admin());

