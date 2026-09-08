# FTN Supabase security remediation map

Status: audit completed; changes intentionally staged for the reset-time write/verify pass.

## Scope rule

Do not modify Supabase-managed `auth` or `storage` tables to silence Advisor findings. Their no-policy state is provider-managed and the project roles currently have no direct access to most of them. The application remediation scope is `public` and `private` tables only.

## RLS findings

The application tables with RLS enabled and no policy are currently server- or owner-controlled:

- `public.founder_registrations`
- `public.ftn_account_requests`
- `public.ftn_control_journal`
- `public.ftn_control_state`
- `public.ftn_deployment_health`
- `public.ftn_external_link_health`
- `public.ftn_feature_controls`
- `public.ftn_founder_actions`
- `public.ftn_founder_devices`
- `public.ftn_founder_identities`
- `public.ftn_integration_readiness`
- `public.ftn_operator_roles`
- `public.ftn_owner_access_audit`
- `public.ftn_platform_transactions`
- `public.ftn_product_controls`
- `public.ftn_source_controls`
- `public.ftn_user_access_grants`
- `private.mayor_access`

Before adding policies, verify every caller. For server-only tables, preserve the existing deny-by-default boundary and add an explicit deny policy if required for Advisor clarity. For founder-owned tables, use an owner predicate based on trusted authorization data. Never add `USING (true)` merely to clear a warning.

## SECURITY DEFINER findings

### Anonymous execution requires immediate review

- `public.issue_public_coordinates(uuid)`: intentionally returns rounded coordinates for public issue display; verify that the underlying issue is public before returning coordinates, then keep only the minimum required grant.
- `public.register_founder(text,text,text,text,uuid)`: public registration flow; retain anonymous execution only if the registration-key and rate-limit protections are confirmed. Remove the unnecessary authenticated grant.

### Authenticated execution is owner- or Mayor-gated

These functions already check `auth.uid()` or Mayor access in their bodies and use a restricted search path. Keep `SECURITY DEFINER` only where access to private tables is required; otherwise convert to invoker functions after testing:

- `ibis_memory_archive`
- `ibis_memory_snapshot`
- `ibis_memory_upsert`
- `mayor_dashboard_summary`
- `mayor_dashboard_summary_v2`
- `mayor_map_data`
- `mayor_operational_snapshot`
- `mayor_record_archive`
- `mayor_record_upsert`

The reset-time migration must revoke execution from roles that do not need each function, preserve legitimate owner/Mayor callers, set a fixed `search_path`, and run the application integration tests before and after each group.

## Password protection

Enable Supabase leaked-password protection in Auth settings if the project plan supports it. If unavailable, document the limitation and compensate with strong password rules, MFA, rate limits and monitoring rather than claiming the warning is resolved.

## Verification gates

1. Snapshot grants, policies and function definitions.
2. Apply one narrow migration group.
3. Test anonymous, ordinary authenticated, founder-owner and Mayor roles.
4. Re-run Security Advisor.
5. Confirm Headspace, Nexus Command, Community Connect and legacy paths still work.
6. Record the exact Advisor delta in the release notes.
