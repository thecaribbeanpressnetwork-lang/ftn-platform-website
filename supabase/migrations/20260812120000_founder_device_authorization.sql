-- FTN Nexus Command: founder identity + enrolled-device authorization.
-- All owner records are server-only. Browser roles receive no table privileges.

create extension if not exists pgcrypto with schema extensions;

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
  name text,
  enabled boolean not null default true,
  status text not null default 'AVAILABLE',
  route text,
  parent_product text,
  public_visibility boolean not null default true,
  routing_priority integer not null default 100 check (routing_priority between 0 and 1000),
  usage_limit jsonb not null default '{}'::jsonb,
  reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ftn_product_controls drop constraint if exists ftn_product_controls_status_check;
alter table public.ftn_product_controls add constraint ftn_product_controls_status_check
  check (status in ('LIVE','AVAILABLE','PRIVATE','PHASE 2','ILLUSTRATIVE','TEMPORARILY UNAVAILABLE'));
alter table public.ftn_product_controls alter column status set default 'AVAILABLE';
alter table public.ftn_product_controls add column if not exists name text;
alter table public.ftn_product_controls add column if not exists route text;
alter table public.ftn_product_controls add column if not exists parent_product text;
alter table public.ftn_product_controls add column if not exists public_visibility boolean not null default true;
alter table public.ftn_product_controls enable row level security;
revoke all on public.ftn_product_controls from anon, authenticated;

create table if not exists public.ftn_feature_controls (
  feature_key text primary key check (feature_key ~ '^[a-z0-9][a-z0-9.-]{1,119}$'),
  product_id text not null,
  enabled boolean not null default false,
  visibility text not null default 'PRIVATE' check (visibility in ('PUBLIC','AUTHENTICATED','PRIVATE')),
  expires_at timestamptz,
  reason text not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ftn_feature_controls enable row level security;
revoke all on public.ftn_feature_controls from anon, authenticated;

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
  device_id uuid,
  session_id uuid,
  created_at timestamptz not null default now()
);
alter table public.ftn_control_journal add column if not exists device_id uuid;
alter table public.ftn_control_journal add column if not exists session_id uuid;
alter table public.ftn_control_journal enable row level security;
revoke all on public.ftn_control_journal from anon, authenticated;
create index if not exists ftn_control_journal_created_idx on public.ftn_control_journal(created_at desc);

