-- Supabase's existing default function privileges grant EXECUTE to anon and
-- authenticated when a public function is created. Remove those inherited
-- explicit ACL entries from the caller-rights wrappers, then add back only the
-- roles each public RPC is designed to serve.

revoke execute on function public.register_founder(text,text,text,text,uuid) from authenticated;

revoke execute on function public.ibis_memory_snapshot(text,integer) from anon;
revoke execute on function public.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) from anon;
revoke execute on function public.ibis_memory_archive(text) from anon;
revoke execute on function public.mayor_dashboard_summary(timestamptz,timestamptz,text) from anon;
revoke execute on function public.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) from anon;
revoke execute on function public.mayor_map_data(timestamptz,timestamptz,text,text,text) from anon;
revoke execute on function public.mayor_operational_snapshot() from anon;
revoke execute on function public.mayor_record_archive(text,text) from anon;
revoke execute on function public.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) from anon;

notify pgrst,'reload schema';
