-- FTN Index outreach state guard.
-- `do-not-contact` is a human/business opt-out state only. Machine quality quarantine uses `failed`
-- so candidates can be rescored on a future Scout pass without overriding a real opt-out.

create or replace function public.ftn_index_guard_outreach_state()
returns trigger language plpgsql set search_path=public as $$
declare v_quality text;
begin
  if coalesce(old.do_not_contact,false) or new.do_not_contact then
    new.do_not_contact:=true;
    new.status:='do-not-contact';
    return new;
  end if;
  if new.status in ('claimed','invited','clicked') then return new; end if;
  select quality_status into v_quality
    from public.ftn_index_scout_observations
    where entity_id=new.entity_id and observation_type='business-discovered'
    order by created_at desc limit 1;
  new.quality_status:=coalesce(v_quality,new.quality_status,'review');
  new.status:=case when new.quality_status='pass' then 'blocked-transport' else 'failed' end;
  return new;
end;
$$;

drop trigger if exists ftn_index_outreach_state_guard on public.ftn_index_outreach_queue;
create trigger ftn_index_outreach_state_guard
before insert or update on public.ftn_index_outreach_queue
for each row execute function public.ftn_index_guard_outreach_state();

-- Existing v1 machine-quarantined rows were never sent and were not user opt-outs.
update public.ftn_index_outreach_queue
set status='failed',updated_at=now()
where status='do-not-contact' and do_not_contact=false;

revoke all on function public.ftn_index_guard_outreach_state() from public,anon,authenticated;
