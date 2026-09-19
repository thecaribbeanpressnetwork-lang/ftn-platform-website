-- Scarlett founder product analytics: anonymous product telemetry, never a browsing-history
-- database. Modeled directly on supabase/migrations/20260908193000_ftn_ibis_mcp_usage_events.sql
-- (server-only RLS, deny-all to anon/authenticated, service_role-only writes via an Edge Function)
-- -- the same "aggregate adoption evidence, no raw content, no identity" shape already proven for
-- FTN ibis MCP usage, applied to Scarlett's own event vocabulary.
--
-- Two tables only, deliberately:
--   ftn_scarlett_analytics_events          -- append-only, one row per allow-listed product event
--   ftn_scarlett_acquisition_attribution   -- minimal first-touch channel -> conversion linkage
-- No ftn_scarlett_analytics_daily table/materialized view and no ftn_scarlett_experiments table
-- this pass: daily/retention/funnel aggregates are computed on read, in
-- supabase/functions/ftn-owner-control/index.ts's new "scarlett-analytics" action, from the raw
-- event rows -- exactly the pattern the existing "dashboard" action already uses for
-- ftn_ibis_mcp_usage_events (see its byTool/byHost/byDay reduction). A maintained aggregate table
-- is real added complexity (a second write path, a drift risk between raw and aggregate) that
-- isn't justified at Scarlett's current volume; revisit once real traffic makes on-read aggregation
-- slow. No experiments are implemented in this build, so ftn_scarlett_experiments would be an empty
-- table with no writer -- the event schema's experiment_id/experiment_variant columns exist and
-- stay null until real experimentation is built, deliberately not before.

