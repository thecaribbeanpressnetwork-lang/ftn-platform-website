-- Community Connect public views must execute with the caller's RLS and redact
-- legacy evidence/metadata fields. Some isolated staging projects do not contain
-- the Community Connect schema; those projects safely skip this product boundary.
do $boundary$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'issues' and column_name = 'community'
  ) then
    revoke select on public.issues from anon, authenticated;
    grant select (id, case_number, title, category, community, description, latitude, longitude, status, lifecycle_status, created_at, updated_at)
    on public.issues to anon, authenticated;

    execute $view$
      create or replace view public.issues_public with (security_invoker = true) as
      select
        id, case_number, title, category, community, description,
        null::text as photo_data_url,
        round(latitude::numeric, 3)::double precision as latitude,
        round(longitude::numeric, 3)::double precision as longitude,
        status, lifecycle_status, created_at, updated_at,
        '{}'::jsonb as metadata
      from public.issues
    $view$;

    execute $view$
      create or replace view public.issue_confirmation_counts with (security_invoker = true) as
      select case_number, count(*) as count, max(created_at) as last_confirmed_at
      from public.issue_confirmations group by case_number
    $view$;

    execute $view$
      create or replace view public.issue_verification_counts with (security_invoker = true) as
      select case_number, response, count(*) as count
      from public.issue_verifications group by case_number, response
    $view$;
  end if;
end
$boundary$;
