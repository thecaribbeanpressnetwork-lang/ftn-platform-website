-- FTN Index v1 — Scout discovery/outreach queue and ownership-safe public boundary.
-- Third-party discovery data may be retained internally, but provisional/unconfirmed entities are
-- not exposed through the public Index until first-party confirmation or another approved source gate.

create table if not exists public.ftn_index_outreach_queue (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  public_contact_field_id uuid references public.ftn_index_fields(id) on delete set null,
  territory_code text not null,
  vertical text not null,
  status text not null default 'ready' check (status in ('ready','blocked-transport','invited','clicked','claimed','do-not-contact','failed')),
  transport_key text,
  last_attempt_at timestamptz,
  invited_at timestamptz,
  do_not_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_id, public_contact_field_id)
);
create index if not exists ftn_index_outreach_ready_idx on public.ftn_index_outreach_queue(status,territory_code,vertical,created_at);
alter table public.ftn_index_outreach_queue enable row level security;
revoke all on public.ftn_index_outreach_queue from anon, authenticated;

create table if not exists public.ftn_index_scout_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  territory_code text not null,
  vertical text not null,
  source_key text not null,
  status text not null default 'started' check (status in ('started','completed','failed','skipped-cost-guard')),
  discovered_count integer not null default 0,
  contactable_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_code text
);
alter table public.ftn_index_scout_runs enable row level security;
revoke all on public.ftn_index_scout_runs from anon, authenticated;

create table if not exists public.ftn_index_internal_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_at timestamptz not null default now()
);
alter table public.ftn_index_internal_settings enable row level security;
revoke all on public.ftn_index_internal_settings from anon, authenticated;
insert into public.ftn_index_internal_settings(setting_key,setting_value)
values('scout_cron_secret',encode(gen_random_bytes(32),'hex'))
on conflict(setting_key) do nothing;

-- Explicit deny policies document the intended server-only boundary and silence ambiguous
-- "RLS enabled/no policy" lint for these FTN Index control-plane tables.
create policy "ftn_index_invites_server_only" on public.ftn_index_claim_invitations for all to anon, authenticated using (false) with check (false);
create policy "ftn_index_events_server_only" on public.ftn_index_verification_events for all to anon, authenticated using (false) with check (false);
create policy "ftn_index_scout_server_only" on public.ftn_index_scout_observations for all to anon, authenticated using (false) with check (false);
create policy "ftn_index_cost_guard_server_only" on public.ftn_cost_guard for all to anon, authenticated using (false) with check (false);
create policy "ftn_index_outreach_server_only" on public.ftn_index_outreach_queue for all to anon, authenticated using (false) with check (false);
create policy "ftn_index_runs_server_only" on public.ftn_index_scout_runs for all to anon, authenticated using (false) with check (false);
create policy "ftn_index_settings_server_only" on public.ftn_index_internal_settings for all to anon, authenticated using (false) with check (false);

-- Public entity/source/field/relationship reads require a non-provisional parent entity.
drop policy if exists "ftn_index_public_entities_read" on public.ftn_index_entities;
create policy "ftn_index_public_entities_read" on public.ftn_index_entities for select to anon, authenticated
  using (public_status in ('claimed','current','stale','disputed'));

drop policy if exists "ftn_index_public_fields_read" on public.ftn_index_fields;
create policy "ftn_index_public_fields_read" on public.ftn_index_fields for select to anon, authenticated
  using (
    visibility='public' and superseded_at is null and exists (
      select 1 from public.ftn_index_entities e
      where e.id=ftn_index_fields.entity_id and e.public_status in ('claimed','current','stale','disputed')
    )
  );

drop policy if exists "ftn_index_public_sources_read" on public.ftn_index_sources;
create policy "ftn_index_public_sources_read" on public.ftn_index_sources for select to anon, authenticated
  using (exists (
    select 1 from public.ftn_index_entities e
    where e.id=ftn_index_sources.entity_id and e.public_status in ('claimed','current','stale','disputed')
  ));

drop policy if exists "ftn_index_public_relationships_read" on public.ftn_index_relationships;
create policy "ftn_index_public_relationships_read" on public.ftn_index_relationships for select to anon, authenticated
  using (
    exists (select 1 from public.ftn_index_entities e where e.id=ftn_index_relationships.from_entity_id and e.public_status in ('claimed','current','stale','disputed'))
    and exists (select 1 from public.ftn_index_entities e where e.id=ftn_index_relationships.to_entity_id and e.public_status in ('claimed','current','stale','disputed'))
  );

