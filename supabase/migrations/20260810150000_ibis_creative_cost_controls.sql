-- ibis Creative Studio: provider-neutral projects, verified integration evidence and fail-closed credits.
-- Candidate only. Validate on an isolated Supabase staging branch before any production application.

create table if not exists public.ftn_ai_providers (
  provider_id text primary key check (provider_id ~ '^[a-z0-9-]{2,80}$'),
  name text not null,
  categories text[] not null default '{}',
  website text not null,
  official_api_url text,
  official_affiliate_program_url text,
  affiliate_url text,
  api_status text not null check (api_status in ('VERIFIED','OPEN_MODEL','UNVERIFIED','UNAVAILABLE')),
  affiliate_status text not null check (affiliate_status in ('VERIFIED','APPLIED','UNVERIFIED','NOT_AVAILABLE','NOT_APPLICABLE')),
  integration_type text not null check (integration_type in ('NATIVE_API','AFFILIATE','SELF_HOSTED','PARTNER_REVIEW','RESEARCH_ONLY')),
  pricing_url text,
  commercial_use_status text not null,
  redistribution_status text not null,
  self_hostable boolean not null default false,
  pay_as_you_go boolean,
  prepaid_required boolean,
  customer_credit_cost integer check (customer_credit_cost is null or customer_credit_cost > 0),
  provider_cost_microusd bigint check (provider_cost_microusd is null or provider_cost_microusd >= 0),
  enabled boolean not null default false,
  generation_enabled boolean not null default false,
  notes text not null default '',
  last_verified date,
  updated_at timestamptz not null default now(),
  check (not generation_enabled or (enabled and customer_credit_cost is not null and provider_cost_microusd is not null))
);
alter table public.ftn_ai_providers enable row level security;
revoke all on public.ftn_ai_providers from anon, authenticated;

insert into public.ftn_ai_providers(provider_id,name,categories,website,official_api_url,official_affiliate_program_url,api_status,affiliate_status,integration_type,pricing_url,commercial_use_status,redistribution_status,self_hostable,pay_as_you_go,prepaid_required,enabled,generation_enabled,notes,last_verified)
values
  ('pixverse','PixVerse',array['image','video'],'https://pixverse.ai/en','https://docs.platform.pixverse.ai/','https://pixverse.ai/en/affiliate','VERIFIED','VERIFIED','NATIVE_API','https://docs.platform.pixverse.ai/pricing-796039m0','REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW','UNVERIFIED',false,false,true,false,false,'Official API and affiliate programme exist; no FTN affiliate ID or paid adapter is configured.','2026-08-10'),
  ('kling','Kling AI',array['image','video'],'https://app.klingai.com/global/','https://kling.ai/document-api/guides/get-started/overview','https://app.klingai.com/global/commission-share','VERIFIED','VERIFIED','NATIVE_API','https://kling.ai/dev/pricing','REQUIRES_CONTRACT_AND_OUTPUT_TERMS_REVIEW','UNVERIFIED',false,false,true,false,false,'Official API packages require pre-purchase; disabled for zero-upfront launch.','2026-08-10'),
  ('musicapi-producer','MusicAPI Producer · Lyria 3 Pro',array['instrumental'],'https://musicapi.ai/producer-ai-api','https://docs.musicapi.ai/','https://musicapi.ai/affiliates','VERIFIED','VERIFIED','NATIVE_API','https://musicapi.ai/lyria-3-pro-pricing','PROVIDER_STATES_COMMERCIAL_RIGHTS_INCLUDED_TERMS_REVIEW_REQUIRED','PROVIDER_STATES_CUSTOMER_DELIVERY_ALLOWED_TERMS_REVIEW_REQUIRED',false,false,true,false,false,'Official flat 12-credit API and 30% lifetime affiliate programme verified; no FTN credentials, affiliate ID, customer price or approved terms yet.','2026-08-10'),
  ('ace-step','ACE-Step',array['instrumental'],'https://github.com/ace-step/ACE-Step',null,null,'OPEN_MODEL','NOT_APPLICABLE','SELF_HOSTED','https://github.com/ace-step/ACE-Step/blob/main/LICENSE','APACHE_2_CODE_AND_MODEL_CANDIDATE_REVIEW_REQUIRED','ORIGINALITY_AND_MODEL_RELEASE_REVIEW_REQUIRED',true,false,false,false,false,'Self-host candidate after GPU cost, exact model version, safety, cultural-quality and release-rights testing.','2026-08-10'),
  ('stable-audio-3','Stable Audio 3',array['instrumental','sample'],'https://stability.ai/stable-audio','https://platform.stability.ai/',null,'OPEN_MODEL','NOT_APPLICABLE','SELF_HOSTED','https://stability.ai/license','CONDITIONAL_STABILITY_COMMUNITY_LICENSE','REQUIRES_LICENSE_REVIEW',true,false,false,false,false,'Open-weight/API candidate after exact model, revenue-threshold, GPU/API cost and output-rights review.','2026-08-10'),
  ('musicgen','MusicGen',array['instrumental'],'https://github.com/facebookresearch/audiocraft',null,null,'OPEN_MODEL','NOT_APPLICABLE','RESEARCH_ONLY',null,'NOT_APPROVED_FOR_FTN_CUSTOMER_OUTPUT','NOT_APPROVED',true,false,false,false,false,'Model weights are not approved for FTN commercial customer output.','2026-08-10'),
  ('producer-ai','Producer.ai',array['instrumental','production'],'https://producer.ai/',null,null,'UNVERIFIED','UNVERIFIED','PARTNER_REVIEW',null,'UNVERIFIED','UNVERIFIED',false,null,null,false,false,'Never automate a consumer login; require a documented permitted partner/API/referral path.','2026-08-10'),
  ('replicate-demucs','Replicate · Demucs',array['stems'],'https://replicate.com/','https://replicate.com/docs',null,'VERIFIED','NOT_APPLICABLE','NATIVE_API','https://replicate.com/pricing','REQUIRES_MODEL_AND_INPUT_RIGHTS_REVIEW','REQUIRES_OUTPUT_RETENTION_REVIEW',false,true,false,false,false,'Paid stem processing remains disabled until per-job cost, retention and customer-credit pricing are approved.','2026-08-10')
