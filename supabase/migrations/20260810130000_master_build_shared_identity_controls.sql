-- FTN master build: shared identity data, private Love boundary, owner controls and advisor fixes.
-- Candidate migration. Apply to a clean staging project and run isolation tests before production.

create table if not exists public.ftn_operator_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator','operator','administrator','owner')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  reason text not null,
  revoked_at timestamptz
);
alter table public.ftn_operator_roles enable row level security;
revoke all on public.ftn_operator_roles from anon, authenticated;

create or replace function public.ftn_has_operator_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ftn_operator_roles r
    where r.user_id = (select auth.uid())
      and r.revoked_at is null
      and r.role = any(allowed_roles)
  );
$$;
revoke all on function public.ftn_has_operator_role(text[]) from public;
grant execute on function public.ftn_has_operator_role(text[]) to authenticated;

drop policy if exists "Admin update issues" on public.issues;
create policy "FTN operators update issues"
on public.issues for update to authenticated
using (public.ftn_has_operator_role(array['administrator','owner']))
with check (public.ftn_has_operator_role(array['administrator','owner']));

-- Public Community Connect reads are column-limited before the legacy public
-- views become security invokers. The source tables retain reporter contact,
-- original photo data and unredacted metadata for the authorised service path;
-- none of those fields are granted to browser roles.
drop policy if exists "Public read public issue fields" on public.issues;
create policy "Public read public issue fields" on public.issues
for select to anon, authenticated using (true);
revoke select on public.issues from anon, authenticated;
grant select (id, case_number, title, category, community, description, latitude, longitude, status, lifecycle_status, created_at, updated_at)
on public.issues to anon, authenticated;

drop policy if exists "Public read confirmation count inputs" on public.issue_confirmations;
create policy "Public read confirmation count inputs" on public.issue_confirmations
for select to anon, authenticated using (true);
revoke select on public.issue_confirmations from anon, authenticated;
grant select (case_number, created_at) on public.issue_confirmations to anon, authenticated;

drop policy if exists "Public read verification count inputs" on public.issue_verifications;
create policy "Public read verification count inputs" on public.issue_verifications
for select to anon, authenticated using (true);
revoke select on public.issue_verifications from anon, authenticated;
grant select (case_number, response) on public.issue_verifications to anon, authenticated;

-- Keep the legacy response shape while redacting values that are not public.
-- This avoids a destructive drop/recreate of views consumed by Community Connect.
create or replace view public.issues_public with (security_invoker = true) as
select
  id, case_number, title, category, community, description,
  null::text as photo_data_url,
  round(latitude::numeric, 3)::double precision as latitude,
  round(longitude::numeric, 3)::double precision as longitude,
  status, lifecycle_status, created_at, updated_at,
  '{}'::jsonb as metadata
from public.issues;
create or replace view public.issue_confirmation_counts with (security_invoker = true) as
select case_number, count(*) as count, max(created_at) as last_confirmed_at
from public.issue_confirmations group by case_number;
create or replace view public.issue_verification_counts with (security_invoker = true) as
select case_number, response, count(*) as count
from public.issue_verifications group by case_number, response;

create table if not exists public.ftn_user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  language_code text not null default 'en',
  product_updates text not null default 'off' check (product_updates in ('off','important')),
  consent jsonb not null default '{}'::jsonb,
  deletion_pending_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ftn_user_preferences enable row level security;
grant select, insert, update, delete on public.ftn_user_preferences to authenticated;
create policy "users read own FTN preferences" on public.ftn_user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy "users create own FTN preferences" on public.ftn_user_preferences for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own FTN preferences" on public.ftn_user_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own FTN preferences" on public.ftn_user_preferences for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.ftn_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (length(product_id) between 2 and 80),
  item_key text not null check (length(item_key) between 1 and 500),
  item_type text not null default 'source',
  title text not null check (length(title) between 1 and 500),
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, product_id, item_key)
);
alter table public.ftn_saved_items enable row level security;
grant select, insert, update, delete on public.ftn_saved_items to authenticated;
create policy "users read own FTN saved items" on public.ftn_saved_items for select to authenticated using (user_id = (select auth.uid()));
create policy "users create own FTN saved items" on public.ftn_saved_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own FTN saved items" on public.ftn_saved_items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete own FTN saved items" on public.ftn_saved_items for delete to authenticated using (user_id = (select auth.uid()));
create index if not exists ftn_saved_items_user_product_idx on public.ftn_saved_items(user_id, product_id, updated_at desc);

create table if not exists public.ftn_account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('export','deletion','correction')),
  status text not null default 'PENDING' check (status in ('PENDING','IN_REVIEW','COMPLETED','REJECTED','CANCELLED')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  operator_id uuid references auth.users(id),
  evidence_hold boolean not null default false,
  operator_note text
);
alter table public.ftn_account_requests enable row level security;
revoke all on public.ftn_account_requests from anon, authenticated;
create unique index if not exists ftn_one_pending_deletion_per_user on public.ftn_account_requests(user_id) where request_type='deletion' and status in ('PENDING','IN_REVIEW');

create table if not exists public.ftn_control_state (
  singleton boolean primary key default true check (singleton),
  mode text not null default 'normal' check (mode in ('normal','pause','lockdown','nuclear')),
  reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  version bigint not null default 1
);
alter table public.ftn_control_state enable row level security;
revoke all on public.ftn_control_state from anon, authenticated;
insert into public.ftn_control_state(singleton, mode) values(true,'normal') on conflict(singleton) do nothing;

