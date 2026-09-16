-- FTN ibis execution receipts (Slice 3, drafted -- NOT applied in this pass; no live database
-- connection/credentials were available in the environment this was written in to run
-- `supabase db push`/`migration up` against the real project. This file is a reviewed, ready
-- schema for the smallest secure persistent receipt store requested: it must be applied by
-- someone with real project access before durable provenance exists. Until then, receipts remain
-- observable only in Supabase's own function logs (see
-- supabase/functions/_shared/ibis-canonical-brain.ts's recordReceiptAndMaybeFallback) --
-- temporary observability, explicitly not durable provenance.
--
-- Design mirrors the existing ftn_ibis_mcp_usage_events pattern in this same migrations
-- directory: server-only writes, RLS enabled, anon/authenticated fully denied, no prompt/answer
-- content stored (only the plan/execution metadata this table's own columns name -- text content
-- lives nowhere in this table by design, matching "no prompt/answer content unless genuinely
-- required").
create table if not exists public.ibis_execution_receipts (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  -- Ownership: nullable because a guest (unauthenticated) IBIS session is a normal, supported
  -- case -- a receipt from a signed-out visitor is still real provenance, just not attributable
  -- to an account. A future authenticated-session identifier can populate this without a schema
  -- change once regular IBIS's own session/auth wiring exposes one to this Edge Function.
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  selected_execution_target text not null check (selected_execution_target in ('browser_local','server_provider')),
  actual_execution_target text not null check (actual_execution_target in ('browser_local','server_provider')),
  success boolean not null,
  degraded boolean not null default false,
  provider text not null,
  latency_ms integer,
  rejected boolean not null default false,
  rejection_reason text check (rejection_reason in ('MALFORMED_RECEIPT','UNKNOWN_PLAN','DUPLICATE_RECEIPT','EXPIRED_PLAN','MISMATCHED_AUTHORIZATION') or rejection_reason is null),
  recorded_at timestamptz not null default now()
);
create index if not exists ibis_execution_receipts_plan_idx on public.ibis_execution_receipts(plan_id);
create index if not exists ibis_execution_receipts_time_idx on public.ibis_execution_receipts(recorded_at desc);
create index if not exists ibis_execution_receipts_user_idx on public.ibis_execution_receipts(user_id) where user_id is not null;

alter table public.ibis_execution_receipts enable row level security;
revoke all on public.ibis_execution_receipts from anon, authenticated;
drop policy if exists "ibis_execution_receipts_server_only" on public.ibis_execution_receipts;
create policy "ibis_execution_receipts_server_only" on public.ibis_execution_receipts
  for all to anon, authenticated using (false) with check (false);
-- Only the service role (used exclusively by the ibis-assistant Edge Function's own
-- server-side write, never exposed to a browser) can read or write this table; RLS denies
-- anon/authenticated entirely, matching the "no insecure public table" requirement directly.

comment on table public.ibis_execution_receipts is 'Server-only IBIS execution receipts: which plan, which execution target was selected vs. actually used, success/failure, provider, latency. No prompt or answer text is stored.';

-- Retention: this migration does NOT create a scheduled cleanup job (pg_cron or otherwise) --
-- that is an operational decision (retention window length, whether it runs via pg_cron or an
-- external scheduled Edge Function) that needs the same live-project access this migration
-- itself could not be applied with. A starting point, to be scheduled once this table exists:
--   delete from public.ibis_execution_receipts where recorded_at < now() - interval '90 days';