on conflict(provider_id) do update set
  official_api_url=excluded.official_api_url,
  official_affiliate_program_url=excluded.official_affiliate_program_url,
  api_status=excluded.api_status,
  affiliate_status=excluded.affiliate_status,
  pricing_url=excluded.pricing_url,
  notes=excluded.notes,
  last_verified=excluded.last_verified,
  updated_at=now();

create table if not exists public.ftn_ai_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 180),
  project_type text not null check (project_type in ('image','video','auto','instrumental','mix','master','stems')),
  status text not null default 'PLANNED' check (status in ('PLANNED','QUOTED','QUEUED','PROCESSING','READY','FAILED','CANCELLED')),
  brief jsonb not null default '{}'::jsonb,
  provider_id text references public.ftn_ai_providers(provider_id),
  provider_transfer_approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ftn_ai_projects enable row level security;
grant select, insert, update, delete on public.ftn_ai_projects to authenticated;
create policy "users read own ibis projects" on public.ftn_ai_projects for select to authenticated using (user_id=(select auth.uid()));
create policy "users create own ibis projects" on public.ftn_ai_projects for insert to authenticated with check (user_id=(select auth.uid()) and status='PLANNED' and provider_id is null and provider_transfer_approved_at is null);
create policy "users update own ibis projects" on public.ftn_ai_projects for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and status='PLANNED' and provider_id is null and provider_transfer_approved_at is null);
create policy "users delete own ibis projects" on public.ftn_ai_projects for delete to authenticated using (user_id=(select auth.uid()));

create table if not exists public.ftn_ai_credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_purchased integer not null default 0 check (lifetime_purchased >= 0),
  updated_at timestamptz not null default now()
);
alter table public.ftn_ai_credit_accounts enable row level security;
revoke all on public.ftn_ai_credit_accounts from anon, authenticated;