-- Preserve every existing view column in its prior order; append sources after updated_at.
create or replace view public.ftn_index_public_entities
with (security_invoker = true)
as
select
  e.ftn_id,e.slug,e.entity_type,e.display_name,e.legal_name,e.territory_code,e.category,e.subcategory,
  e.public_status,e.claimed,e.last_entity_confirmed_at,e.next_entity_confirmation_at,
  case
    when e.last_entity_confirmed_at is null then 0
    when now() <= coalesce(e.next_entity_confirmation_at,e.last_entity_confirmed_at+make_interval(days=>e.verification_window_days)) then 100
    when now() <= e.last_entity_confirmed_at+make_interval(days=>e.verification_window_days+30) then 90
    when now() <= e.last_entity_confirmed_at+make_interval(days=>e.verification_window_days+90) then 75
    when now() <= e.last_entity_confirmed_at+interval '365 days' then 50
    else 25
  end::integer as verification_freshness,
  coalesce((select jsonb_object_agg(f.field_key,f.value_json) from public.ftn_index_fields f where f.entity_id=e.id and f.visibility='public' and f.superseded_at is null),'{}'::jsonb) as fields,
  e.updated_at,
  coalesce((select jsonb_agg(jsonb_build_object('label',s.source_label,'type',s.source_type,'url',s.source_url,'observed_at',s.observed_at,'last_checked_at',s.last_checked_at) order by s.last_checked_at desc) from public.ftn_index_sources s where s.entity_id=e.id),'[]'::jsonb) as sources
from public.ftn_index_entities e
where e.public_status in ('claimed','current','stale','disputed');

grant select on public.ftn_index_public_entities to anon, authenticated;

