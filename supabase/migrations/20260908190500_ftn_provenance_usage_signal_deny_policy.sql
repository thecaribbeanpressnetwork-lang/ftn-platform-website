-- The provenance signal ledger is written only by the server-side beacon.
-- Explicitly deny Data API client roles while preserving service-role writes.
create policy "provenance signals deny client access"
  on public.ftn_provenance_usage_signals
  for all to anon, authenticated
  using (false)
  with check (false);
