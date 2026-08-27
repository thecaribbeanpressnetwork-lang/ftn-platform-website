-- Shared, auditable operational storage for FTN Mayor Mode.
-- The private tables are never exposed directly; authenticated users must pass
-- the active Mayor access gate and use narrowly scoped RPCs.

alter table private.mayor_access add column if not exists access_level text;
update private.mayor_access set access_level = 'admin' where access_level is null;
alter table private.mayor_access alter column access_level set default 'viewer';
alter table private.mayor_access alter column access_level set not null;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname='mayor_access_level_check' and conrelid='private.mayor_access'::regclass
  ) then
    alter table private.mayor_access add constraint mayor_access_level_check check (access_level in ('viewer','editor','admin'));
  end if;
end $$;

create table if not exists private.mayor_records (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null,
  record_type text not null,
  record_key text not null,
  title text not null,
  status text not null default 'active',
  community text,
  department text,
  amount numeric,
  currency text,
  due_at timestamptz,
  source_url text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint mayor_records_type_check check (record_type in ('department','personnel','budget','project','opportunity','delegation','signal_session','forecast','source','council_kpi')),
  constraint mayor_records_status_check check (status in ('draft','active','pending','approved','blocked','completed','archived')),
  constraint mayor_records_currency_check check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint mayor_records_source_url_check check (source_url is null or source_url ~ '^https://')
);
create unique index if not exists mayor_records_scope_key_uidx on private.mayor_records(jurisdiction,record_type,record_key);
create index if not exists mayor_records_scope_type_idx on private.mayor_records(jurisdiction,record_type,status,updated_at desc);

create table if not exists private.mayor_record_audit (
  id bigint generated always as identity primary key,
  jurisdiction text not null,
  record_id uuid,
  action text not null,
  actor_id uuid,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now(),
  constraint mayor_record_audit_action_check check (action in ('create','update','archive'))
);
create index if not exists mayor_record_audit_scope_idx on private.mayor_record_audit(jurisdiction,created_at desc);

revoke all on private.mayor_records from public, anon, authenticated;
revoke all on private.mayor_record_audit from public, anon, authenticated;

create or replace function private.current_mayor_access()
returns table(jurisdiction text, access_level text)
language sql stable security definer set search_path=''
as $$
  select m.jurisdiction,m.access_level
  from private.mayor_access m
  where m.user_id=(select auth.uid()) and m.active
  order by m.provisioned_at desc limit 1;
$$;
revoke all on function private.current_mayor_access() from public, anon, authenticated;

create or replace function public.mayor_operational_snapshot()
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare v_jurisdiction text; v_access text; v_records jsonb; v_counts jsonb; v_audit jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Mayor access required' using errcode='42501'; end if;
  select a.jurisdiction,a.access_level into v_jurisdiction,v_access from private.current_mayor_access() a;
  if v_jurisdiction is null then raise exception 'Mayor access required' using errcode='42501'; end if;
  select coalesce(jsonb_object_agg(s.record_type,s.items),'{}'::jsonb) into v_records from (
    select r.record_type,jsonb_agg(jsonb_build_object('id',r.id,'record_key',r.record_key,'title',r.title,'status',r.status,'community',r.community,'department',r.department,'amount',r.amount,'currency',r.currency,'due_at',r.due_at,'source_url',r.source_url,'payload',r.payload,'created_at',r.created_at,'updated_at',r.updated_at) order by r.updated_at desc) items
    from private.mayor_records r where r.jurisdiction=v_jurisdiction and r.status<>'archived' group by r.record_type
  ) s;
  select coalesce(jsonb_object_agg(c.record_type,c.n),'{}'::jsonb) into v_counts from (
    select r.record_type,count(*)::bigint n from private.mayor_records r where r.jurisdiction=v_jurisdiction and r.status<>'archived' group by r.record_type
  ) c;
  select coalesce(jsonb_agg(jsonb_build_object('record_id',a.record_id,'action',a.action,'created_at',a.created_at) order by a.created_at desc),'[]'::jsonb) into v_audit from (
    select * from private.mayor_record_audit where jurisdiction=v_jurisdiction order by created_at desc limit 50
  ) a;
  return jsonb_build_object('jurisdiction',v_jurisdiction,'access_level',v_access,'records',coalesce(v_records,'{}'::jsonb),'counts',coalesce(v_counts,'{}'::jsonb),'recent_audit',coalesce(v_audit,'[]'::jsonb),'retrieved_at',now());
end $$;

