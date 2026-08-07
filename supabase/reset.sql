-- ============================================
-- ILUNI FTE WebApps - RESET SCRIPT
-- ============================================
-- Drops every ILUNI FTE object so schema.sql can
-- be re-applied cleanly. Safe to run on a fresh,
-- partial, or fully-applied project.
--
-- ⚠️ DESTRUCTIVE: deletes ALL data in the ILUNI
-- tables. Only use on an empty/development project.
-- ============================================

DROP TABLE IF EXISTS event_gallery CASCADE;
DROP TABLE IF EXISTS poll_votes CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS referral_requests CASCADE;
DROP TABLE IF EXISTS job_postings CASCADE;
DROP TABLE IF EXISTS mentoring_requests CASCADE;
DROP TABLE IF EXISTS mentor_profiles CASCADE;
DROP TABLE IF EXISTS endorsements CASCADE;
DROP TABLE IF EXISTS alumni_skills CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS alumni CASCADE;

DROP TYPE IF EXISTS visibilitas_enum CASCADE;
DROP TYPE IF EXISTS mentoring_status_enum CASCADE;
DROP TYPE IF EXISTS referral_status_enum CASCADE;
DROP TYPE IF EXISTS announcement_category_enum CASCADE;
DROP TYPE IF EXISTS group_type_enum CASCADE;
DROP TYPE IF EXISTS group_role_enum CASCADE;

DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
