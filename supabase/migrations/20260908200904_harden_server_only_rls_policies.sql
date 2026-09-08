-- Explicitly document the deny-by-default boundary for server-only FTN tables.
-- These tables already have RLS enabled and no anon/authenticated table grants.

create policy "mayor_access_server_only"
  on private.mayor_access for all to anon, authenticated
  using (false) with check (false);

create policy "founder_registrations_server_only"
  on public.founder_registrations for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_account_requests_server_only"
  on public.ftn_account_requests for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_control_journal_server_only"
  on public.ftn_control_journal for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_control_state_server_only"
  on public.ftn_control_state for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_deployment_health_server_only"
  on public.ftn_deployment_health for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_external_link_health_server_only"
  on public.ftn_external_link_health for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_feature_controls_server_only"
  on public.ftn_feature_controls for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_founder_actions_server_only"
  on public.ftn_founder_actions for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_founder_devices_server_only"
  on public.ftn_founder_devices for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_founder_identities_server_only"
  on public.ftn_founder_identities for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_integration_readiness_server_only"
  on public.ftn_integration_readiness for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_operator_roles_server_only"
  on public.ftn_operator_roles for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_owner_access_audit_server_only"
  on public.ftn_owner_access_audit for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_platform_transactions_server_only"
  on public.ftn_platform_transactions for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_product_controls_server_only"
  on public.ftn_product_controls for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_source_controls_server_only"
  on public.ftn_source_controls for all to anon, authenticated
  using (false) with check (false);

create policy "ftn_user_access_grants_server_only"
  on public.ftn_user_access_grants for all to anon, authenticated
  using (false) with check (false);
