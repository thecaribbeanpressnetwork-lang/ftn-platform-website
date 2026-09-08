-- FTN ibis Standard + Pro access and WAM payment evidence.
-- Card/wallet credentials remain on WAM-hosted checkout and are never stored here.

create table if not exists public.ftn_ibis_plans (
  plan_id text primary key,
  name text not null,
  tier text not null check (tier in ('STANDARD','PRO')),
  price_minor integer not null check (price_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  duration_days integer check (duration_days is null or duration_days between 1 and 366),
  active boolean not null default false,
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ftn_ibis_plans(plan_id,name,tier,price_minor,currency,duration_days,active,features)
values
  ('ibis-standard','FTN ibis Standard','STANDARD',0,'TTD',null,true,
   '["Five public source-backed intelligence tools plus plan discovery","Source links and provenance","Basic Caribbean opportunity search","No payment required"]'::jsonb),
  ('ibis-pro-30d','FTN ibis Pro — 30 days','PRO',9900,'TTD',30,true,
   '["Everything in Standard","Private saved intelligence watchlists","International capital brief matching","Access to paid-model features only after provider and cost approval"]'::jsonb)
on conflict (plan_id) do update set
  name=excluded.name,tier=excluded.tier,price_minor=excluded.price_minor,
  currency=excluded.currency,duration_days=excluded.duration_days,
  active=excluded.active,features=excluded.features,updated_at=now();

create table if not exists public.ftn_ibis_payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.ftn_ibis_plans(plan_id),
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
create index if not exists ftn_ibis_payment_orders_user_created_idx on public.ftn_ibis_payment_orders(user_id,created_at desc);

create table if not exists public.ftn_ibis_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.ftn_ibis_plans(plan_id),
  tier text not null check (tier in ('PRO')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','EXPIRED','REVOKED','REFUNDED')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source_order_id uuid not null references public.ftn_ibis_payment_orders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,plan_id)
);
create index if not exists ftn_ibis_entitlements_user_status_idx on public.ftn_ibis_entitlements(user_id,status,ends_at desc);

create table if not exists public.ftn_ibis_payment_events (
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

create table if not exists public.ftn_ibis_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  query text not null check (char_length(query) between 2 and 240),
  markets text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ftn_ibis_watchlists_user_created_idx on public.ftn_ibis_watchlists(user_id,created_at desc);

alter table public.ftn_ibis_plans enable row level security;
alter table public.ftn_ibis_payment_orders enable row level security;
alter table public.ftn_ibis_entitlements enable row level security;
alter table public.ftn_ibis_payment_events enable row level security;
alter table public.ftn_ibis_watchlists enable row level security;

drop policy if exists "ibis_plans_public_read" on public.ftn_ibis_plans;
create policy "ibis_plans_public_read" on public.ftn_ibis_plans for select to anon,authenticated using (active);

drop policy if exists "ibis_orders_owner_read" on public.ftn_ibis_payment_orders;
create policy "ibis_orders_owner_read" on public.ftn_ibis_payment_orders for select to authenticated using (user_id = auth.uid());

drop policy if exists "ibis_entitlements_owner_read" on public.ftn_ibis_entitlements;
create policy "ibis_entitlements_owner_read" on public.ftn_ibis_entitlements for select to authenticated using (user_id = auth.uid());

drop policy if exists "ibis_payment_events_server_only" on public.ftn_ibis_payment_events;
create policy "ibis_payment_events_server_only" on public.ftn_ibis_payment_events for all to anon,authenticated using (false) with check (false);

drop policy if exists "ibis_watchlists_server_only" on public.ftn_ibis_watchlists;
create policy "ibis_watchlists_server_only" on public.ftn_ibis_watchlists for all to anon,authenticated using (false) with check (false);

revoke all on public.ftn_ibis_plans,public.ftn_ibis_payment_orders,public.ftn_ibis_entitlements,public.ftn_ibis_payment_events,public.ftn_ibis_watchlists from anon,authenticated;
grant select on public.ftn_ibis_plans to anon,authenticated;
grant select on public.ftn_ibis_payment_orders,public.ftn_ibis_entitlements to authenticated;

comment on table public.ftn_ibis_payment_orders is 'WAM payment lifecycle evidence only; never stores card, wallet, CVV or API credentials.';
comment on table public.ftn_ibis_payment_events is 'Idempotency ledger containing hashes and event identifiers, not raw webhook payloads.';
comment on table public.ftn_ibis_watchlists is 'Private Pro watch queries accessed only through the authenticated entitlement-gated Edge Function.';
