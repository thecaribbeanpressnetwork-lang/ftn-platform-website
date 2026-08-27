-- Explicit, structured institutional memory for ibis-ai and Nexus.
-- This ledger does NOT ingest or retain raw conversations automatically.

create table if not exists private.ibis_institutional_memory (
  id uuid primary key default gen_random_uuid(), memory_key text not null unique, memory_type text not null,
  product_id text, title text not null, content text not null, source_url text, reference_date date,
  retrieved_at timestamptz, confidence text not null default 'NOT_ASSESSED', status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb, created_by uuid not null, created_at timestamptz not null default now(),
  updated_by uuid not null, updated_at timestamptz not null default now(),
  constraint ibis_memory_type_check check (memory_type in ('fact','decision','assumption','source','calculation','recommendation','conflict','unknown')),
  constraint ibis_memory_confidence_check check (confidence in ('HIGH','MEDIUM','LOW','NOT_ASSESSED')),
  constraint ibis_memory_status_check check (status in ('active','superseded','archived','needs_review')),
  constraint ibis_memory_source_url_check check (source_url is null or source_url ~ '^https://'),
  constraint ibis_memory_content_length check (char_length(content) between 1 and 12000)
);
create index if not exists ibis_memory_product_type_idx on private.ibis_institutional_memory(product_id,memory_type,status,updated_at desc);
create table if not exists private.ibis_institutional_memory_audit (
  id bigint generated always as identity primary key, memory_id uuid, memory_key text not null, action text not null,
  actor_id uuid not null, before_state jsonb, after_state jsonb, created_at timestamptz not null default now(),
  constraint ibis_memory_audit_action_check check (action in ('create','update','archive'))
);
create index if not exists ibis_memory_audit_created_idx on private.ibis_institutional_memory_audit(created_at desc);
revoke all on private.ibis_institutional_memory from public,anon,authenticated;
revoke all on private.ibis_institutional_memory_audit from public,anon,authenticated;

create or replace function private.is_active_ftn_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ftn_operator_roles r where r.user_id=(select auth.uid()) and r.role='owner' and r.revoked_at is null);
$$;
revoke all on function private.is_active_ftn_owner() from public,anon,authenticated;

