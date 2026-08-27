-- FTN Mayor Mode security hardening.
-- The legacy mayor_dashboard_summary function already performs an internal
-- auth.uid() + private.has_active_mayor_access() check, so anonymous execution
-- failed closed. This migration removes the unnecessary anon/PUBLIC EXECUTE
-- grant so the legacy RPC matches the newer Mayor Mode functions' external
-- permission boundary and no longer presents an avoidable public attack surface.

revoke all on function public.mayor_dashboard_summary(timestamptz,timestamptz,text) from public;
revoke all on function public.mayor_dashboard_summary(timestamptz,timestamptz,text) from anon;
grant execute on function public.mayor_dashboard_summary(timestamptz,timestamptz,text) to authenticated;
