-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Alumni Admin (Phase 3)
-- Additive migration on top of 0003_content_moderation.sql
--
-- Adds admin_delete_alumni: full account deletion for the `manage_alumni`
-- capability. Deletes the alumni profile row (FKs cascade to related
-- content), the user's storage objects (avatars / resumes / gallery),
-- and finally the auth.users account so the user cannot sign in again.
-- ============================================

-- ============================================
-- 9.4 FULL ACCOUNT DELETION RPC
-- ============================================
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS,
-- so storage cleanup is done here instead of from the client. Capability
-- `manage_alumni` is enforced inside the function; self-deletion is
-- forbidden so no admin can nuke their own account.
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

-- ============================================
-- 9.5 GRANTS
-- ============================================
-- Authenticated only (never anon). REVOKE FROM PUBLIC is required —
-- Supabase auto-grants new functions to anon/authenticated/service_role.

REVOKE EXECUTE ON FUNCTION public.admin_delete_alumni(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_alumni(UUID) TO authenticated;
