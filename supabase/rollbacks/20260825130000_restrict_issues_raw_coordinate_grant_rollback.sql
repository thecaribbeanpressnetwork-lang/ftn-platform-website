-- Rollback for 20260825130000_restrict_issues_raw_coordinate_grant.sql.
--
-- NOT part of the normal migration sequence -- Supabase applies files in this directory in
-- filename order, and this file is never meant to run automatically alongside the forward
-- migration. It exists so a founder (or a future session) has an exact, reviewed, ready-to-run
-- statement if the forward migration needs to be reverted, per this pass's own "rollback-capable"
-- requirement. Apply manually via the Supabase Dashboard SQL Editor, the same path used for the
-- forward migration -- never automatically.
--
-- Reverting this restores the PRE-fix state: raw, full-precision latitude/longitude readable
-- directly from public.issues by anon/authenticated. Only do this if the coordinate-rounding fix
-- itself is found to have broken something -- reverting does not fix a different problem, it only
-- re-opens the exposure the forward migration closed.
do $rollback$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'issues'
  ) then
    -- Restore the view to its pre-fix form (reading latitude/longitude directly from the base
    -- table, matching 20260812130000_enforce_community_public_view_boundaries.sql's original text).
    create or replace view public.issues_public with (security_invoker = true) as
    select
      id, case_number, title, category, community, description,
      null::text as photo_data_url,
      round(latitude::numeric, 3)::double precision as latitude,
      round(longitude::numeric, 3)::double precision as longitude,
      status, lifecycle_status, created_at, updated_at,
      '{}'::jsonb as metadata
    from public.issues;

    drop function if exists public.issue_public_coordinates(uuid);

    grant select (latitude, longitude) on public.issues to anon, authenticated;
  end if;
end
$rollback$;
