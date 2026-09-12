-- FTN Ecosystem Intelligence foundation.
-- Extends the existing FTN Index; it does not create a competing directory.
-- Public reads are limited to reviewed, non-sensitive resources. All registry writes remain server-controlled.

alter table public.ftn_index_entities drop constraint if exists ftn_index_entities_entity_type_check;
alter table public.ftn_index_entities add constraint ftn_index_entities_entity_type_check
  check (entity_type in ('business','organization','person','place','institution','event','creative-work','resource','other'));

create table if not exists public.ftn_index_resources (
  entity_id uuid primary key references public.ftn_index_entities(id) on delete cascade,
  canonical_key text not null unique check (canonical_key ~ '^[a-z0-9][a-z0-9:_-]{2,199}$'),
  resource_type text not null check (resource_type in (
    'service','programme','grant','job','remote-work','accelerator','competition',
    'creator-opportunity','event','facility','business-support','arts-media-funding','payment-access','other'
  )),
  provider_entity_id uuid references public.ftn_index_entities(id) on delete set null,
  description text not null check (char_length(description) between 1 and 5000),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  locality text check (locality is null or char_length(locality) <= 240),
  coverage_codes text[] not null default '{}',
  delivery_mode text not null default 'unknown' check (delivery_mode in ('online','in-person','hybrid','unknown')),
  eligibility_text text,
  eligibility_structured jsonb not null default '{}'::jsonb,
  application_url text check (application_url is null or application_url ~ '^https://[^[:space:]]+$'),
  verified_contact_method text,
  cost_status text not null default 'unknown' check (cost_status in ('free-to-apply','paid','subsidized','unknown')),
  cost_amount numeric check (cost_amount is null or cost_amount >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  payout_or_benefit text,
  payout_tt_accessibility text not null default 'unknown' check (payout_tt_accessibility in ('confirmed','likely','restricted','unavailable','unknown')),
  opens_at timestamptz,
  closes_at timestamptz,
  recurring boolean not null default false,
  ongoing boolean not null default false,
  opening_hours jsonb not null default '{}'::jsonb,
  source_id uuid not null references public.ftn_index_sources(id) on delete restrict,
  source_retrieved_at timestamptz not null,
  last_verified_at timestamptz,
  verification_status text not null default 'unverified' check (verification_status in (
    'verified_by_provider','confirmed_by_authoritative_source','independently_verified',
    'community_reported','unverified','stale','disputed','expired','archived'
  )),
  confidence_score numeric(5,4) check (confidence_score is null or confidence_score between 0 and 1),
  confidence_basis text,
  source_conflict boolean not null default false,
  conflict_notes text,
  ownership_ip_implications text,
  data_sensitivity text not null default 'public' check (data_sensitivity in ('public','internal','private','restricted')),
  expiry_state text not null default 'active' check (expiry_state in ('active','closing-soon','expired','archived','unknown')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opens_at is null or closes_at is null or closes_at >= opens_at),
  check ((expiry_state <> 'archived' and verification_status <> 'archived') or archived_at is not null)
);

create index if not exists ftn_index_resources_discovery_idx
  on public.ftn_index_resources(resource_type,country_code,delivery_mode,expiry_state,last_verified_at desc);
create index if not exists ftn_index_resources_coverage_idx
  on public.ftn_index_resources using gin(coverage_codes);
create index if not exists ftn_index_resources_provider_idx
  on public.ftn_index_resources(provider_entity_id);
create index if not exists ftn_index_resources_source_idx
  on public.ftn_index_resources(source_id);
create index if not exists ftn_index_resources_search_idx
  on public.ftn_index_resources using gin(to_tsvector('simple',description||' '||coalesce(eligibility_text,'')||' '||coalesce(payout_or_benefit,'')));

create table if not exists public.ftn_index_resource_feedback (
  id uuid primary key default gen_random_uuid(),
  resource_entity_id uuid not null references public.ftn_index_resources(entity_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('marked-outdated','reported-incorrect','helpful','not-helpful')),
  detail text check (detail is null or char_length(detail) <= 1000),
  status text not null default 'received' check (status in ('received','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resource_entity_id,user_id,feedback_type)
);
create index if not exists ftn_index_resource_feedback_user_idx
  on public.ftn_index_resource_feedback(user_id,updated_at desc);
create index if not exists ftn_index_resource_feedback_resource_idx
  on public.ftn_index_resource_feedback(resource_entity_id);

create table if not exists public.ftn_ecosystem_usage_events (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null check (event_kind in (
    'resource-searched','result-viewed','saved','application-link-opened',
    'marked-outdated','reported-incorrect','helpful','not-helpful','no-results'
  )),
  resource_entity_id uuid references public.ftn_index_resources(entity_id) on delete set null,
  territory_code text check (territory_code is null or territory_code ~ '^[A-Z]{2}$'),
  coarse_locality text check (coarse_locality is null or char_length(coarse_locality) <= 120),
  query_category text check (query_category is null or char_length(query_category) <= 120),
  anonymous_session_hash text check (anonymous_session_hash is null or char_length(anonymous_session_hash) = 64),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ftn_ecosystem_usage_events_aggregate_idx
  on public.ftn_ecosystem_usage_events(event_kind,territory_code,created_at desc);
create index if not exists ftn_ecosystem_usage_events_resource_idx
  on public.ftn_ecosystem_usage_events(resource_entity_id);

alter table public.ftn_index_resources enable row level security;
alter table public.ftn_index_resource_feedback enable row level security;
alter table public.ftn_ecosystem_usage_events enable row level security;

create policy "public reads reviewed ecosystem resources"
  on public.ftn_index_resources for select to anon,authenticated
  using (
    data_sensitivity='public'
    and expiry_state <> 'archived'
    and verification_status in ('verified_by_provider','confirmed_by_authoritative_source','independently_verified','stale','disputed')
    and exists (
      select 1 from public.ftn_index_entities e
      where e.id=ftn_index_resources.entity_id and e.public_status in ('claimed','current','stale','disputed')
    )
  );
grant select on public.ftn_index_resources to anon,authenticated;

create policy "users read own resource feedback"
  on public.ftn_index_resource_feedback for select to authenticated
  using (user_id=(select auth.uid()));
create policy "users create own resource feedback"
  on public.ftn_index_resource_feedback for insert to authenticated
  with check (user_id=(select auth.uid()));
create policy "users update own resource feedback"
  on public.ftn_index_resource_feedback for update to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "users delete own resource feedback"
  on public.ftn_index_resource_feedback for delete to authenticated
  using (user_id=(select auth.uid()));
grant select,insert,update,delete on public.ftn_index_resource_feedback to authenticated;

revoke all on public.ftn_ecosystem_usage_events from anon,authenticated;
create policy "ecosystem analytics server only"
  on public.ftn_ecosystem_usage_events for all to anon,authenticated
  using (false) with check (false);

create or replace view public.ftn_ecosystem_public_resources
with (security_invoker=true)
as
select
  r.entity_id,r.canonical_key,e.ftn_id,e.slug,e.display_name as canonical_name,
  r.resource_type,p.ftn_id as provider_ftn_id,p.display_name as provider_name,
  r.description,r.country_code,r.locality,r.coverage_codes,r.delivery_mode,
  r.eligibility_text,r.application_url,r.verified_contact_method,r.cost_status,r.cost_amount,r.currency,
  r.payout_or_benefit,r.payout_tt_accessibility,r.opens_at,r.closes_at,r.recurring,r.ongoing,
  s.source_url,s.source_label as source_publisher,r.source_retrieved_at,r.last_verified_at,
  r.verification_status,r.confidence_score,r.confidence_basis,r.source_conflict,r.conflict_notes,
  r.ownership_ip_implications,r.expiry_state,r.updated_at
from public.ftn_index_resources r
join public.ftn_index_entities e on e.id=r.entity_id
left join public.ftn_index_entities p on p.id=r.provider_entity_id
join public.ftn_index_sources s on s.id=r.source_id;
grant select on public.ftn_ecosystem_public_resources to anon,authenticated;

comment on table public.ftn_index_resources is 'FTN-owned resource extension for the existing Index. Unknown values remain explicit; confidence is evidence-based, not a success probability.';
comment on table public.ftn_ecosystem_usage_events is 'Private, privacy-minimized product events. Clicks are engagement signals and never application or outcome claims.';
comment on view public.ftn_ecosystem_public_resources is 'Stable public discovery boundary for ibis and future FTN products; enforced by underlying RLS via security_invoker.';

notify pgrst,'reload schema';