create table if not exists public.ftn_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.ftn_ai_projects(id) on delete set null,
  provider_id text not null references public.ftn_ai_providers(provider_id),
  capability text not null check (capability in ('generate_image','generate_video','generate_instrumental','separate_stems','mix_audio','master_audio')),
  client_request_id text not null check (length(client_request_id) between 8 and 160),
  input_hash text not null check (length(input_hash) between 16 and 160),
  status text not null default 'CREDITS_RESERVED' check (status in ('CREDITS_RESERVED','SUBMITTED','PROCESSING','SUCCEEDED','FAILED','REFUNDED','CANCELLED')),
  reserved_credits integer not null check (reserved_credits > 0),
  quoted_provider_cost_microusd bigint not null check (quoted_provider_cost_microusd >= 0),
  actual_provider_cost_microusd bigint check (actual_provider_cost_microusd is null or actual_provider_cost_microusd >= 0),
  provider_job_id text,
  output_manifest jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,client_request_id)
);
alter table public.ftn_ai_jobs enable row level security;
revoke all on public.ftn_ai_jobs from anon, authenticated;
create index if not exists ftn_ai_jobs_user_created_idx on public.ftn_ai_jobs(user_id,created_at desc);

create table if not exists public.ftn_ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid references public.ftn_ai_jobs(id),
  entry_type text not null check (entry_type in ('PURCHASE','RESERVE','REFUND','FINALIZE','ADJUSTMENT')),
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  external_reference text,
  created_at timestamptz not null default now()
);
alter table public.ftn_ai_credit_ledger enable row level security;
revoke all on public.ftn_ai_credit_ledger from anon, authenticated;

create table if not exists public.ftn_ai_affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider_id text not null references public.ftn_ai_providers(provider_id),
  campaign text not null check (length(campaign) between 1 and 100),
  session_hash text,
  created_at timestamptz not null default now()
);
alter table public.ftn_ai_affiliate_clicks enable row level security;
revoke all on public.ftn_ai_affiliate_clicks from anon, authenticated;

create or replace function public.ftn_reserve_ai_credits(
  p_user_id uuid,
  p_provider_id text,
  p_capability text,
  p_project_id uuid,
  p_input_hash text,
  p_client_request_id text
) returns public.ftn_ai_jobs
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := p_user_id;
  v_provider public.ftn_ai_providers%rowtype;
  v_balance integer;
  v_job public.ftn_ai_jobs%rowtype;
begin
  if v_user is null or not exists(select 1 from auth.users where id=v_user) then raise exception 'verified user required'; end if;
  select * into v_provider from public.ftn_ai_providers where provider_id=p_provider_id for update;
  if not found or not v_provider.enabled or not v_provider.generation_enabled then raise exception 'provider generation is disabled'; end if;
  if v_provider.customer_credit_cost is null or v_provider.provider_cost_microusd is null then raise exception 'provider cost is not approved'; end if;
  if not (p_capability = any(array['generate_image','generate_video','generate_instrumental','separate_stems','mix_audio','master_audio'])) then raise exception 'unsupported capability'; end if;
  if not exists(select 1 from public.ftn_ai_projects p where p.id=p_project_id and p.user_id=v_user) then raise exception 'project not owned by user'; end if;
  insert into public.ftn_ai_credit_accounts(user_id,balance) values(v_user,0) on conflict(user_id) do nothing;
  select balance into v_balance from public.ftn_ai_credit_accounts where user_id=v_user for update;
  if v_balance < v_provider.customer_credit_cost then raise exception 'insufficient ibis credits'; end if;
  insert into public.ftn_ai_jobs(user_id,project_id,provider_id,capability,client_request_id,input_hash,reserved_credits,quoted_provider_cost_microusd)
  values(v_user,p_project_id,p_provider_id,p_capability,p_client_request_id,p_input_hash,v_provider.customer_credit_cost,v_provider.provider_cost_microusd)
  returning * into v_job;
  update public.ftn_ai_credit_accounts set balance=balance-v_provider.customer_credit_cost,updated_at=now() where user_id=v_user returning balance into v_balance;
  insert into public.ftn_ai_credit_ledger(user_id,job_id,entry_type,amount,balance_after) values(v_user,v_job.id,'RESERVE',-v_provider.customer_credit_cost,v_balance);
  return v_job;
