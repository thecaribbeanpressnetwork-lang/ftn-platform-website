-- Supabase's optional automatic-RLS project helper is installed as a SECURITY
-- DEFINER event-trigger function. It never needs to be callable through the
-- public Data API; revoke the default PUBLIC/anon/authenticated execution grants
-- whenever this helper exists in an FTN project.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
