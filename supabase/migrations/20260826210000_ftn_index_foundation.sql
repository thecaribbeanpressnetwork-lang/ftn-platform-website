-- FTN Index v1 — Caribbean entity, provenance, verification and cost-governance foundation.
-- Additive migration. Public records are readable; all writes remain server-controlled.

create extension if not exists pgcrypto;

create table if not exists public.ftn_index_entities (
  id uuid primary key default gen_random_uuid(),
  ftn_id text not null unique,
  entity_type text not null check (entity_type in ('business','organization','person','place','institution','event','creative-work','other')),
  slug text not null unique,
  display_name text not null,
  legal_name text,
  territory_code text not null,
  category text,
  subcategory text,
  public_status text not null default 'provisional' check (public_status in ('provisional','claimed','current','stale','disputed','archived')),
  claimed boolean not null default false,
  claimed_at timestamptz,
  last_entity_confirmed_at timestamptz,
  next_entity_confirmation_at timestamptz,
  verification_window_days integer not null default 90 check (verification_window_days between 1 and 730),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ftn_index_entities_lookup_idx on public.ftn_index_entities (territory_code, entity_type, category);
create index if not exists ftn_index_entities_name_idx on public.ftn_index_entities using gin (to_tsvector('simple', coalesce(display_name,'') || ' ' || coalesce(legal_name,'') || ' ' || coalesce(category,'')));

create table if not exists public.ftn_index_sources (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  source_type text not null check (source_type in ('official-website','official-social','business-submission','government','directory','editorial','public-web','other')),
  source_url text,
  source_label text not null,
  observed_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  content_hash text,
  source_reliability numeric(5,4),
  created_at timestamptz not null default now()
);
create index if not exists ftn_index_sources_entity_idx on public.ftn_index_sources(entity_id, observed_at desc);

create table if not exists public.ftn_index_fields (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  field_key text not null,
  value_json jsonb not null,
  visibility text not null default 'public' check (visibility in ('public','internal','private')),
  provenance_type text not null default 'discovered' check (provenance_type in ('discovered','business-provided','business-confirmed','official-source','independently-corroborated','disputed','historical','unknown')),
  source_id uuid references public.ftn_index_sources(id) on delete set null,
  effective_from timestamptz not null default now(),
  superseded_at timestamptz,
  last_confirmed_at timestamptz,
  next_confirmation_at timestamptz,
  volatility_class text not null default 'medium' check (volatility_class in ('low','medium','high')),
  evidence_confidence numeric(5,4),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create unique index if not exists ftn_index_fields_current_unique on public.ftn_index_fields(entity_id, field_key) where superseded_at is null;
create index if not exists ftn_index_fields_public_idx on public.ftn_index_fields(entity_id, field_key) where visibility='public' and superseded_at is null;

create table if not exists public.ftn_index_relationships (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  relationship_type text not null,
  to_entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  source_id uuid references public.ftn_index_sources(id) on delete set null,
  confidence numeric(5,4),
  created_at timestamptz not null default now(),
  unique(from_entity_id, relationship_type, to_entity_id)
);

create table if not exists public.ftn_index_claim_invitations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  public_contact_hash text not null,
  token_hash text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  outreach_batch text,
  created_at timestamptz not null default now()
);
create index if not exists ftn_index_claim_invites_entity_idx on public.ftn_index_claim_invitations(entity_id, issued_at desc);

create table if not exists public.ftn_index_claims (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invitation_id uuid references public.ftn_index_claim_invitations(id) on delete set null,
  status text not null default 'active' check (status in ('active','revoked','disputed')),
  claim_method text not null default 'invitation-link',
  claimed_at timestamptz not null default now(),
  last_confirmed_at timestamptz,
  unique(entity_id, user_id)
);

create table if not exists public.ftn_index_verification_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  claim_id uuid references public.ftn_index_claims(id) on delete set null,
  event_type text not null check (event_type in ('invitation-clicked','claim-created','entity-confirmed','field-confirmed','field-corrected','field-added','change-detected','reconfirmation-requested','claim-revoked')),
  field_key text,
  source_id uuid references public.ftn_index_sources(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null
);
create index if not exists ftn_index_verification_entity_idx on public.ftn_index_verification_events(entity_id, created_at desc);

create table if not exists public.ftn_index_scout_observations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.ftn_index_entities(id) on delete cascade,
  territory_code text not null,
  vertical text not null,
  observation_type text not null,
  candidate_url text,
  candidate_value jsonb,
  source_label text,
  observed_at timestamptz not null default now(),
  review_status text not null default 'candidate' check (review_status in ('candidate','accepted','rejected','superseded')),
  created_at timestamptz not null default now()
);
create index if not exists ftn_index_scout_queue_idx on public.ftn_index_scout_observations(review_status, territory_code, vertical, observed_at desc);

