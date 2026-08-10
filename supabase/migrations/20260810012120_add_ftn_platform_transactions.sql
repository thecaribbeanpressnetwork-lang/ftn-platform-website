-- FTN Platform transaction escrow.
-- Reconstructed from the applied 2026-08-10 production schema so FTN owns a
-- reproducible definition in Git. Direct anon/auth table access remains closed;
-- consequential writes are performed by the verified Edge Function service role.

create table if not exists public.ftn_platform_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null unique,
  created_at timestamptz not null default now(),
  tool_id text not null,
  client_email text not null,
  creator_name text,
  work_title text,
  country text,
  transaction_type text,
  authority_confirmed boolean not null default false,
  human_verified boolean not null default false,
  route text,
  payload jsonb not null default '{}'::jsonb,
  founder_status text not null default 'FOUNDER_REVIEW',
  external_destination text,
  gmail_draft_id text,
  sent_message_id text,
  poe_suggestions jsonb not null default '[]'::jsonb,
  legal_version text,
  source_origin text,
  user_agent text
);

create index if not exists ftn_platform_transactions_created_at_idx
  on public.ftn_platform_transactions (created_at desc);
create index if not exists ftn_platform_transactions_tool_id_idx
  on public.ftn_platform_transactions (tool_id);
create index if not exists ftn_platform_transactions_founder_status_idx
  on public.ftn_platform_transactions (founder_status);

alter table public.ftn_platform_transactions enable row level security;

-- Intentionally no anon/auth policies. The FTN transaction Edge Function uses the
-- service role only after origin validation, metadata validation, authority confirmation
-- and server-side Cloudflare Turnstile verification.
