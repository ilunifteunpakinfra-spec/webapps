-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Storage Delete Guard Fix
-- Additive migration on top of 0004_alumni_admin.sql
--
-- Supabase storage blocks direct DELETE on storage.objects via the
-- protect_objects_delete trigger unless the transaction sets the GUC
-- `storage.allow_delete_query = 'true'`. Both SECURITY DEFINER RPCs
-- that clean up storage objects must set it first. This file rewrites
-- the two function bodies to include the GUC (CREATE OR REPLACE keeps
-- existing grants intact).
-- ============================================

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
    PERFORM set_config('storage.allow_delete_query', 'true', true);
    DELETE FROM storage.objects
    WHERE bucket_id = 'gallery' AND name = v_path;
  END IF;

  DELETE FROM public.event_gallery WHERE id = p_photo_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_alumni(p_target_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_admin_capability('manage_alumni') THEN RETURN false; END IF;
  IF p_target_uid IS NULL OR p_target_uid = auth.uid() THEN RETURN false; END IF;

  -- Allow direct storage.object deletion (Supabase storage guard).
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  -- 1. Remove the user's storage objects (paths are `<uid>/<file>`).
  DELETE FROM storage.objects
  WHERE (bucket_id = 'avatars'  AND name LIKE p_target_uid::text || '/%')
     OR (bucket_id = 'resumes'  AND name LIKE p_target_uid::text || '/%')
     OR (bucket_id = 'gallery'  AND name LIKE p_target_uid::text || '/%');

  -- 2. Delete the alumni profile; FKs cascade to related content
  --    (skills, endorsements, job postings, polls, gallery rows, reports…).
  DELETE FROM public.alumni WHERE id = p_target_uid;
  IF NOT FOUND THEN RETURN false; END IF;

  -- 3. Remove the auth account so the user can no longer sign in.
  DELETE FROM auth.users WHERE id = p_target_uid;

  RETURN true;
END;
$$;