create table if not exists public.ftn_product_controls (
  product_id text primary key,
  enabled boolean not null default true,
  status text not null default 'BETA' check (status in ('LIVE','BETA','MAINTENANCE','PRIVATE','PHASE 2')),
  routing_priority integer not null default 100 check (routing_priority between 0 and 1000),
  usage_limit jsonb not null default '{}'::jsonb,
  reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ftn_product_controls enable row level security;
revoke all on public.ftn_product_controls from anon, authenticated;

create table if not exists public.ftn_control_journal (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  action text not null,
  target text not null,
  previous_state jsonb,
  requested_state jsonb not null,
  reason text not null,
  dry_run boolean not null default false,
  source_ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.ftn_control_journal enable row level security;
revoke all on public.ftn_control_journal from anon, authenticated;
create index if not exists ftn_control_journal_created_idx on public.ftn_control_journal(created_at desc);

-- Love tables have no public discovery policy. Controlled discovery and mutual-match creation
-- occur only through the authenticated ftn-love-control function using the service role.
create table if not exists public.ftn_love_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 80),
  birth_date date not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  bio text not null default '' check (length(bio) <= 1000),
  preferences jsonb not null default '{}'::jsonb,
  consent_version text not null,
  consented_at timestamptz not null,
  discovery_enabled boolean not null default false,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','DELETION_PENDING','SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ftn_love_profiles enable row level security;
grant select, insert, update, delete on public.ftn_love_profiles to authenticated;
create policy "Love users read own profile" on public.ftn_love_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "Love users create own profile" on public.ftn_love_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Love users update own profile" on public.ftn_love_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Love users delete own profile" on public.ftn_love_profiles for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.ftn_love_require_adult()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'FTN Love is restricted to adults aged 18 or older';
  end if;
  return new;
end;
$$;
drop trigger if exists ftn_love_adult_gate on public.ftn_love_profiles;
create trigger ftn_love_adult_gate before insert or update of birth_date on public.ftn_love_profiles for each row execute function public.ftn_love_require_adult();

create table if not exists public.ftn_love_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.ftn_love_blocks enable row level security;
grant select, insert, delete on public.ftn_love_blocks to authenticated;
create policy "Love users manage own blocks" on public.ftn_love_blocks for all to authenticated using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

create table if not exists public.ftn_love_interests (
  sender_id uuid not null references auth.users(id) on delete cascade,
  target_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING','MATCHED','WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(sender_id,target_id),
  check (sender_id <> target_id)
);
alter table public.ftn_love_interests enable row level security;
grant select, insert, update, delete on public.ftn_love_interests to authenticated;
create policy "Love users read sent interests" on public.ftn_love_interests for select to authenticated using (sender_id = (select auth.uid()));
create policy "Love users create sent interests" on public.ftn_love_interests for insert to authenticated with check (sender_id = (select auth.uid()));
create policy "Love users update sent interests" on public.ftn_love_interests for update to authenticated using (sender_id = (select auth.uid())) with check (sender_id = (select auth.uid()));
create policy "Love users delete sent interests" on public.ftn_love_interests for delete to authenticated using (sender_id = (select auth.uid()));

create table if not exists public.ftn_love_matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED','BLOCKED')),
  created_at timestamptz not null default now(),
  unique(user_a,user_b), check(user_a <> user_b)
);
alter table public.ftn_love_matches enable row level security;
grant select on public.ftn_love_matches to authenticated;
create policy "Love participants read own matches" on public.ftn_love_matches for select to authenticated using ((select auth.uid()) in (user_a,user_b));

create table if not exists public.ftn_love_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.ftn_love_matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.ftn_love_messages enable row level security;
grant select, insert on public.ftn_love_messages to authenticated;
create policy "Love participants read own messages" on public.ftn_love_messages for select to authenticated using (exists(select 1 from public.ftn_love_matches m where m.id=match_id and (select auth.uid()) in (m.user_a,m.user_b)));
create policy "Love participants send matched messages" on public.ftn_love_messages for insert to authenticated with check (sender_id=(select auth.uid()) and exists(select 1 from public.ftn_love_matches m where m.id=match_id and m.status='ACTIVE' and (select auth.uid()) in (m.user_a,m.user_b)));

create table if not exists public.ftn_love_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  reason_code text not null,
  detail text check (length(detail) <= 2000),
  status text not null default 'PENDING' check (status in ('PENDING','IN_REVIEW','ACTIONED','CLOSED')),
  created_at timestamptz not null default now(),
  check(reporter_id <> reported_id)
);
alter table public.ftn_love_reports enable row level security;
grant select, insert on public.ftn_love_reports to authenticated;
create policy "Love users read own reports" on public.ftn_love_reports for select to authenticated using (reporter_id=(select auth.uid()));
create policy "Love users create reports" on public.ftn_love_reports for insert to authenticated with check (reporter_id=(select auth.uid()));

comment on table public.ftn_operator_roles is 'Private server-managed FTN role assignments; owner is bound to immutable auth user ID.';
comment on table public.ftn_control_journal is 'Append-only owner control and staged emergency simulation journal.';
comment on table public.ftn_love_profiles is 'Private FTN Love profiles. No public or cross-product policy.';
