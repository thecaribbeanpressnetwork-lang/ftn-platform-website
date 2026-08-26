-- FTN Index Scout bulk ingestion.
-- One service-role RPC replaces hundreds of Edge->Postgres round trips per Scout run.
-- Discovery candidates remain internal/provisional; confirmed entities are never downgraded.

create or replace function public.ftn_index_ingest_scout_candidates(
  p_run_key text,
  p_territory_code text,
  p_vertical text,
  p_source_key text,
  p_candidates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  c jsonb;
  v_entity_id uuid;
  v_entity_status text;
  v_source_id uuid;
  v_field_id uuid;
  v_field_key text;
  v_field_value jsonb;
  v_existing public.ftn_index_fields%rowtype;
  v_discovered integer:=0;
  v_contactable integer:=0;
  v_email_field_id uuid;
begin
  if jsonb_typeof(p_candidates)<>'array' then
    return jsonb_build_object('ok',false,'error','candidates_must_be_array');
  end if;
  if jsonb_array_length(p_candidates)>300 then
    return jsonb_build_object('ok',false,'error','candidate_limit_exceeded');
  end if;

  insert into public.ftn_index_scout_runs(run_key,territory_code,vertical,source_key,status,started_at,error_code)
  values(p_run_key,p_territory_code,p_vertical,p_source_key,'started',now(),null)
  on conflict(run_key) do update set status='started',started_at=now(),completed_at=null,error_code=null;

  for c in select value from jsonb_array_elements(p_candidates)
  loop
    if nullif(trim(c->>'ftn_id'),'') is null or nullif(trim(c->>'name'),'') is null then continue; end if;

    insert into public.ftn_index_entities(ftn_id,entity_type,slug,display_name,territory_code,category,subcategory,public_status,updated_at)
    values(c->>'ftn_id','business',c->>'slug',c->>'name',p_territory_code,p_vertical,nullif(c->>'subcategory',''),'provisional',now())
    on conflict(ftn_id) do update set
      slug=case when public.ftn_index_entities.public_status='provisional' then excluded.slug else public.ftn_index_entities.slug end,
      display_name=case when public.ftn_index_entities.public_status='provisional' then excluded.display_name else public.ftn_index_entities.display_name end,
      category=case when public.ftn_index_entities.public_status='provisional' then excluded.category else public.ftn_index_entities.category end,
      subcategory=case when public.ftn_index_entities.public_status='provisional' then excluded.subcategory else public.ftn_index_entities.subcategory end,
      updated_at=now()
    returning id,public_status into v_entity_id,v_entity_status;

    select id into v_source_id from public.ftn_index_sources
    where entity_id=v_entity_id and content_hash=c->>'source_hash' limit 1;
    if v_source_id is null then
      insert into public.ftn_index_sources(entity_id,source_type,source_url,source_label,content_hash,observed_at,last_checked_at)
      values(v_entity_id,'directory',c->>'source_url','OpenStreetMap / Overpass — discovery candidate only',c->>'source_hash',now(),now())
      returning id into v_source_id;
    else
      update public.ftn_index_sources set last_checked_at=now() where id=v_source_id;
    end if;

    if not exists(
      select 1 from public.ftn_index_scout_observations
      where entity_id=v_entity_id and candidate_url=c->>'source_url' and observation_type='business-discovered'
    ) then
      insert into public.ftn_index_scout_observations(entity_id,territory_code,vertical,observation_type,candidate_url,candidate_value,source_label,review_status)
      values(v_entity_id,p_territory_code,p_vertical,'business-discovered',c->>'source_url',jsonb_build_object('source_object',c->>'source_object','subcategory',c->>'subcategory'),'OpenStreetMap / Overpass','candidate');
    end if;

    v_email_field_id:=null;
    if jsonb_typeof(c->'fields')='object' then
      for v_field_key,v_field_value in select key,value from jsonb_each(c->'fields')
      loop
        if v_field_key !~ '^[a-z][a-zA-Z0-9_]{0,63}$' then continue; end if;
        select * into v_existing from public.ftn_index_fields
        where entity_id=v_entity_id and field_key=v_field_key and superseded_at is null
        limit 1;

        if found then
          if v_existing.provenance_type='discovered' then
            update public.ftn_index_fields
            set value_json=v_field_value,visibility='internal',source_id=v_source_id,effective_from=now()
            where id=v_existing.id;
          end if;
          v_field_id:=v_existing.id;
        else
          insert into public.ftn_index_fields(entity_id,field_key,value_json,visibility,provenance_type,source_id)
          values(v_entity_id,v_field_key,v_field_value,'internal','discovered',v_source_id)
          returning id into v_field_id;
        end if;
        if v_field_key='email' and nullif(trim(v_field_value #>> '{}'),'') is not null then v_email_field_id:=v_field_id; end if;
      end loop;
    end if;

    if v_email_field_id is not null then
      insert into public.ftn_index_outreach_queue(entity_id,public_contact_field_id,territory_code,vertical,status,transport_key,updated_at)
      values(v_entity_id,v_email_field_id,p_territory_code,p_vertical,'blocked-transport','unconfigured',now())
      on conflict(entity_id,public_contact_field_id) do update set
        status=case when public.ftn_index_outreach_queue.status in ('claimed','do-not-contact','invited','clicked') then public.ftn_index_outreach_queue.status else 'blocked-transport' end,
        updated_at=now();
      v_contactable:=v_contactable+1;
    end if;
    v_discovered:=v_discovered+1;
  end loop;

  update public.ftn_index_scout_runs
  set status='completed',discovered_count=v_discovered,contactable_count=v_contactable,completed_at=now(),error_code=null
  where run_key=p_run_key;

  return jsonb_build_object('ok',true,'run_key',p_run_key,'discovered',v_discovered,'contactable',v_contactable);
exception when others then
  update public.ftn_index_scout_runs set status='failed',completed_at=now(),error_code=left(sqlstate||':'||sqlerrm,120) where run_key=p_run_key;
  raise;
end;
$$;

revoke all on function public.ftn_index_ingest_scout_candidates(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.ftn_index_ingest_scout_candidates(text,text,text,text,jsonb) to service_role;
