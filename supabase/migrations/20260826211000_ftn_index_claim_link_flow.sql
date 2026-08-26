-- FTN Index v1 claim-link flow.
-- A cryptographically-random emailed bearer token can preview and confirm the invited entity
-- without forcing a second email-verification step. The raw token is never stored server-side.

alter table public.ftn_index_claims alter column user_id drop not null;
alter table public.ftn_index_claims drop constraint if exists ftn_index_claims_entity_id_user_id_key;
create unique index if not exists ftn_index_claims_user_unique
  on public.ftn_index_claims(entity_id, user_id)
  where user_id is not null;
create unique index if not exists ftn_index_claims_invitation_unique
  on public.ftn_index_claims(invitation_id)
  where invitation_id is not null;

create or replace function public.ftn_index_claim_preview(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.ftn_index_claim_invitations%rowtype;
  v_entity public.ftn_index_entities%rowtype;
  v_fields jsonb;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 then
    return jsonb_build_object('ok', false, 'error', 'invalid_invitation');
  end if;

  select * into v_invite
  from public.ftn_index_claim_invitations
  where token_hash = p_token_hash
    and revoked_at is null
    and redeemed_at is null
    and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invitation_unavailable');
  end if;

  select * into v_entity from public.ftn_index_entities where id = v_invite.entity_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'entity_unavailable');
  end if;

  select coalesce(jsonb_object_agg(field_key, value_json), '{}'::jsonb)
  into v_fields
  from public.ftn_index_fields
  where entity_id = v_entity.id
    and visibility = 'public'
    and superseded_at is null;

  if not exists (
    select 1 from public.ftn_index_verification_events
    where entity_id=v_entity.id and event_type='invitation-clicked'
      and metadata->>'invitation_id'=v_invite.id::text
  ) then
    insert into public.ftn_index_verification_events(entity_id,event_type,metadata)
    values(v_entity.id,'invitation-clicked',jsonb_build_object('invitation_id',v_invite.id::text));
  end if;

  return jsonb_build_object(
    'ok', true,
    'entity', jsonb_build_object(
      'ftn_id', v_entity.ftn_id,
      'slug', v_entity.slug,
      'entity_type', v_entity.entity_type,
      'display_name', v_entity.display_name,
      'territory_code', v_entity.territory_code,
      'category', v_entity.category,
      'subcategory', v_entity.subcategory,
      'claimed', v_entity.claimed,
      'last_confirmed_at', v_entity.last_entity_confirmed_at
    ),
    'fields', v_fields,
    'expires_at', v_invite.expires_at
  );
end;
$$;

create or replace function public.ftn_index_confirm_invitation(p_token_hash text, p_fields jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.ftn_index_claim_invitations%rowtype;
  v_entity public.ftn_index_entities%rowtype;
  v_claim_id uuid;
  v_key text;
  v_value jsonb;
  v_existing public.ftn_index_fields%rowtype;
  v_count integer := 0;
  v_changed integer := 0;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 or p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid_submission');
  end if;

  select * into v_invite
  from public.ftn_index_claim_invitations
  where token_hash=p_token_hash and revoked_at is null and redeemed_at is null and expires_at>now()
  for update;
  if not found then return jsonb_build_object('ok',false,'error','invitation_unavailable'); end if;

  select * into v_entity from public.ftn_index_entities where id=v_invite.entity_id for update;
  if not found then return jsonb_build_object('ok',false,'error','entity_unavailable'); end if;

  select count(*) into v_count from jsonb_each(p_fields);
  if v_count > 30 then return jsonb_build_object('ok',false,'error','too_many_fields'); end if;

  insert into public.ftn_index_claims(entity_id,user_id,invitation_id,status,claim_method,last_confirmed_at)
  values(v_entity.id,null,v_invite.id,'active','invitation-link',now())
  returning id into v_claim_id;

  for v_key, v_value in select key, value from jsonb_each(p_fields)
  loop
    if v_key !~ '^[a-z][a-zA-Z0-9_]{0,63}$' then
      raise exception 'Invalid FTN Index field key';
    end if;
    if length(v_value::text) > 4000 then
      raise exception 'FTN Index field value too large';
    end if;

    select * into v_existing
    from public.ftn_index_fields
    where entity_id=v_entity.id and field_key=v_key and superseded_at is null
    for update;

    if found then
      if v_existing.value_json is distinct from v_value then
        update public.ftn_index_fields set superseded_at=now() where id=v_existing.id;
        insert into public.ftn_index_fields(entity_id,field_key,value_json,visibility,provenance_type,last_confirmed_at,next_confirmation_at,volatility_class)
        values(v_entity.id,v_key,v_value,'public','business-confirmed',now(),now()+interval '90 days',v_existing.volatility_class);
        insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,field_key,metadata)
        values(v_entity.id,v_claim_id,'field-corrected',v_key,jsonb_build_object('previous_field_id',v_existing.id::text));
        v_changed := v_changed + 1;
      else
        update public.ftn_index_fields
        set provenance_type='business-confirmed',last_confirmed_at=now(),next_confirmation_at=now()+interval '90 days'
        where id=v_existing.id;
        insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,field_key)
        values(v_entity.id,v_claim_id,'field-confirmed',v_key);
      end if;
    else
      insert into public.ftn_index_fields(entity_id,field_key,value_json,visibility,provenance_type,last_confirmed_at,next_confirmation_at)
      values(v_entity.id,v_key,v_value,'public','business-confirmed',now(),now()+interval '90 days');
      insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,field_key)
      values(v_entity.id,v_claim_id,'field-added',v_key);
      v_changed := v_changed + 1;
    end if;
  end loop;

  update public.ftn_index_entities
  set claimed=true,
      claimed_at=coalesce(claimed_at,now()),
      public_status='current',
      last_entity_confirmed_at=now(),
      next_entity_confirmation_at=now()+make_interval(days=>verification_window_days),
      updated_at=now()
  where id=v_entity.id;

  update public.ftn_index_claim_invitations set redeemed_at=now() where id=v_invite.id;
  insert into public.ftn_index_verification_events(entity_id,claim_id,event_type,metadata)
  values(v_entity.id,v_claim_id,'entity-confirmed',jsonb_build_object('fields_reviewed',v_count,'fields_changed_or_added',v_changed));

  return jsonb_build_object('ok',true,'ftn_id',v_entity.ftn_id,'slug',v_entity.slug,'verification_freshness',100,'fields_reviewed',v_count,'fields_changed_or_added',v_changed);
end;
$$;

revoke all on function public.ftn_index_claim_preview(text) from public, anon, authenticated;
revoke all on function public.ftn_index_confirm_invitation(text,jsonb) from public, anon, authenticated;
grant execute on function public.ftn_index_claim_preview(text) to service_role;
grant execute on function public.ftn_index_confirm_invitation(text,jsonb) to service_role;

comment on function public.ftn_index_confirm_invitation(text,jsonb) is 'Redeems a valid FTN Index email invitation and records business confirmation. Confirmation is freshness/provenance, not endorsement.';
