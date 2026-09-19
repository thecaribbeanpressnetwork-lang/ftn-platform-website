-- Scarlett Plus / FTN Intelligence / FTN Pro entitlements and WAM payment evidence.
-- Modeled directly on supabase/migrations/20260908220000_ftn_ibis_wam_billing.sql -- same
-- provider, same RLS discipline, same "card/wallet credentials never touch this database" rule.
-- Kept as Scarlett's own tables rather than reusing ftn_ibis_entitlements: ibis Pro is a single
-- prepaid-period tier with its own already-shipped, live data model; merging the two products'
-- entitlements into one table is a real, separate architectural decision (a unified cross-product
-- FTN entitlement system) that deserves its own deliberate migration, not a side effect of adding
-- Scarlett billing. This schema uses the same column names/shapes deliberately so that future
-- unification migration is a straightforward reshape, not a redesign.

create table if not exists public.ftn_scarlett_plans (
  plan_id text primary key,
  name text not null,
  tier text not null check (tier in ('PLUS','INTELLIGENCE','PRO')),
  price_minor integer not null check (price_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  duration_days integer check (duration_days is null or duration_days between 1 and 366),
  active boolean not null default false,
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pricing hypotheses from apps/ftn-scarlett-browser-extension/entitlements.js, not immutable --
-- active=false until a founder confirms the real price and turns a plan on.
insert into public.ftn_scarlett_plans(plan_id,name,tier,price_minor,currency,duration_days,active,features)
values
  ('scarlett-plus-monthly','Scarlett+ — monthly','PLUS',599,'USD',30,false,
   '["Full Transform on every supported page","Full Compare","Full Blend","Advanced accessibility profiles","Cross-device preference sync"]'::jsonb),
  ('ftn-intelligence-monthly','FTN Intelligence — monthly','INTELLIGENCE',1199,'USD',30,false,
   '["Everything in Scarlett+","Larger ibis allowance","Deeper research","Headspace escalation"]'::jsonb),
  ('ftn-pro-monthly','FTN Pro — monthly','PRO',2499,'USD',30,false,
   '["Everything in FTN Intelligence","Highest quotas","Advanced Headspace","Professional tooling"]'::jsonb)
on conflict (plan_id) do update set
  name=excluded.name,tier=excluded.tier,price_minor=excluded.price_minor,
  currency=excluded.currency,duration_days=excluded.duration_days,
  active=excluded.active,features=excluded.features,updated_at=now();

create table if not exists public.ftn_scarlett_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.ftn_scarlett_plans(plan_id),
  provider text not null default 'WAM' check (provider = 'WAM'),
  order_reference text not null unique,
  provider_payment_id text unique,
  provider_invoice_id text,
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'PENDING' check (status in ('PENDING','CHECKOUT_READY','PROCESSING','SUCCEEDED','FAILED','CANCELED','EXPIRED','REFUNDED')),
  checkout_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ftn_scarlett_payment_orders_user_created_idx on public.ftn_scarlett_payment_orders(user_id,created_at desc);

-- Richer status set than ibis's entitlements table: TRIAL and PAST_DUE are included for the
-- product-definition's required truth states, even though WAM as currently integrated is a
-- prepaid-period gateway (pay, get N days), not a true auto-recurring subscription with card-on-
-- file retries -- there is no WAM event today that would ever set PAST_DUE (see
-- ftn-scarlett-wam-webhook/index.ts's own comment). It is modeled here so the column doesn't need
-- a breaking change if/when a recurring-billing capability is added; until then PAST_DUE is
-- reachable only by direct admin action, never by the webhook.
create table if not exists public.ftn_scarlett_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.ftn_scarlett_plans(plan_id),
  tier text not null check (tier in ('PLUS','INTELLIGENCE','PRO')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','TRIAL','EXPIRED','PAST_DUE','CANCELLED','REVOKED','REFUNDED')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_order_id uuid references public.ftn_scarlett_payment_orders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,plan_id)
);
create index if not exists ftn_scarlett_entitlements_user_status_idx on public.ftn_scarlett_entitlements(user_id,status,ends_at desc);

create table if not exists public.ftn_scarlett_payment_events (
  event_id text primary key,
  provider text not null default 'WAM' check (provider = 'WAM'),
  event_type text not null,
  provider_payment_id text,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  processing_status text not null default 'RECEIVED' check (processing_status in ('RECEIVED','PROCESSED','REJECTED','FAILED')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text
);

alter table public.ftn_scarlett_plans enable row level security;
alter table public.ftn_scarlett_payment_orders enable row level security;
alter table public.ftn_scarlett_entitlements enable row level security;
alter table public.ftn_scarlett_payment_events enable row level security;

drop policy if exists "scarlett_plans_public_read" on public.ftn_scarlett_plans;
create policy "scarlett_plans_public_read" on public.ftn_scarlett_plans for select to anon,authenticated using (active);

drop policy if exists "scarlett_orders_owner_read" on public.ftn_scarlett_payment_orders;
create policy "scarlett_orders_owner_read" on public.ftn_scarlett_payment_orders for select to authenticated using (user_id = auth.uid());

drop policy if exists "scarlett_entitlements_owner_read" on public.ftn_scarlett_entitlements;
create policy "scarlett_entitlements_owner_read" on public.ftn_scarlett_entitlements for select to authenticated using (user_id = auth.uid());

drop policy if exists "scarlett_payment_events_server_only" on public.ftn_scarlett_payment_events;
create policy "scarlett_payment_events_server_only" on public.ftn_scarlett_payment_events for all to anon,authenticated using (false) with check (false);

revoke all on public.ftn_scarlett_plans,public.ftn_scarlett_payment_orders,public.ftn_scarlett_entitlements,public.ftn_scarlett_payment_events from anon,authenticated;
grant select on public.ftn_scarlett_plans to anon,authenticated;
grant select on public.ftn_scarlett_payment_orders,public.ftn_scarlett_entitlements to authenticated;

comment on table public.ftn_scarlett_payment_orders is 'WAM payment lifecycle evidence only; never stores card, wallet, CVV or API credentials.';
comment on table public.ftn_scarlett_payment_events is 'Idempotency ledger containing hashes and event identifiers, not raw webhook payloads.';
comment on table public.ftn_scarlett_entitlements is 'Server-checked Scarlett/FTN Intelligence/FTN Pro entitlement truth. Never write to this table from a client-supplied value -- only ftn-scarlett-wam-webhook (after verifying a WAM signature) and direct admin action may write it.';
