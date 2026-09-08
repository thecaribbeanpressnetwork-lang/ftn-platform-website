-- FTN provenance usage signals.
-- This is intentionally private and append-only. It records asset requests,
-- not identified people. Delivery remains disabled until provider secrets and
-- a reviewed beacon token are configured.
create table if not exists public.ftn_provenance_usage_signals (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null check (char_length(asset_id) between 1 and 160),
  page_path text null check (page_path is null or char_length(page_path) <= 500),
  referrer_origin text null check (referrer_origin is null or char_length(referrer_origin) <= 300),
  event_kind text not null default 'asset-request' check (event_kind in ('asset-request','page-request','manifest-verify')),
  signal_score integer not null default 0 check (signal_score between 0 and 100),
  alert_state text not null default 'not-configured' check (alert_state in ('not-configured','queued','sent','failed','suppressed')),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  alerted_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists ftn_provenance_usage_signals_dedupe_idx
  on public.ftn_provenance_usage_signals (dedupe_key);
create index if not exists ftn_provenance_usage_signals_asset_created_idx
  on public.ftn_provenance_usage_signals (asset_id, created_at desc);

alter table public.ftn_provenance_usage_signals enable row level security;
revoke all on public.ftn_provenance_usage_signals from anon, authenticated;
comment on table public.ftn_provenance_usage_signals is 'Private, non-identifying FTN asset usage signals. Not proof of copying or viewer identity.';
