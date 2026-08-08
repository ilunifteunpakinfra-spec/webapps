-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Content Moderation (Phase 2)
-- Additive migration on top of 0002_superadmin_moderation.sql
--
-- Option C (hybrid moderation):
--   1. Soft-hide for job_postings + announcements via a `status` column
--      ('active' | 'hidden') — reversible, keeps the audit trail.
--   2. Hard delete for polls / groups / gallery photos (FKs cascade).
--   3. New SECURITY DEFINER RPC admin_delete_gallery_photo removes the
--      event_gallery row AND its storage object atomically (the only
--      storage DELETE surface for the gallery bucket).
-- ============================================

-- ============================================
-- 9.1 SOFT-HIDE STATUS COLUMNS
-- ============================================

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'hidden'));

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'hidden'));

CREATE INDEX IF NOT EXISTS idx_job_postings_status
  ON public.job_postings (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_status
  ON public.announcements (status, created_at DESC);

-- ============================================
-- 9.2 GALLERY PHOTO DELETION RPC
-- ============================================
-- Deletes a gallery photo row and its storage object in one transaction.
-- SECURITY DEFINER runs as the function owner (postgres), which bypasses
-- storage RLS — this is the only DELETE surface for the `gallery` bucket.
-- Capability `moderate_gallery` is enforced inside the function.
CREATE OR REPLACE FUNCTION public.admin_delete_gallery_photo(p_photo_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url  TEXT;
  v_path TEXT;
BEGIN
  IF NOT public.has_admin_capability('moderate_gallery') THEN RETURN false; END IF;

  SELECT foto_url INTO v_url FROM public.event_gallery WHERE id = p_photo_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- foto_url is a public URL: .../storage/v1/object/public/gallery/<path>
  v_path := split_part(v_url, '/object/public/gallery/', 2);
  IF v_path <> '' THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'gallery' AND name = v_path;
  END IF;

  DELETE FROM public.event_gallery WHERE id = p_photo_id;
  RETURN FOUND;
END;
$$;

-- ============================================
-- 9.3 GRANTS
-- ============================================
-- Authenticated only (never anon). REVOKE FROM PUBLIC is required —
-- Supabase auto-grants new functions to anon/authenticated/service_role,
-- and a plain `REVOKE ... FROM anon` does not override the PUBLIC grant.

REVOKE EXECUTE ON FUNCTION public.admin_delete_gallery_photo(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_gallery_photo(UUID) TO authenticated;
