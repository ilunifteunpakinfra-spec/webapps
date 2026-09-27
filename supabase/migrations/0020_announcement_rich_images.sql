-- ============================================
-- ILUNI FTE WebApps - Announcements: Rich Text + Inline Images
-- Additive migration on top of 0019_job_postings_structured.sql
--
-- Scope:
--   1. `announcement_images` — images attached to an announcement, each with
--      a required alt_text (a11y) and an optional caption.
--   2. `event_gallery` gains `source_type` / `source_id` so a gallery row can
--      point back at the announcement it came from. Provenance, NOT a copy:
--      duplicating rows would drift the moment a caption is edited.
--   3. Auto-publish: announcement images are inserted into event_gallery with
--      status='active' (maintainer decision, proposal §4.3 Option A).
--      This BYPASSES the `moderate_gallery` queue for this one class of image,
--      so compensating controls are mandatory — see C1..C4 in the proposal and
--      the rate-limit function below.
--
-- Idempotency: guarded throughout.
-- ============================================

-- ============================================
-- 11.1 BACKFILL BEFORE CONSTRAINT
-- ============================================
-- 0001 created `isi` with no length limit, so an existing long row would
-- abort the ADD CONSTRAINT below and roll the whole migration back.

UPDATE public.announcements
   SET isi = left(isi, 20000)
 WHERE char_length(isi) > 20000;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'announcements_isi_chk'
  ) THEN
    ALTER TABLE public.announcements
      ADD CONSTRAINT announcements_isi_chk
      CHECK (isi IS NULL OR char_length(isi) <= 20000);
  END IF;
END $$;

-- ============================================
-- 11.2 PROVENANCE ON event_gallery
-- ============================================

ALTER TABLE public.event_gallery
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS source_id   UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_gallery_source_type_chk'
  ) THEN
    ALTER TABLE public.event_gallery
      ADD CONSTRAINT event_gallery_source_type_chk
      CHECK (source_type IN ('event', 'announcement'));
  END IF;

  -- A mirrored row must reference a real announcement and cascade on delete.
  -- Existing rows have source_id NULL, which is valid for source_type='event'.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_gallery_announcement_fk'
  ) THEN
    ALTER TABLE public.event_gallery
      ADD CONSTRAINT event_gallery_announcement_fk
      FOREIGN KEY (source_id)
      REFERENCES public.announcements(id) ON DELETE CASCADE;
  END IF;
END $$;

-- C1 (compensating control): an 'announcement' row always carries a source_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_gallery_announcement_source_chk'
  ) THEN
    ALTER TABLE public.event_gallery
      ADD CONSTRAINT event_gallery_announcement_source_chk
      CHECK (source_type <> 'announcement' OR source_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_event_gallery_announcement
  ON public.event_gallery (source_type, source_id)
  WHERE source_type = 'announcement';

CREATE INDEX IF NOT EXISTS idx_event_gallery_public
  ON public.event_gallery (status, created_at DESC);

-- ============================================
-- 11.3 ANNOUNCEMENT IMAGES
-- ============================================

CREATE TABLE IF NOT EXISTS public.announcement_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  public_url      TEXT NOT NULL,
  caption         TEXT,
  -- NOT NULL: an announcement image carries meaning, so there is no
  -- decorative alt="" escape hatch. The client blocks submit without it.
  alt_text        TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT announcement_images_status_chk
    CHECK (status IN ('pending', 'active', 'hidden')),
  CONSTRAINT announcement_images_alt_chk
    CHECK (char_length(btrim(alt_text)) >= 3),
  CONSTRAINT announcement_images_position_chk
    CHECK (position >= 0),
  -- C1: hard cap on images per announcement, enforced by the database rather
  -- than trusted to the form.
  CONSTRAINT announcement_images_max_per_post
    CHECK (position < 6)
);

CREATE INDEX IF NOT EXISTS idx_announcement_images_announcement
  ON public.announcement_images (announcement_id, position);

CREATE INDEX IF NOT EXISTS idx_announcement_images_status
  ON public.announcement_images (status, created_at DESC);

ALTER TABLE public.announcement_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_announcement_images" ON public.announcement_images;
CREATE POLICY "read_announcement_images" ON public.announcement_images
  FOR SELECT
  USING (status = 'active' OR public.is_admin());

-- Authors manage only their own announcement's images.
DROP POLICY IF EXISTS "author_insert_announcement_images" ON public.announcement_images;
CREATE POLICY "author_insert_announcement_images" ON public.announcement_images
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.posted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "author_update_announcement_images" ON public.announcement_images;
CREATE POLICY "author_update_announcement_images" ON public.announcement_images
  FOR UPDATE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.posted_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.posted_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "author_delete_announcement_images" ON public.announcement_images;
CREATE POLICY "author_delete_announcement_images" ON public.announcement_images
  FOR DELETE
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id AND a.posted_by = auth.uid()
    )
  );

-- ============================================
-- 11.4 C1 RATE LIMIT (compensating control)
-- ============================================
-- Auto-published images skip the moderate_gallery queue, so a per-user daily
-- cap bounds the abuse surface that queue used to provide. Counts only
-- auto-published announcement images; event photos are unaffected.

CREATE OR REPLACE FUNCTION public.announcement_image_daily_count(p_uid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::INTEGER
    FROM public.event_gallery
   WHERE source_type = 'announcement'
     AND alumni_id = p_uid
     AND created_at > (now() - INTERVAL '1 day');
$$;

REVOKE EXECUTE ON FUNCTION public.announcement_image_daily_count(UUID) FROM PUBLIC;

