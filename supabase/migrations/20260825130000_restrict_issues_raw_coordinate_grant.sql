-- Security audit finding (2026-08-25, follow-up to 20260825120000_restore_public_issues_read_policy.sql):
--
-- That migration correctly restores a ROW-level SELECT policy on public.issues (fail-closed since
-- creation: RLS enabled, zero SELECT policies, so every row was denied regardless of any column
-- grant). Restoring it was necessary -- public.issues_public (security_invoker) cannot return any
-- row without a working base-table row policy, since a security_invoker view runs under the
-- CALLER's own RLS, not the view owner's.
--
-- Real gap this migration closes: the column-level grant already in place since
-- 20260810130000_master_build_shared_identity_controls.sql includes RAW, full-precision
-- `latitude, longitude` directly on public.issues, granted to anon and authenticated. That grant
-- was harmless only by accident, while RLS denied every row outright. Once the row policy is
-- restored, that accident stops protecting anything: any caller holding the public anon key (by
-- design, a public, client-embeddable credential, not a secret) can query the base table directly
-- -- `select latitude, longitude from issues` via PostgREST -- and receive EXACT, unrounded
-- coordinates for every issue, bypassing public.issues_public's own deliberate
-- `round(latitude::numeric, 3)` privacy generalization entirely. For a citizen safety-report table,
-- an exact coordinate can be materially more identifying than a ~110m-generalized one (reporter
-- home address, a specific residence named in a complaint). This is a real, concrete "precise
-- private location" exposure, not a theoretical one -- it requires no authentication beyond the
-- public anon key already shipped in this site's own client-side JavaScript.
--
-- Fix: revoke raw latitude/longitude from the direct base-table grant, and add a narrow SECURITY
-- DEFINER function that returns ONLY the rounded coordinate for one issue id -- never the raw
-- value, never any other column. public.issues_public is rebuilt to source its coordinates from
-- that function instead of reading the base table's own (now-revoked) columns directly. Every
-- other already-granted column (id, case_number, title, category, community, description, status,
-- lifecycle_status, created_at, updated_at) is untouched -- this migration narrows exactly one
-- privacy boundary, nothing else. The real admin/service path (supabase/functions/ftn-owner-control)
-- uses a service-role client, which always bypasses RLS and column grants by Postgres/Supabase
-- design -- unaffected by this change either way.
--
-- Rollback: see the paired down-migration in this same commit
-- (20260825130000_restrict_issues_raw_coordinate_grant_rollback.sql) -- restores the direct
-- latitude/longitude grant and the view's original column-select form, and drops the function.
do $fix$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'issues'
  ) then
    revoke select (latitude, longitude) on public.issues from anon, authenticated;

    create or replace function public.issue_public_coordinates(p_issue_id uuid)
    returns table(latitude double precision, longitude double precision)
    language sql
    security definer
    set search_path = public, pg_temp
    stable
    as $func$
      select round(i.latitude::numeric, 3)::double precision, round(i.longitude::numeric, 3)::double precision
      from public.issues i
      where i.id = p_issue_id;
    $func$;

    revoke all on function public.issue_public_coordinates(uuid) from public;
    grant execute on function public.issue_public_coordinates(uuid) to anon, authenticated;

    create or replace view public.issues_public with (security_invoker = true) as
    select
      i.id, i.case_number, i.title, i.category, i.community, i.description,
      null::text as photo_data_url,
      coords.latitude, coords.longitude,
      i.status, i.lifecycle_status, i.created_at, i.updated_at,
      '{}'::jsonb as metadata
    from public.issues i
    cross join lateral public.issue_public_coordinates(i.id) as coords;
  end if;
end
$fix$;
