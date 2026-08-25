-- Security audit finding (2026-08-25, read-only Supabase RLS/authorization/storage-policy audit):
--
-- 20260812130000_enforce_community_public_view_boundaries.sql (deployed as
-- 20260812155645_enforce_community_public_view_boundaries) correctly revoked broad table-level
-- SELECT on public.issues and replaced it with a redacted COLUMN grant (excluding reporter_name,
-- reporter_contact, photo_data_url, metadata), plus a security_invoker public.issues_public view
-- and two count views for confirmations/verifications.
--
-- That migration never added a matching RLS ROW policy for SELECT. Row Level Security has been
-- enabled on public.issues since its creation, and Postgres RLS denies every row for any command
-- with zero policies (verified live via pg_policies: only an INSERT policy and a JWT-role UPDATE
-- policy exist for this table -- no SELECT policy of any kind). A security_invoker view runs under
-- the CALLER's own RLS, so public.issues_public (and the two count views, which read
-- issue_confirmations/issue_verifications -- themselves INSERT-only by design, correctly so, since
-- they carry device_id and are never meant to be publicly readable) could not return any rows to
-- anon or authenticated callers. This is a real authorization-boundary GAP relative to the prior
-- migration's own stated intent, not a data-exposure risk (it fails closed) -- but it silently
-- breaks Community Connect's own public transparency view, since that application (a separate
-- repository this one does not modify) is the real consumer of these views.
--
-- This migration only ADDS a policy; it revokes nothing and alters no data. Rollback: run
-- `drop policy if exists "Public read redacted issues" on public.issues;`.
--
-- The already-correct column-level grant (id, case_number, title, category, community,
-- description, latitude, longitude, status, lifecycle_status, created_at, updated_at -- notably
-- NOT reporter_name/reporter_contact/photo_data_url/metadata) remains the real column-level
-- boundary; this policy only restores which ROWS are visible, matching the column grant's own
-- already-declared intent of "every issue, redacted."
do $fix$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'issues'
  ) and not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'issues' and cmd = 'SELECT'
  ) then
    create policy "Public read redacted issues" on public.issues
      for select
      to anon, authenticated
      using (true);
  end if;
end
$fix$;

-- Secondary finding, same audit: the existing "Admin update issues" policy checks
-- `auth.jwt() ->> 'role' = 'admin'`. This project has no custom access-token hook (verified:
-- zero functions matching %access_token%/%custom_claim%/%hook% in pg_proc), so the top-level
-- `role` claim in every Supabase-issued JWT is always the Postgres role name (`authenticated`,
-- `anon` or `service_role`) -- it can never equal `'admin'`. This policy is therefore permanently
-- unreachable: it has always evaluated to false and denied every update, for every user, including
-- genuine founders/admins. This is NOT a vulnerability (it fails closed) and is NOT the real
-- authorization path -- supabase/functions/ftn-owner-control/index.ts already performs real
-- admin/founder updates correctly, via its own service-role client checking public.ftn_operator_roles
-- server-side (never trusting a client-supplied JWT claim). Left in place, not dropped: removing a
-- dead, harmless, fail-closed policy has no security benefit, and this migration's job is to ADD a
-- missing capability, not to touch an unrelated, already-safe policy. Documented here so a future
-- session does not mistake this dead policy for the real admin-update mechanism.