exception when unique_violation then
  select * into v_job from public.ftn_ai_jobs where user_id=v_user and client_request_id=p_client_request_id;
  return v_job;
end;
$$;
revoke all on function public.ftn_reserve_ai_credits(uuid,text,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ftn_reserve_ai_credits(uuid,text,text,uuid,text,text) to service_role;

create or replace function public.ftn_refund_ai_job(p_job_id uuid,p_error_code text)
returns public.ftn_ai_jobs
language plpgsql security definer set search_path='' as $$
declare v_job public.ftn_ai_jobs%rowtype; v_balance integer;
begin
  select * into v_job from public.ftn_ai_jobs where id=p_job_id for update;
  if not found then raise exception 'job not found'; end if;
  if v_job.status='REFUNDED' then return v_job; end if;
  if v_job.status not in ('CREDITS_RESERVED','SUBMITTED','PROCESSING','FAILED') then raise exception 'job is not refundable'; end if;
  update public.ftn_ai_credit_accounts set balance=balance+v_job.reserved_credits,updated_at=now() where user_id=v_job.user_id returning balance into v_balance;
  update public.ftn_ai_jobs set status='REFUNDED',error_code=left(p_error_code,120),updated_at=now() where id=p_job_id returning * into v_job;
  insert into public.ftn_ai_credit_ledger(user_id,job_id,entry_type,amount,balance_after) values(v_job.user_id,v_job.id,'REFUND',v_job.reserved_credits,v_balance);
  return v_job;
end;
$$;
revoke all on function public.ftn_refund_ai_job(uuid,text) from public,anon,authenticated;
grant execute on function public.ftn_refund_ai_job(uuid,text) to service_role;

create or replace function public.ftn_finalize_ai_job(p_job_id uuid,p_provider_job_id text,p_actual_provider_cost_microusd bigint,p_output_manifest jsonb)
returns public.ftn_ai_jobs
language plpgsql security definer set search_path='' as $$
declare v_job public.ftn_ai_jobs%rowtype;
begin
  select * into v_job from public.ftn_ai_jobs where id=p_job_id for update;
  if not found then raise exception 'job not found'; end if;
  if v_job.status='SUCCEEDED' then return v_job; end if;
  if v_job.status not in ('CREDITS_RESERVED','SUBMITTED','PROCESSING') then raise exception 'job cannot be finalized'; end if;
  if p_actual_provider_cost_microusd < 0 then raise exception 'invalid provider cost'; end if;
  update public.ftn_ai_jobs set status='SUCCEEDED',provider_job_id=left(p_provider_job_id,300),actual_provider_cost_microusd=p_actual_provider_cost_microusd,output_manifest=p_output_manifest,updated_at=now() where id=p_job_id returning * into v_job;
  return v_job;
end;
$$;
revoke all on function public.ftn_finalize_ai_job(uuid,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.ftn_finalize_ai_job(uuid,text,bigint,jsonb) to service_role;

-- Private user-audio intake for approved future stem jobs. A signed FTN Storage URL is the
-- only accepted provider input; arbitrary public URLs are rejected by the Edge Function.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ftn-private-audio','ftn-private-audio',false,52428800,array['audio/mpeg','audio/wav','audio/x-wav','audio/flac','audio/mp4','audio/x-m4a'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "users upload own private FTN audio" on storage.objects for insert to authenticated with check (bucket_id='ftn-private-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "users read own private FTN audio" on storage.objects for select to authenticated using (bucket_id='ftn-private-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "users delete own private FTN audio" on storage.objects for delete to authenticated using (bucket_id='ftn-private-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);

comment on table public.ftn_ai_providers is 'Private owner-managed AI/affiliate evidence and economics. Public views are emitted by the authenticated Creative Studio function.';
comment on table public.ftn_ai_credit_ledger is 'Append-only ibis Credits ledger. Browser roles cannot mutate balances or ledger entries.';
comment on function public.ftn_reserve_ai_credits(uuid,text,text,uuid,text,text) is 'Atomic fail-closed credit reservation for an Edge-verified user. It cannot produce a negative balance.';
