-- FTN Account release: self-owned preferences plus server-managed privacy requests.
-- This intentionally excludes Love, founder controls and other unrelated candidate work.

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
revoke all on public.ftn_user_preferences from anon, authenticated;
grant select, insert, update, delete on public.ftn_user_preferences to authenticated;

drop policy if exists "users read own FTN preferences" on public.ftn_user_preferences;
create policy "users read own FTN preferences"
on public.ftn_user_preferences for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users create own FTN preferences" on public.ftn_user_preferences;
create policy "users create own FTN preferences"
on public.ftn_user_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users update own FTN preferences" on public.ftn_user_preferences;
create policy "users update own FTN preferences"
on public.ftn_user_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users delete own FTN preferences" on public.ftn_user_preferences;
create policy "users delete own FTN preferences"
on public.ftn_user_preferences for delete to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.ftn_account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('export','deletion','correction')),
  status text not null default 'PENDING'
    check (status in ('PENDING','IN_REVIEW','COMPLETED','REJECTED','CANCELLED')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  operator_id uuid references auth.users(id),
  evidence_hold boolean not null default false,
  operator_note text
);

alter table public.ftn_account_requests enable row level security;
revoke all on public.ftn_account_requests from anon, authenticated;

create unique index if not exists ftn_one_pending_deletion_per_user
on public.ftn_account_requests(user_id)
where request_type = 'deletion' and status in ('PENDING','IN_REVIEW');

comment on table public.ftn_user_preferences is
  'Self-owned FTN Account preferences protected by user_id RLS.';
comment on table public.ftn_account_requests is
  'Server-managed privacy request register; browser roles receive no direct access.';
