-- FTN Fire managed generation. This migration depends on
-- 20260810150000_ibis_creative_cost_controls.sql and remains disabled until
-- FTN has accepted the applicable model licence, approved unit economics and
-- configured its private inference gateway.

insert into public.ftn_ai_providers(
  provider_id,name,categories,website,official_api_url,api_status,affiliate_status,
  integration_type,pricing_url,commercial_use_status,redistribution_status,
  self_hostable,pay_as_you_go,prepaid_required,enabled,generation_enabled,notes,last_verified
) values
  ('stable-audio-3-medium','Stable Audio 3 Medium',array['instrumental'],'https://stability.ai/stable-audio','https://platform.stability.ai/','OPEN_MODEL','NOT_APPLICABLE','SELF_HOSTED','https://stability.ai/license','PENDING_FTN_ENTITY_LICENSE_ACCEPTANCE','PENDING_OUTPUT_RIGHTS_AND_RETENTION_REVIEW',true,false,false,false,false,'FTN Fire managed-generation candidate. Disabled until the FTN legal entity accepts the applicable licence, a private gateway is deployed, actual unit cost is measured and customer credit price is approved.',null),
  ('stable-audio-3-small-sfx','Stable Audio 3 Small SFX',array['sound-effect','dj-drop','stinger'],'https://stability.ai/stable-audio','https://platform.stability.ai/','OPEN_MODEL','NOT_APPLICABLE','SELF_HOSTED','https://stability.ai/license','PENDING_FTN_ENTITY_LICENSE_ACCEPTANCE','PENDING_OUTPUT_RIGHTS_AND_RETENTION_REVIEW',true,false,false,false,false,'Separate FTN Fire SFX capability. It is not interchangeable with full instrumental generation and is disabled until its own test and economics approval.',null)
on conflict(provider_id) do update set
  name=excluded.name,
  categories=excluded.categories,
  official_api_url=excluded.official_api_url,
  pricing_url=excluded.pricing_url,
  commercial_use_status=excluded.commercial_use_status,
  redistribution_status=excluded.redistribution_status,
  notes=excluded.notes,
  updated_at=now();

-- Audio is never made public. Only the authenticated owner can receive a short-lived
-- signed download URL through ftn-fire-generate.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('ftn-fire-output','ftn-fire-output',false,52428800,array['audio/wav','audio/x-wav','audio/mpeg','audio/mp4','audio/x-m4a'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "users read own private Fire output" on storage.objects for select to authenticated
  using (bucket_id='ftn-fire-output' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "users delete own private Fire output" on storage.objects for delete to authenticated
  using (bucket_id='ftn-fire-output' and (storage.foldername(name))[1]=(select auth.uid())::text);