create or replace function public.mayor_record_upsert(
  p_record_type text,p_record_key text,p_title text,p_status text default 'active',p_community text default null,p_department text default null,p_amount numeric default null,p_currency text default null,p_due_at timestamptz default null,p_source_url text default null,p_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_jurisdiction text; v_access text; v_actor uuid := (select auth.uid());
  v_before private.mayor_records%rowtype; v_after private.mayor_records%rowtype; v_action text;
begin
  if v_actor is null then raise exception 'Mayor access required' using errcode='42501'; end if;
  select a.jurisdiction,a.access_level into v_jurisdiction,v_access from private.current_mayor_access() a;
  if v_jurisdiction is null or v_access not in ('editor','admin') then raise exception 'Mayor editor access required' using errcode='42501'; end if;
  if p_record_type not in ('department','personnel','budget','project','opportunity','delegation','signal_session','forecast','source','council_kpi') then raise exception 'Unsupported Mayor record type'; end if;
  if nullif(btrim(p_record_key),'') is null or nullif(btrim(p_title),'') is null then raise exception 'Record key and title are required'; end if;
  if p_status not in ('draft','active','pending','approved','blocked','completed','archived') then raise exception 'Unsupported Mayor record status'; end if;
  if p_currency is not null and p_currency !~ '^[A-Z]{3}$' then raise exception 'Currency must be a three-letter code'; end if;
  if p_source_url is not null and p_source_url !~ '^https://' then raise exception 'Source URL must use HTTPS'; end if;
  select * into v_before from private.mayor_records r where r.jurisdiction=v_jurisdiction and r.record_type=p_record_type and r.record_key=btrim(p_record_key);
  insert into private.mayor_records(jurisdiction,record_type,record_key,title,status,community,department,amount,currency,due_at,source_url,payload,created_by,updated_by)
  values(v_jurisdiction,p_record_type,btrim(p_record_key),btrim(p_title),p_status,nullif(btrim(p_community),''),nullif(btrim(p_department),''),p_amount,upper(nullif(btrim(p_currency),'')),p_due_at,nullif(btrim(p_source_url),''),coalesce(p_payload,'{}'::jsonb),v_actor,v_actor)
  on conflict(jurisdiction,record_type,record_key) do update set title=excluded.title,status=excluded.status,community=excluded.community,department=excluded.department,amount=excluded.amount,currency=excluded.currency,due_at=excluded.due_at,source_url=excluded.source_url,payload=excluded.payload,updated_by=v_actor,updated_at=now()
  returning * into v_after;
  v_action:=case when v_before.id is null then 'create' else 'update' end;
  insert into private.mayor_record_audit(jurisdiction,record_id,action,actor_id,before_state,after_state) values(v_jurisdiction,v_after.id,v_action,v_actor,case when v_before.id is null then null else to_jsonb(v_before) end,to_jsonb(v_after));
  return jsonb_build_object('ok',true,'action',v_action,'record',jsonb_build_object('id',v_after.id,'record_type',v_after.record_type,'record_key',v_after.record_key,'title',v_after.title,'status',v_after.status,'updated_at',v_after.updated_at));
end $$;

create or replace function public.mayor_record_archive(p_record_type text,p_record_key text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_jurisdiction text; v_access text; v_actor uuid := (select auth.uid());
  v_before private.mayor_records%rowtype; v_after private.mayor_records%rowtype;
begin
  if v_actor is null then raise exception 'Mayor access required' using errcode='42501'; end if;
  select a.jurisdiction,a.access_level into v_jurisdiction,v_access from private.current_mayor_access() a;
  if v_jurisdiction is null or v_access not in ('editor','admin') then raise exception 'Mayor editor access required' using errcode='42501'; end if;
  select * into v_before from private.mayor_records r where r.jurisdiction=v_jurisdiction and r.record_type=p_record_type and r.record_key=p_record_key;
  if v_before.id is null then raise exception 'Mayor record not found'; end if;
  update private.mayor_records set status='archived',updated_by=v_actor,updated_at=now() where id=v_before.id returning * into v_after;
  insert into private.mayor_record_audit(jurisdiction,record_id,action,actor_id,before_state,after_state) values(v_jurisdiction,v_after.id,'archive',v_actor,to_jsonb(v_before),to_jsonb(v_after));
  return jsonb_build_object('ok',true,'record_id',v_after.id,'status','archived');
end $$;

revoke all on function public.mayor_operational_snapshot() from public, anon;
revoke all on function public.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) from public, anon;
revoke all on function public.mayor_record_archive(text,text) from public, anon;
grant execute on function public.mayor_operational_snapshot() to authenticated;
grant execute on function public.mayor_record_upsert(text,text,text,text,text,text,numeric,text,timestamptz,text,jsonb) to authenticated;
grant execute on function public.mayor_record_archive(text,text) to authenticated;