-- Claim preview may show internal Scout-discovered candidate fields only to possession of the
-- cryptographic invitation through the server function. It is never a public REST view.
create or replace function public.ftn_index_claim_preview(p_token_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_invite public.ftn_index_claim_invitations%rowtype; v_entity public.ftn_index_entities%rowtype; v_fields jsonb;
begin
 if p_token_hash is null or length(p_token_hash)<>64 then return jsonb_build_object('ok',false,'error','invalid_invitation'); end if;
 select * into v_invite from public.ftn_index_claim_invitations where token_hash=p_token_hash and revoked_at is null and redeemed_at is null and expires_at>now() limit 1;
 if not found then return jsonb_build_object('ok',false,'error','invitation_unavailable'); end if;
 select * into v_entity from public.ftn_index_entities where id=v_invite.entity_id;
 if not found then return jsonb_build_object('ok',false,'error','entity_unavailable'); end if;
 select coalesce(jsonb_object_agg(field_key,value_json),'{}'::jsonb) into v_fields from public.ftn_index_fields where entity_id=v_entity.id and visibility in ('public','internal') and superseded_at is null;
 if not exists(select 1 from public.ftn_index_verification_events where entity_id=v_entity.id and event_type='invitation-clicked' and metadata->>'invitation_id'=v_invite.id::text) then
   insert into public.ftn_index_verification_events(entity_id,event_type,metadata) values(v_entity.id,'invitation-clicked',jsonb_build_object('invitation_id',v_invite.id::text));
 end if;
 update public.ftn_index_outreach_queue set status='clicked',updated_at=now() where entity_id=v_entity.id and status='invited';
 return jsonb_build_object('ok',true,'entity',jsonb_build_object('ftn_id',v_entity.ftn_id,'slug',v_entity.slug,'entity_type',v_entity.entity_type,'display_name',v_entity.display_name,'territory_code',v_entity.territory_code,'category',v_entity.category,'subcategory',v_entity.subcategory,'claimed',v_entity.claimed,'last_confirmed_at',v_entity.last_entity_confirmed_at),'fields',v_fields,'expires_at',v_invite.expires_at);
end; $$;
revoke all on function public.ftn_index_claim_preview(text) from public,anon,authenticated;
grant execute on function public.ftn_index_claim_preview(text) to service_role;

-- Ensure an unchanged Scout candidate becomes public first-party data when the invited business confirms it.
create or replace function public.ftn_index_confirm_invitation(p_token_hash text,p_fields jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_invite public.ftn_index_claim_invitations%rowtype; v_entity public.ftn_index_entities%rowtype; v_claim_id uuid; v_key text; v_value jsonb; v_existing public.ftn_index_fields%rowtype; v_count integer:=0; v_changed integer:=0;
begin
 if p_token_hash is null or length(p_token_hash)<>64 or p_fields is null or jsonb_typeof(p_fields)<>'object' then return jsonb_build_object('ok',false,'error','invalid_submission'); end if;
 select * into v_invite from public.ftn_index_claim_invitations where token_hash=p_token_hash and revoked_at is null and redeemed_at is null and expires_at>now() for update;
 if not found then return jsonb_build_object('ok',false,'error','invitation_unavailable'); end if;
 select * into v_entity from public.ftn_index_entities where id=v_invite.entity_id for update;
 if not found then return jsonb_build_object('ok',false,'error','entity_unavailable'); end if;
 select count(*) into v_count from jsonb_each(p_fields); if v_count>30 then return jsonb_build_object('ok',false,'error','too_many_fields'); end if;
 insert into public.ftn_index_claims(entity_id,user_id,invitation_id,status,claim_method,last_confirmed_at) values(v_entity.id,null,v_invite.id,'active','invitation-link',now()) returning id into v_claim_id;
 for v_key,v_value in select key,value from jsonb_each(p_fields) loop
  if v_key !~ '^[a-z][a-zA-Z0-9_]{0,63}$' then raise exception 'Invalid FTN Index field key'; end if;
  if length(v_value::text)>4000 then raise exception 'FTN Index field value too large'; end if;
  select * into v_existing from public.ftn_index_fields where entity_id=v_entity.id and field_key=v_key and superseded_at is null for update;
  if found then
   if v_existing.value_json is distinct from v_value then
    update public.ftn_index_fields set superseded_at=now() where id=v_existing.id;
    insert into public.ftn_index_fields(entity_id,field_key,value_json,visibility,provenance_type,last_confirmed_at,next_confirmation_at,volatility_class) values(v_entity.id,v_key,v_value,'public','business-confirmed',now(),now()+interval '90 days',v_existing.volatility_class);
    insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,field_key,metadata) values(v_entity.id,v_claim_id,'field-corrected',v_key,jsonb_build_object('previous_field_id',v_existing.id::text)); v_changed:=v_changed+1;
   else
    update public.ftn_index_fields set visibility='public',provenance_type='business-confirmed',last_confirmed_at=now(),next_confirmation_at=now()+interval '90 days' where id=v_existing.id;
    insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,field_key) values(v_entity.id,v_claim_id,'field-confirmed',v_key);
   end if;
  else
   insert into public.ftn_index_fields(entity_id,field_key,value_json,visibility,provenance_type,last_confirmed_at,next_confirmation_at) values(v_entity.id,v_key,v_value,'public','business-confirmed',now(),now()+interval '90 days');
   insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,field_key) values(v_entity.id,v_claim_id,'field-added',v_key); v_changed:=v_changed+1;
  end if;
 end loop;
 update public.ftn_index_entities set claimed=true,claimed_at=coalesce(claimed_at,now()),public_status='current',last_entity_confirmed_at=now(),next_entity_confirmation_at=now()+make_interval(days=>verification_window_days),updated_at=now() where id=v_entity.id;
 update public.ftn_index_claim_invitations set redeemed_at=now() where id=v_invite.id;
 update public.ftn_index_outreach_queue set status='claimed',updated_at=now() where entity_id=v_entity.id and status in ('invited','clicked');
 insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,metadata) values(v_entity.id,v_claim_id,'entity-confirmed',jsonb_build_object('fields_reviewed',v_count,'fields_changed_or_added',v_changed));
 return jsonb_build_object('ok',true,'ftn_id',v_entity.ftn_id,'slug',v_entity.slug,'verification_freshness',100,'fields_reviewed',v_count,'fields_changed_or_added',v_changed);
end; $$;
revoke all on function public.ftn_index_confirm_invitation(text,jsonb) from public,anon,authenticated;
grant execute on function public.ftn_index_confirm_invitation(text,jsonb) to service_role;

-- Register verified free-plan ceilings. usage_value is a local measurement field and is not
-- initialized as a claim about total platform-wide provider usage.
insert into public.ftn_cost_guard(service_key,service_label,plan_name,free_limit,usage_value,usage_unit,founder_approved_paid,hard_stop_at_free_limit,estimated_next_cost,currency)
values
 ('supabase_database','Supabase database size','free',500,0,'MB',false,true,25,'USD'),
 ('supabase_egress','Supabase egress','free',5,0,'GB/month',false,true,25,'USD'),
 ('supabase_storage','Supabase file storage','free',1,0,'GB',false,true,25,'USD'),
 ('supabase_edge_invocations','Supabase Edge Function invocations','free',500000,0,'invocations/month',false,true,25,'USD'),
 ('ftn_index_email_transport','FTN Index outreach email transport','unconfigured',0,0,'messages/month',false,true,null,'USD')
on conflict(service_key) do update set free_limit=excluded.free_limit,plan_name=excluded.plan_name,usage_unit=excluded.usage_unit,founder_approved_paid=false,hard_stop_at_free_limit=true,updated_at=now();
