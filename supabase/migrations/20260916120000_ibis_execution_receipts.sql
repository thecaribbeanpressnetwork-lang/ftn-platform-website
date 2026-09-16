-- FTN ibis execution lifecycle (Slice 3, DRAFTED -- NOT APPLIED in this pass).
--
-- DO NOT RUN THIS MIGRATION until someone with real project access has audited, against the
-- actual live Supabase project:
--   - project identity (this file was never executed against any project -- confirm it targets
--     the correct one before running `supabase db push` / `migration up`);
--   - existing table-name conflicts (`ibis_execution_plans` does not exist in this repo's other
--     migrations as of this writing -- reconfirm against the live project's actual schema, not
--     just this repo's migration history, since migrations and live state can drift);
--   - RLS is enabled and the deny-all policy below is the ONLY one governing anon/authenticated;
--   - grants match (anon/authenticated revoked; only service_role, used exclusively by the
--     ibis-assistant Edge Function's server-side calls, can read/write);
--   - the indexes below are actually useful at real data volumes;
--   - a real retention job is scheduled (see the commented starting point at the bottom -- this
--     migration does not itself schedule one);
--   - a rollback migration exists before this is applied to a database anyone depends on (see the
--     companion `..._ibis_execution_receipts_rollback.sql` in this same directory).
--
-- This repo's Edge Functions currently have NO live database connection/credentials available in
-- the environment this was authored in -- this file is reviewed-ready, not deployed.
--
-- Design notes:
--   - ONE table, not two: a plan and its eventual receipt are the same row, moving through
--     `state` (PENDING -> SUCCEEDED | FALLBACK_REQUESTED | EXPIRED | REJECTED). This is what
--     makes the RECEIPT stage's PENDING-to-terminal transition a single atomic UPDATE ... WHERE
--     state='PENDING' -- Postgres's own row-level locking is the actual concurrency-safety
--     mechanism (a single UPDATE statement is atomic; if zero rows are affected, someone else
--     already transitioned this exact row, and this caller must treat that as rejected).
--   - No prompt or answer TEXT is stored. The RECEIPT stage's fallback generation needs the
--     original prompt to regenerate an answer, but persisting user prompt text durably was
--     judged not "genuinely required" when a cheaper, privacy-preserving alternative exists: the
--     client resends the same prompt text at receipt time (it already has it from its own
--     original submission), and the server checks it against `text_sha256` (computed once at
--     PLAN time, never the reverse) before trusting it -- this detects a forged/substituted
--     prompt at receipt time without ever storing the prompt itself. This is a reasonable-effort
--     integrity check, not a cryptographic authentication scheme; it is documented as such.
create table if not exists public.ibis_execution_plans (
  plan_id text primary key,
  authorized_target text not null check (authorized_target in ('browser_local','server_provider')),
  intent text not null,
  freshness_required boolean not null default false,
  text_sha256 text not null,
  state text not null default 'PENDING' check (state in ('PENDING','SUCCEEDED','FALLBACK_REQUESTED','EXPIRED','REJECTED')),
  -- Ownership: nullable because a guest (signed-out) IBIS session is a normal, supported case.
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  -- Populated only once the plan reaches a terminal state.
  provider text,
  success boolean,
  degraded boolean,
  latency_ms integer,
  rejection_reason text check (rejection_reason in ('MALFORMED_RECEIPT','UNKNOWN_PLAN','DUPLICATE_RECEIPT','EXPIRED_PLAN','MISMATCHED_AUTHORIZATION','TEXT_MISMATCH') or rejection_reason is null),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  updated_at timestamptz not null default now(),
  -- Leased-claim fencing (see ibis-lifecycle-store.ts's module header for the full contract).
  -- lease_owner/lease_version together are the fencing token: a fallback-generation attempt may
  -- only finalize this row if it presents the EXACT lease_owner+lease_version it was issued at
  -- claim time. Reclaiming an expired lease increments lease_version, which is what fences off
  -- whatever worker held the previous lease -- its eventual finalize attempt will present a
  -- stale lease_version and match zero rows.
  lease_owner text,
  lease_version integer not null default 0,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0
);
create index if not exists ibis_execution_plans_state_idx on public.ibis_execution_plans(state);
create index if not exists ibis_execution_plans_expires_idx on public.ibis_execution_plans(expires_at) where state = 'PENDING';
create index if not exists ibis_execution_plans_lease_idx on public.ibis_execution_plans(lease_expires_at) where state = 'FALLBACK_REQUESTED';
create index if not exists ibis_execution_plans_time_idx on public.ibis_execution_plans(created_at desc);
create index if not exists ibis_execution_plans_user_idx on public.ibis_execution_plans(user_id) where user_id is not null;

-- KNOWN GAP, disclosed rather than hidden: createSupabaseLifecycleStore's reclaimExpiredLease
-- path (ibis-lifecycle-store.ts) reads the current lease_version, then issues a conditional
-- UPDATE keyed on that exact version -- a real read-then-write TOCTOU window exists between those
-- two calls (vanishingly unlikely to matter in practice, since it requires two reclaimers to race
-- within that same short window against an already-expired lease, but real). A Postgres function
-- (`security definer`, callable only by service_role) performing the read-and-conditional-update
-- as one server-side transaction would close this gap completely and is the recommended follow-up
-- before this path carries meaningful production traffic volume -- not implemented in this pass.

alter table public.ibis_execution_plans enable row level security;
revoke all on public.ibis_execution_plans from anon, authenticated;
drop policy if exists "ibis_execution_plans_server_only" on public.ibis_execution_plans;
create policy "ibis_execution_plans_server_only" on public.ibis_execution_plans
  for all to anon, authenticated using (false) with check (false);
-- The browser NEVER writes to this table directly, in either direction -- only the
-- ibis-assistant Edge Function's service-role client does, for both plan creation and receipt
-- transitions. RLS denies anon/authenticated entirely; there is no policy under which a browser
-- request (which only ever carries the anon or an authenticated user's own JWT) can read or
-- write a row here.

comment on table public.ibis_execution_plans is 'Server-only IBIS execution plan/receipt lifecycle: PENDING -> SUCCEEDED | FALLBACK_REQUESTED | EXPIRED | REJECTED. No prompt or answer text is stored -- only a SHA-256 of the prompt, for receipt-time integrity checking.';

-- Retention: no scheduled cleanup job is created by this migration -- that needs live-project
-- access this migration itself was never applied with. Starting point once this table exists:
--   delete from public.ibis_execution_plans where created_at < now() - interval '90 days';