create or replace function public.ibis_memory_snapshot(p_product_id text default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_limit integer:=least(greatest(coalesce(p_limit,100),1),500); v_items jsonb; v_counts jsonb;
begin
 if (select auth.uid()) is null or not private.is_active_ftn_owner() then raise exception 'FTN owner access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('memory_key',m.memory_key,'memory_type',m.memory_type,'product_id',m.product_id,'title',m.title,'content',m.content,'source_url',m.source_url,'reference_date',m.reference_date,'retrieved_at',m.retrieved_at,'confidence',m.confidence,'status',m.status,'metadata',m.metadata,'created_at',m.created_at,'updated_at',m.updated_at) order by m.updated_at desc),'[]'::jsonb) into v_items from (select * from private.ibis_institutional_memory where (p_product_id is null or product_id=p_product_id) order by updated_at desc limit v_limit)m;
 select coalesce(jsonb_object_agg(x.memory_type,x.n),'{}'::jsonb) into v_counts from (select memory_type,count(*)::bigint n from private.ibis_institutional_memory where status='active' and (p_product_id is null or product_id=p_product_id) group by memory_type)x;
 return jsonb_build_object('items',v_items,'counts',v_counts,'product_id',p_product_id,'retrieved_at',now(),'policy','Explicit structured founder-controlled memory only; raw conversations are not stored by this ledger.');
end $$;

create or replace function public.ibis_memory_upsert(p_memory_key text,p_memory_type text,p_title text,p_content text,p_product_id text default null,p_source_url text default null,p_reference_date date default null,p_retrieved_at timestamptz default null,p_confidence text default 'NOT_ASSESSED',p_status text default 'active',p_metadata jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=(select auth.uid()); v_before private.ibis_institutional_memory%rowtype; v_after private.ibis_institutional_memory%rowtype; v_action text;
begin
 if v_actor is null or not private.is_active_ftn_owner() then raise exception 'FTN owner access required' using errcode='42501'; end if;
 if nullif(btrim(p_memory_key),'') is null or nullif(btrim(p_title),'') is null or nullif(btrim(p_content),'') is null then raise exception 'Memory key, title and content are required'; end if;
 if p_memory_type not in ('fact','decision','assumption','source','calculation','recommendation','conflict','unknown') then raise exception 'Unsupported memory type'; end if;
 if p_confidence not in ('HIGH','MEDIUM','LOW','NOT_ASSESSED') then raise exception 'Unsupported confidence'; end if;
 if p_status not in ('active','superseded','archived','needs_review') then raise exception 'Unsupported status'; end if;
 if p_source_url is not null and p_source_url !~ '^https://' then raise exception 'Source URL must use HTTPS'; end if;
 if char_length(p_content)>12000 then raise exception 'Memory content too long'; end if;
 select * into v_before from private.ibis_institutional_memory where memory_key=btrim(p_memory_key);
 insert into private.ibis_institutional_memory(memory_key,memory_type,product_id,title,content,source_url,reference_date,retrieved_at,confidence,status,metadata,created_by,updated_by)
 values(btrim(p_memory_key),p_memory_type,nullif(btrim(p_product_id),''),btrim(p_title),btrim(p_content),nullif(btrim(p_source_url),''),p_reference_date,p_retrieved_at,p_confidence,p_status,coalesce(p_metadata,'{}'::jsonb),v_actor,v_actor)
 on conflict(memory_key) do update set memory_type=excluded.memory_type,product_id=excluded.product_id,title=excluded.title,content=excluded.content,source_url=excluded.source_url,reference_date=excluded.reference_date,retrieved_at=excluded.retrieved_at,confidence=excluded.confidence,status=excluded.status,metadata=excluded.metadata,updated_by=v_actor,updated_at=now() returning * into v_after;
 v_action:=case when v_before.id is null then 'create' else 'update' end;
 insert into private.ibis_institutional_memory_audit(memory_id,memory_key,action,actor_id,before_state,after_state) values(v_after.id,v_after.memory_key,v_action,v_actor,case when v_before.id is null then null else to_jsonb(v_before) end,to_jsonb(v_after));
 return jsonb_build_object('ok',true,'action',v_action,'memory_key',v_after.memory_key,'updated_at',v_after.updated_at);
end $$;

create or replace function public.ibis_memory_archive(p_memory_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=(select auth.uid()); v_before private.ibis_institutional_memory%rowtype; v_after private.ibis_institutional_memory%rowtype;
begin
 if v_actor is null or not private.is_active_ftn_owner() then raise exception 'FTN owner access required' using errcode='42501'; end if;
 select * into v_before from private.ibis_institutional_memory where memory_key=p_memory_key; if v_before.id is null then raise exception 'Memory record not found'; end if;
 update private.ibis_institutional_memory set status='archived',updated_by=v_actor,updated_at=now() where id=v_before.id returning * into v_after;
 insert into private.ibis_institutional_memory_audit(memory_id,memory_key,action,actor_id,before_state,after_state) values(v_after.id,v_after.memory_key,'archive',v_actor,to_jsonb(v_before),to_jsonb(v_after));
 return jsonb_build_object('ok',true,'memory_key',v_after.memory_key,'status','archived');
end $$;
revoke all on function public.ibis_memory_snapshot(text,integer) from public,anon;
revoke all on function public.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) from public,anon;
revoke all on function public.ibis_memory_archive(text) from public,anon;
grant execute on function public.ibis_memory_snapshot(text,integer) to authenticated;
grant execute on function public.ibis_memory_upsert(text,text,text,text,text,text,date,timestamptz,text,text,jsonb) to authenticated;
grant execute on function public.ibis_memory_archive(text) to authenticated;