create table if not exists public.ftn_founder_identities (
  id uuid primary key default gen_random_uuid(),
  approved_email text not null unique check (approved_email = lower(btrim(approved_email))),
  user_id uuid unique references auth.users(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  bound_at timestamptz,
  revoked_at timestamptz,
  check ((active and revoked_at is null) or (not active))
);
alter table public.ftn_founder_identities enable row level security;
revoke all on public.ftn_founder_identities from anon, authenticated;

create table if not exists public.ftn_founder_devices (
  id uuid primary key default gen_random_uuid(),
  founder_user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null check (length(device_name) between 2 and 120),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED_PENDING_CLAIM','ACTIVE','REVOKED')),
  credential_hash text unique,
  claim_hash text,
  created_session_id uuid not null,
  approved_by_device_id uuid references public.ftn_founder_devices(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by_device_id uuid references public.ftn_founder_devices(id),
  user_agent text,
  check (status <> 'ACTIVE' or (credential_hash is not null and approved_at is not null)),
  check (status <> 'REVOKED' or revoked_at is not null)
);
alter table public.ftn_founder_devices enable row level security;
revoke all on public.ftn_founder_devices from anon, authenticated;
create index if not exists ftn_founder_devices_user_status_idx on public.ftn_founder_devices(founder_user_id,status,created_at desc);

alter table public.ftn_control_journal drop constraint if exists ftn_control_journal_device_id_fkey;
alter table public.ftn_control_journal add constraint ftn_control_journal_device_id_fkey
  foreign key (device_id) references public.ftn_founder_devices(id) on delete set null;

create table if not exists public.ftn_owner_access_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id uuid references public.ftn_founder_devices(id) on delete set null,
  session_id uuid,
  action text not null,
  outcome text not null check (outcome in ('ALLOWED','DENIED','PENDING')),
  reason_code text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.ftn_owner_access_audit enable row level security;
revoke all on public.ftn_owner_access_audit from anon, authenticated;
create index if not exists ftn_owner_access_audit_created_idx on public.ftn_owner_access_audit(created_at desc);
create index if not exists ftn_owner_access_audit_user_idx on public.ftn_owner_access_audit(user_id,created_at desc);

create table if not exists public.ftn_user_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_key text not null check (length(grant_key) between 2 and 120),
  expires_at timestamptz,
  revoked_at timestamptz,
  reason text not null,
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(user_id,grant_key)
);
alter table public.ftn_user_access_grants enable row level security;
revoke all on public.ftn_user_access_grants from anon, authenticated;

create table if not exists public.ftn_source_controls (
  source_id text primary key check (source_id ~ '^[a-z0-9][a-z0-9-]{1,119}$'),
  product_id text not null,
  name text not null,
  official_url text not null check (official_url ~ '^https://'),
  source_type text not null default 'official',
  confidence text not null default 'VERIFIED OFFICIAL' check (confidence in ('VERIFIED OFFICIAL','HIGH','MEDIUM','LOW','UNVERIFIED')),
  availability_state text not null default 'PUBLISHED' check (availability_state in ('LIVE','OFFLINE','PUBLISHED','ARCHIVE','TEMPORARILY UNAVAILABLE')),
  enabled boolean not null default true,
  last_verified date,
  notes text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ftn_source_controls enable row level security;
revoke all on public.ftn_source_controls from anon, authenticated;

create table if not exists public.ftn_external_link_health (
  source_id text primary key references public.ftn_source_controls(source_id) on delete cascade,
  http_status integer,
  health_state text not null default 'UNCHECKED' check (health_state in ('HEALTHY','REDIRECTED','BLOCKED','DEAD','UNCHECKED')),
  checked_at timestamptz,
  final_url text,
  detail text
);
alter table public.ftn_external_link_health enable row level security;
revoke all on public.ftn_external_link_health from anon, authenticated;

create table if not exists public.ftn_integration_readiness (
  integration_id text primary key,
  product_id text not null,
  readiness text not null default 'NOT READY' check (readiness in ('READY','LIMITED','NOT READY','OWNER ACTION')),
  public_summary text not null,
  private_note text,
  last_verified timestamptz,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.ftn_integration_readiness enable row level security;
revoke all on public.ftn_integration_readiness from anon, authenticated;

create table if not exists public.ftn_deployment_health (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{7,40}$'),
  deployment_state text not null check (deployment_state in ('QUEUED','RUNNING','HEALTHY','FAILED','UNKNOWN')),
  functional_state text not null default 'UNKNOWN' check (functional_state in ('PASS','FAIL','RUNNING','UNKNOWN')),
  workflow_url text,
  checked_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);
alter table public.ftn_deployment_health enable row level security;
revoke all on public.ftn_deployment_health from anon, authenticated;
create index if not exists ftn_deployment_health_checked_idx on public.ftn_deployment_health(environment,checked_at desc);

create or replace function public.ftn_owner_session_active(p_session_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = p_session_id and s.user_id = p_user_id
  );
$$;
revoke all on function public.ftn_owner_session_active(uuid,uuid) from public, anon, authenticated;
grant execute on function public.ftn_owner_session_active(uuid,uuid) to service_role;

comment on table public.ftn_founder_identities is 'Private exact-email founder allowlist, bound to an immutable Google-authenticated Supabase user ID.';
comment on table public.ftn_founder_devices is 'Revocable server-issued founder device credentials. Plaintext credentials are never stored.';
comment on table public.ftn_owner_access_audit is 'Append-only successful, pending and denied owner access attempts by verified session/device.';