-- Shared free-tier/cost guard registry. No provider may silently cross an approved spend boundary.
create table if not exists public.ftn_cost_guard (
  service_key text primary key,
  service_label text not null,
  plan_name text not null default 'free',
  free_limit numeric,
  usage_value numeric not null default 0,
  usage_unit text,
  reset_at timestamptz,
  warning_percent numeric not null default 70 check (warning_percent between 1 and 100),
  critical_percent numeric not null default 85 check (critical_percent between 1 and 100),
  throttle_percent numeric not null default 95 check (throttle_percent between 1 and 100),
  founder_approved_paid boolean not null default false,
  hard_stop_at_free_limit boolean not null default true,
  estimated_next_cost numeric,
  currency text default 'USD',
  last_checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public API view: intentionally excludes user IDs, invitation metadata, contact hashes and private/internal fields.
create or replace view public.ftn_index_public_entities
with (security_invoker = true)
as
select
  e.ftn_id,
  e.slug,
  e.entity_type,
  e.display_name,
  e.legal_name,
  e.territory_code,
  e.category,
  e.subcategory,
  e.public_status,
  e.claimed,
  e.last_entity_confirmed_at,
  e.next_entity_confirmation_at,
  case
    when e.last_entity_confirmed_at is null then 0
    when now() <= coalesce(e.next_entity_confirmation_at, e.last_entity_confirmed_at + make_interval(days => e.verification_window_days)) then 100
    when now() <= e.last_entity_confirmed_at + make_interval(days => e.verification_window_days + 30) then 90
    when now() <= e.last_entity_confirmed_at + make_interval(days => e.verification_window_days + 90) then 75
    when now() <= e.last_entity_confirmed_at + interval '365 days' then 50
    else 25
  end::integer as verification_freshness,
  coalesce((
    select jsonb_object_agg(f.field_key, f.value_json)
    from public.ftn_index_fields f
    where f.entity_id=e.id and f.visibility='public' and f.superseded_at is null
  ), '{}'::jsonb) as fields,
  e.updated_at
from public.ftn_index_entities e
where e.public_status <> 'archived';

alter table public.ftn_index_entities enable row level security;
alter table public.ftn_index_sources enable row level security;
alter table public.ftn_index_fields enable row level security;
alter table public.ftn_index_relationships enable row level security;
alter table public.ftn_index_claim_invitations enable row level security;
alter table public.ftn_index_claims enable row level security;
alter table public.ftn_index_verification_events enable row level security;
alter table public.ftn_index_scout_observations enable row level security;
alter table public.ftn_cost_guard enable row level security;

-- Public may read only the canonical public entity/field/source material; all mutation is reserved for authenticated server functions/service role.
create policy "ftn_index_public_entities_read" on public.ftn_index_entities for select to anon, authenticated using (public_status <> 'archived');
create policy "ftn_index_public_fields_read" on public.ftn_index_fields for select to anon, authenticated using (visibility='public' and superseded_at is null);
create policy "ftn_index_public_sources_read" on public.ftn_index_sources for select to anon, authenticated using (true);
create policy "ftn_index_public_relationships_read" on public.ftn_index_relationships for select to anon, authenticated using (true);
create policy "ftn_index_own_claim_read" on public.ftn_index_claims for select to authenticated using (user_id=auth.uid());

revoke all on public.ftn_index_claim_invitations from anon, authenticated;
revoke all on public.ftn_index_verification_events from anon, authenticated;
revoke all on public.ftn_index_scout_observations from anon, authenticated;
revoke all on public.ftn_cost_guard from anon, authenticated;

grant select on public.ftn_index_entities, public.ftn_index_fields, public.ftn_index_sources, public.ftn_index_relationships to anon, authenticated;
grant select on public.ftn_index_public_entities to anon, authenticated;
grant select on public.ftn_index_claims to authenticated;

comment on view public.ftn_index_public_entities is 'FTN Index public API surface. Verification freshness means recent entity confirmation, not endorsement or safety.';
