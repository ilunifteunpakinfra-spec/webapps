-- ============================================
-- ILUNI FT ELEKTRO UNPAK - Fix admin_set_role
-- Additive migration on top of 0005_storage_delete_fix.sql
--
-- Bug: promoting a user to admin failed with
--   ERROR 42703: column "unnest" does not exist
--
-- The capabilities whitelist filter referenced the set-returning function
-- `unnest` as a bare column in the WHERE clause:
--
--   SELECT ARRAY(SELECT unnest(capabilities) WHERE unnest = ANY(valid_caps))
--
-- With no FROM table named `unnest`, Postgres raised 42703. Rewritten to
-- alias the SRF output and reference the alias explicitly. CREATE OR
-- REPLACE keeps existing grants intact.
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_set_role(
  target_uid UUID,
  new_role TEXT,
  capabilities TEXT[] DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role TEXT;
  target_meta jsonb;
  valid_caps TEXT[] := ARRAY[
    'manage_users', 'manage_alumni', 'moderate_jobs',
    'moderate_announcements', 'moderate_polls', 'moderate_groups',
    'moderate_gallery', 'moderate_reports', 'view_audit', 'import_export'
  ];
  effective_caps TEXT[];
BEGIN
  SELECT raw_app_meta_data->>'role' INTO caller_role
  FROM auth.users WHERE id = auth.uid();
  IF caller_role IS DISTINCT FROM 'super_admin' THEN RETURN false; END IF;

  IF new_role NOT IN ('super_admin', 'admin', 'alumni') THEN RETURN false; END IF;

  SELECT raw_app_meta_data INTO target_meta FROM auth.users WHERE id = target_uid;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Never demote the last remaining super_admin.
  IF (target_meta->>'role') = 'super_admin' AND new_role <> 'super_admin' THEN
    IF (SELECT count(*) FROM auth.users
        WHERE raw_app_meta_data->>'role' = 'super_admin') <= 1 THEN
      RETURN false;
    END IF;
  END IF;

  -- Strip capabilities not in the whitelist; non-admins get none.
  IF new_role = 'admin' THEN
    SELECT ARRAY(SELECT cap FROM unnest(capabilities) AS t(cap)
                 WHERE t.cap = ANY(valid_caps))
      INTO effective_caps;
  ELSE
    effective_caps := ARRAY[]::TEXT[];
  END IF;

  UPDATE auth.users SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', new_role, 'capabilities', to_jsonb(effective_caps))
  WHERE id = target_uid;
  RETURN FOUND;
END;
$$;
