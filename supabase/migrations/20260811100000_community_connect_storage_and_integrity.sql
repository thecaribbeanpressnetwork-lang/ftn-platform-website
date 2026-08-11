-- Community Connect data hardening.
--
-- This migration deliberately preserves legacy `issues.photo_data_url` values. The
-- separate Community Connect client must first be changed to upload new evidence
-- through an authenticated FTN server path before that legacy field can be removed.
-- It is safe to apply to production only after the preflight queries at the end
-- return zero rows.

-- Private object storage is the destination for every new report attachment. No
-- browser Storage policy is granted here: intake must authenticate/authorise in an
-- FTN server function and issue short-lived signed URLs, so anonymous reporters
-- cannot enumerate, replace, or read another report's evidence.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-report-evidence',
  'community-report-evidence',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.community_issue_media (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete restrict,
  storage_bucket text not null default 'community-report-evidence'
    check (storage_bucket = 'community-report-evidence'),
  storage_path text not null unique check (length(storage_path) between 3 and 1024),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index if not exists community_issue_media_issue_id_idx
  on public.community_issue_media (issue_id, created_at);
alter table public.community_issue_media enable row level security;
revoke all on public.community_issue_media from anon, authenticated;

-- The existing case number is a stable, unique public reference. NOT VALID keeps
-- historic records intact while enforcing referential integrity for all new writes.
alter table public.issue_confirmations
  drop constraint if exists issue_confirmations_case_number_fkey;
alter table public.issue_confirmations
  add constraint issue_confirmations_case_number_fkey
  foreign key (case_number) references public.issues(case_number)
  on update cascade on delete restrict not valid;

alter table public.issue_verifications
  drop constraint if exists issue_verifications_case_number_fkey;
alter table public.issue_verifications
  add constraint issue_verifications_case_number_fkey
  foreign key (case_number) references public.issues(case_number)
  on update cascade on delete restrict not valid;

-- The legacy DJ-profile table must not create a second profile for the same FTN
-- account. A trigger is used rather than a unique index so existing duplicates do
-- not block this protective migration; resolve them with the preflight report,
-- then replace the trigger with a unique constraint in a later maintenance window.
create or replace function public.ftn_enforce_one_dj_profile()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.fdm_dj_profiles p
    where p.user_id = new.user_id and p.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    raise exception 'Only one DJ profile is permitted per FTN account';
  end if;
  return new;
end;
$$;
drop trigger if exists ftn_one_dj_profile_per_user on public.fdm_dj_profiles;
create trigger ftn_one_dj_profile_per_user
before insert or update of user_id on public.fdm_dj_profiles
for each row execute function public.ftn_enforce_one_dj_profile();

alter table public.fdm_dj_profiles enable row level security;
revoke all on public.fdm_dj_profiles from anon;
grant select, insert, update, delete on public.fdm_dj_profiles to authenticated;
drop policy if exists "users manage own DJ profile" on public.fdm_dj_profiles;
create policy "users manage own DJ profile"
on public.fdm_dj_profiles for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Required preflight/maintenance queries (run and record their result before
-- validating the two foreign keys or adding a unique user_id constraint):
-- select c.case_number from public.issue_confirmations c
-- left join public.issues i on i.case_number=c.case_number where i.id is null;
-- select v.case_number from public.issue_verifications v
-- left join public.issues i on i.case_number=v.case_number where i.id is null;
-- select user_id, count(*) from public.fdm_dj_profiles group by user_id having count(*) > 1;