create table if not exists public.ftn_scarlett_analytics_events (
  id uuid primary key default gen_random_uuid(),
  -- Client-supplied idempotency key (crypto.randomUUID() at the moment the event is queued). The
  -- unique constraint below is what lets the ingestion function treat a retried/duplicated submit
  -- as an idempotent no-op instead of double-counting it -- required by the adversarial "replayed
  -- event ID" test case.
  event_id uuid not null,
  event_name text not null check (event_name in (
    'install','extension_updated',
    'onboarding_started','onboarding_completed',
    'session_started',
    'mode_used','assist_used','adapt_used','transform_used','compare_used','blend_used',
    'data_faucet_opened','shield_enabled','shield_disabled','site_break_recovery_used',
    'search_used','find_used',
    'ibis_handoff','headspace_handoff',
    'paywall_seen','premium_preview_used','checkout_started','checkout_completed','checkout_failed',
    'subscription_started','subscription_renewed','subscription_cancelled','subscription_expired','subscription_past_due',
    'error','performance_sample'
  )),
  event_version smallint not null default 1 check (event_version between 1 and 100),
  -- Server-derived, never trusted from the client -- see FTN_SCARLETT_ANALYTICS_PIPELINE.md
  -- ("derive server timestamp" in the ingestion contract).
  occurred_at timestamptz not null default now(),
  -- Anonymous product identity: a random id generated once by the extension and stored locally
  -- (chrome.storage.local), never derived from hardware/device identity, never joined to an FTN
  -- account row in this table. See the acquisition-attribution table below for the one narrow,
  -- one-way exception (a paid conversion's plan tier, not identity).
  anonymous_install_id uuid not null,
  anonymous_session_id uuid not null,
  account_state text check (account_state is null or account_state in
    ('SIGNED_OUT','FREE','TRIAL','SCARLETT_PLUS','FTN_INTELLIGENCE','FTN_PRO','EXPIRED','PAYMENT_PAST_DUE','CANCELLED')),
  subscription_tier text check (subscription_tier is null or subscription_tier in ('FREE','SCARLETT_PLUS','FTN_INTELLIGENCE','FTN_PRO')),
  scarlett_version text check (scarlett_version is null or scarlett_version ~ '^\d{1,4}\.\d{1,4}\.\d{1,4}$'),
  browser_family text check (browser_family is null or browser_family in ('chrome','edge','opera','other')),
  browser_version_bucket text check (browser_version_bucket is null or length(browser_version_bucket) <= 20),
  platform_family text check (platform_family is null or platform_family in ('windows','mac','linux','chromeos','other')),
  -- Derived from the request's Accept-Language regional subtag (e.g. en-TT -> TT), NOT from IP
  -- geolocation. No IP address is read, logged or stored anywhere in this pipeline. See
  -- docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md section 6 for the exact derivation and its honest
  -- limits (reflects browser/OS locale, not actual location).
  country_or_region_coarse text check (country_or_region_coarse is null or country_or_region_coarse ~ '^[A-Z]{2}$'),
  acquisition_source text not null default 'unknown' check (acquisition_source in
    ('ftn_site','organic_search','youtube','tiktok','facebook','instagram','direct','partner','press','unknown')),
  campaign_id text check (campaign_id is null or campaign_id ~ '^[a-z0-9_-]{1,60}$'),
  feature text check (feature is null or length(feature) <= 40),
  mode text check (mode is null or mode in ('ORIGINAL','ASSIST','ADAPT','TRANSFORM','COMPARE','BLEND')),
  result text check (result is null or length(result) <= 30),
  duration_bucket text check (duration_bucket is null or duration_bucket in ('<50ms','50-100ms','100-250ms','250-500ms','500ms-1s','>1s')),
  performance_bucket text check (performance_bucket is null or performance_bucket in ('<50ms','50-100ms','100-250ms','250-500ms','500ms-1s','>1s')),
  error_class text check (error_class is null or error_class in ('network','permission','render','handoff','billing','unknown')),
  error_code text check (error_code is null or error_code ~ '^[a-z0-9_-]{1,60}$'),
  experiment_id text check (experiment_id is null or experiment_id ~ '^[a-z0-9_-]{1,60}$'),
  experiment_variant text check (experiment_variant is null or experiment_variant ~ '^[a-z0-9_-]{1,40}$'),
  -- Strictly allow-listed at ingestion time (see ftn-scarlett-telemetry/index.ts's ALLOWED_METADATA_KEYS)
  -- to a closed-vocabulary set: pageType, blendLevel, resultCount, trackerCategory, capability. No
  -- free-text key survives ingestion -- this column can never become a raw-page-content backdoor.
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);
create unique index if not exists ftn_scarlett_analytics_events_event_id_key on public.ftn_scarlett_analytics_events(event_id);
create index if not exists ftn_scarlett_analytics_events_time_idx on public.ftn_scarlett_analytics_events(occurred_at desc);
create index if not exists ftn_scarlett_analytics_events_name_time_idx on public.ftn_scarlett_analytics_events(event_name,occurred_at desc);
create index if not exists ftn_scarlett_analytics_events_install_idx on public.ftn_scarlett_analytics_events(anonymous_install_id,occurred_at desc);
alter table public.ftn_scarlett_analytics_events enable row level security;
revoke all on public.ftn_scarlett_analytics_events from anon, authenticated;
drop policy if exists "ftn_scarlett_analytics_events_server_only" on public.ftn_scarlett_analytics_events;
create policy "ftn_scarlett_analytics_events_server_only" on public.ftn_scarlett_analytics_events
  for all to anon, authenticated using (false) with check (false);
comment on table public.ftn_scarlett_analytics_events is 'Server-only Scarlett product telemetry: anonymous install/session identity, closed-vocabulary feature/mode/result fields, allow-listed metadata only. No URL, page text, selected text, search query content, form value or credential is ever a column or a permitted metadata key here.';

-- Minimal, one-way acquisition attribution: which channel a converting checkout came from. Keyed
-- flexibly (one row per meaningful acquisition+conversion event, not per pageview) because there
-- is no reliable install-referrer API for an unpacked/not-yet-store-listed Chrome extension -- see
-- docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md section 8 for why this is real and working today rather
-- than a fabricated capability, and what remains an honest gap. This table deliberately does NOT
-- store a user_id or email: it links an anonymous channel touch to a payment order id, one-way,
-- never back to a durable browsing identity.
create table if not exists public.ftn_scarlett_acquisition_attribution (
  id uuid primary key default gen_random_uuid(),
  anonymous_install_id uuid,
  order_id uuid references public.ftn_scarlett_payment_orders(id) on delete set null,
  source text not null default 'unknown' check (source in
    ('ftn_site','organic_search','youtube','tiktok','facebook','instagram','direct','partner','press','unknown')),
  medium text check (medium is null or length(medium) <= 40),
  campaign_id text check (campaign_id is null or campaign_id ~ '^[a-z0-9_-]{1,60}$'),
  creative text check (creative is null or length(creative) <= 60),
  referrer_category text not null default 'unknown' check (referrer_category in
    ('ftn_site','search_engine','social','video','direct','partner','press','unknown')),
  first_touch_at timestamptz not null default now(),
  converted_at timestamptz,
  converted_tier text check (converted_tier is null or converted_tier in ('SCARLETT_PLUS','FTN_INTELLIGENCE','FTN_PRO'))
);
create index if not exists ftn_scarlett_acquisition_attribution_time_idx on public.ftn_scarlett_acquisition_attribution(first_touch_at desc);
create index if not exists ftn_scarlett_acquisition_attribution_converted_idx on public.ftn_scarlett_acquisition_attribution(converted_at desc) where converted_at is not null;
alter table public.ftn_scarlett_acquisition_attribution enable row level security;
revoke all on public.ftn_scarlett_acquisition_attribution from anon, authenticated;
drop policy if exists "ftn_scarlett_acquisition_attribution_server_only" on public.ftn_scarlett_acquisition_attribution;
create policy "ftn_scarlett_acquisition_attribution_server_only" on public.ftn_scarlett_acquisition_attribution
  for all to anon, authenticated using (false) with check (false);
comment on table public.ftn_scarlett_acquisition_attribution is 'Server-only, one-way acquisition-channel-to-conversion linkage. No user_id, no email, no durable browsing identity -- only an anonymous install id and/or a payment order id.';

-- Retention (documented, not scheduled): no pg_cron job is created by this migration -- no
-- pg_cron usage exists anywhere else in this repo's migrations to extend, and scheduling one
-- against the live project needs access this session does not have. Starting point once a founder
-- confirms the pg_cron extension is enabled on the live project:
--   select cron.schedule('ftn-scarlett-analytics-retention','0 4 * * *',
--     $$delete from public.ftn_scarlett_analytics_events where occurred_at < now() - interval '90 days'$$);
-- Policy (see docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md section 9 for the full rationale):
--   raw events: 90 days · acquisition attribution: 24 months (low-volume, conversion-only rows) ·
--   billing/legal records (ftn_scarlett_payment_orders/entitlements/payment_events) are retained
--   separately, per accounting/legal requirement, not this policy.
