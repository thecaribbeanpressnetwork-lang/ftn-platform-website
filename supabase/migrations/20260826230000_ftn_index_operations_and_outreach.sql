-- FTN Index operational controls and outreach audit trail.
-- Sending is disabled by default. Human opt-outs remain immutable to autonomous Scout logic.

insert into public.ftn_index_internal_settings(setting_key,setting_value)
values
  ('scout_enabled','true'),
  ('outreach_enabled','false'),
  ('outreach_transport','resend'),
  ('pilot_max_batch','5'),
  ('outreach_internal_secret',encode(gen_random_bytes(32),'hex'))
on conflict(setting_key) do nothing;

alter table public.ftn_index_outreach_queue
  add column if not exists selected_for_pilot boolean not null default false,
  add column if not exists selected_at timestamptz,
  add column if not exists external_message_id text,
  add column if not exists last_error_code text;

create index if not exists ftn_index_outreach_pilot_idx
  on public.ftn_index_outreach_queue(selected_for_pilot,status,quality_status,quality_score desc,created_at);

create table if not exists public.ftn_index_outreach_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.ftn_index_entities(id) on delete cascade,
  outreach_queue_id uuid references public.ftn_index_outreach_queue(id) on delete set null,
  invitation_id uuid references public.ftn_index_claim_invitations(id) on delete set null,
  event_type text not null check (event_type in ('pilot-selected','pilot-cleared','send-attempted','sent','send-failed','recipient-optout')),
  provider text,
  external_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ftn_index_outreach_events_entity_idx on public.ftn_index_outreach_events(entity_id,created_at desc);
create index if not exists ftn_index_outreach_events_type_idx on public.ftn_index_outreach_events(event_type,created_at desc);
alter table public.ftn_index_outreach_events enable row level security;
revoke all on public.ftn_index_outreach_events from anon, authenticated;
create policy "ftn_index_outreach_events_server_only" on public.ftn_index_outreach_events
  for all to anon, authenticated using(false) with check(false);

-- Free transport envelope. Local usage is derived from successful FTN outreach events.
insert into public.ftn_cost_guard(service_key,service_label,plan_name,free_limit,usage_value,usage_unit,founder_approved_paid,hard_stop_at_free_limit,estimated_next_cost,currency)
values('ftn_index_email_transport','FTN Index outreach email transport','resend-free',3000,0,'messages/month',false,true,null,'USD')
on conflict(service_key) do update set
  service_label=excluded.service_label,
  plan_name=excluded.plan_name,
  free_limit=excluded.free_limit,
  usage_unit=excluded.usage_unit,
  founder_approved_paid=false,
  hard_stop_at_free_limit=true,
  estimated_next_cost=null,
  updated_at=now();

-- A recipient may opt out through possession of the same single-use invitation secret.
-- This does not claim or publish the business record.
create or replace function public.ftn_index_opt_out_invitation(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_invite public.ftn_index_claim_invitations%rowtype;
  v_queue public.ftn_index_outreach_queue%rowtype;
begin
  if p_token_hash is null or length(p_token_hash)<>64 then
    return jsonb_build_object('ok',false,'error','invalid_invitation');
  end if;
  select * into v_invite
  from public.ftn_index_claim_invitations
  where token_hash=p_token_hash and revoked_at is null
  limit 1;
  if not found then return jsonb_build_object('ok',false,'error','invitation_unavailable'); end if;

  select * into v_queue from public.ftn_index_outreach_queue
  where entity_id=v_invite.entity_id
  order by created_at desc limit 1 for update;
  if found then
    update public.ftn_index_outreach_queue
      set do_not_contact=true,status='do-not-contact',selected_for_pilot=false,selected_at=null,updated_at=now()
      where id=v_queue.id;
    insert into public.ftn_index_outreach_events(entity_id,outreach_queue_id,invitation_id,event_type,provider,external_message_id)
      values(v_invite.entity_id,v_queue.id,v_invite.id,'recipient-optout',v_queue.transport_key,v_queue.external_message_id);
  end if;
  update public.ftn_index_claim_invitations set revoked_at=coalesce(revoked_at,now()) where id=v_invite.id;
  return jsonb_build_object('ok',true,'opted_out',true);
end;
$$;
revoke all on function public.ftn_index_opt_out_invitation(text) from public,anon,authenticated;
grant execute on function public.ftn_index_opt_out_invitation(text) to service_role;
