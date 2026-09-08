-- FTN ibis MCP adoption evidence. Server-only writes; no raw prompts or identities.
create table if not exists public.ftn_ibis_mcp_usage_events (
  id uuid primary key default gen_random_uuid(),
  event_kind text not null check (event_kind in ('tool-call','tool-success','tool-error','source-open','conversion')),
  host_name text not null default 'mcp',
  tool_name text not null,
  request_category text,
  result_state text,
  latency_ms integer,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists ftn_ibis_mcp_usage_events_time_idx on public.ftn_ibis_mcp_usage_events(occurred_at desc);
create index if not exists ftn_ibis_mcp_usage_events_tool_idx on public.ftn_ibis_mcp_usage_events(tool_name,occurred_at desc);
alter table public.ftn_ibis_mcp_usage_events enable row level security;
revoke all on public.ftn_ibis_mcp_usage_events from anon, authenticated;
drop policy if exists "ftn_ibis_mcp_usage_events_server_only" on public.ftn_ibis_mcp_usage_events;
create policy "ftn_ibis_mcp_usage_events_server_only" on public.ftn_ibis_mcp_usage_events
  for all to anon, authenticated using (false) with check (false);
comment on table public.ftn_ibis_mcp_usage_events is 'Private aggregate FTN ibis MCP adoption evidence. No raw prompt, transcript, email, WhatsApp content or viewer identity.';
