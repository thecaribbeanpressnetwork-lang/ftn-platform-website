-- Keep the public RPC contract stable while moving privileged implementations
-- out of the exposed public schema. Public wrappers run as the caller; private
-- implementations retain their existing authorization checks and definer rights.

alter function public.issue_public_coordinates(uuid) set schema private;
alter function public.register_founder(text,text,text,text,uuid) set schema private;
alter function public.ibis_memory_snapshot(text,integer) set schema private;
alter function public.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) set schema private;
alter function public.ibis_memory_archive(text) set schema private;
alter function public.mayor_dashboard_summary(timestamptz,timestamptz,text) set schema private;
alter function public.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) set schema private;
alter function public.mayor_map_data(timestamptz,timestamptz,text,text,text) set schema private;
alter function public.mayor_operational_snapshot() set schema private;
alter function public.mayor_record_archive(text,text) set schema private;
alter function public.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) set schema private;

grant usage on schema private to anon, authenticated;

revoke all on function private.issue_public_coordinates(uuid) from public;
revoke all on function private.register_founder(text,text,text,text,uuid) from public;
grant execute on function private.issue_public_coordinates(uuid) to anon, authenticated;
grant execute on function private.register_founder(text,text,text,text,uuid) to anon, authenticated;

revoke all on function private.ibis_memory_snapshot(text,integer) from public;
revoke all on function private.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) from public;
revoke all on function private.ibis_memory_archive(text) from public;
revoke all on function private.mayor_dashboard_summary(timestamptz,timestamptz,text) from public;
revoke all on function private.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) from public;
revoke all on function private.mayor_map_data(timestamptz,timestamptz,text,text,text) from public;
revoke all on function private.mayor_operational_snapshot() from public;
revoke all on function private.mayor_record_archive(text,text) from public;
revoke all on function private.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) from public;
grant execute on function private.ibis_memory_snapshot(text,integer) to authenticated;
grant execute on function private.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) to authenticated;
grant execute on function private.ibis_memory_archive(text) to authenticated;
grant execute on function private.mayor_dashboard_summary(timestamptz,timestamptz,text) to authenticated;
grant execute on function private.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) to authenticated;
grant execute on function private.mayor_map_data(timestamptz,timestamptz,text,text,text) to authenticated;
grant execute on function private.mayor_operational_snapshot() to authenticated;
grant execute on function private.mayor_record_archive(text,text) to authenticated;
grant execute on function private.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) to authenticated;

create function public.issue_public_coordinates(p_issue_id uuid)
returns table(latitude double precision,longitude double precision)
language sql stable security invoker set search_path=''
as $$ select * from private.issue_public_coordinates(p_issue_id); $$;

create function public.register_founder(p_first_name text,p_community text,p_email text,p_phone text,p_registration_key uuid)
returns table(founder_number bigint,founder_count bigint,created_at timestamptz)
language sql security invoker set search_path=''
as $$ select * from private.register_founder(p_first_name,p_community,p_email,p_phone,p_registration_key); $$;

create function public.ibis_memory_snapshot(p_product_id text default null,p_limit integer default 100)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.ibis_memory_snapshot(p_product_id,p_limit); $$;

create function public.ibis_memory_upsert(
  p_memory_key text,p_memory_type text,p_title text,p_content text,
  p_product_id text default null,p_source_url text default null,
  p_reference_date date default null,p_retrieved_at timestamptz default null,
  p_confidence text default 'NOT_ASSESSED',p_status text default 'active',
  p_metadata jsonb default '{}'::jsonb
) returns jsonb language sql security invoker set search_path=''
as $$ select private.ibis_memory_upsert(p_memory_key,p_memory_type,p_title,p_content,p_product_id,p_source_url,p_reference_date,p_retrieved_at,p_confidence,p_status,p_metadata); $$;

create function public.ibis_memory_archive(p_memory_key text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.ibis_memory_archive(p_memory_key); $$;

create function public.mayor_dashboard_summary(
  p_from timestamptz default now()-interval '30 days',p_to timestamptz default now(),p_community text default null
) returns jsonb language sql stable security invoker set search_path=''
as $$ select private.mayor_dashboard_summary(p_from,p_to,p_community); $$;

create function public.mayor_dashboard_summary_v2(
  p_from timestamptz default now()-interval '30 days',p_to timestamptz default now(),p_community text default null,
  p_category text default null,p_status text default null
) returns jsonb language sql stable security invoker set search_path=''
as $$ select private.mayor_dashboard_summary_v2(p_from,p_to,p_community,p_category,p_status); $$;

create function public.mayor_map_data(
  p_from timestamptz default now()-interval '30 days',p_to timestamptz default now(),p_community text default null,
  p_category text default null,p_status text default null
) returns jsonb language sql stable security invoker set search_path=''
as $$ select private.mayor_map_data(p_from,p_to,p_community,p_category,p_status); $$;

create function public.mayor_operational_snapshot()
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.mayor_operational_snapshot(); $$;

create function public.mayor_record_archive(p_record_type text,p_record_key text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.mayor_record_archive(p_record_type,p_record_key); $$;

create function public.mayor_record_upsert(
  p_record_type text,p_record_key text,p_title text,p_status text default 'active',
  p_community text default null,p_department text default null,p_amount numeric default null,
  p_currency text default null,p_due_at timestamptz default null,p_source_url text default null,
  p_payload jsonb default '{}'::jsonb
) returns jsonb language sql security invoker set search_path=''
as $$ select private.mayor_record_upsert(p_record_type,p_record_key,p_title,p_status,p_community,p_department,p_amount,p_currency,p_due_at,p_source_url,p_payload); $$;

revoke all on function public.issue_public_coordinates(uuid) from public;
revoke all on function public.register_founder(text,text,text,text,uuid) from public;
grant execute on function public.issue_public_coordinates(uuid) to anon, authenticated;
grant execute on function public.register_founder(text,text,text,text,uuid) to anon;

revoke all on function public.ibis_memory_snapshot(text,integer) from public;
revoke all on function public.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) from public;
revoke all on function public.ibis_memory_archive(text) from public;
revoke all on function public.mayor_dashboard_summary(timestamptz,timestamptz,text) from public;
revoke all on function public.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) from public;
revoke all on function public.mayor_map_data(timestamptz,timestamptz,text,text,text) from public;
revoke all on function public.mayor_operational_snapshot() from public;
revoke all on function public.mayor_record_archive(text,text) from public;
revoke all on function public.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) from public;
grant execute on function public.ibis_memory_snapshot(text,integer) to authenticated;
grant execute on function public.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) to authenticated;
grant execute on function public.ibis_memory_archive(text) to authenticated;
grant execute on function public.mayor_dashboard_summary(timestamptz,timestamptz,text) to authenticated;
grant execute on function public.mayor_dashboard_summary_v2(timestamptz,timestamptz,text,text,text) to authenticated;
grant execute on function public.mayor_map_data(timestamptz,timestamptz,text,text,text) to authenticated;
grant execute on function public.mayor_operational_snapshot() to authenticated;
grant execute on function public.mayor_record_archive(text,text) to authenticated;
grant execute on function public.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) to authenticated;

notify pgrst,'reload schema';
