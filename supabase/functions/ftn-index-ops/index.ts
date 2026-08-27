import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const BASE_ORIGINS=new Set(["https://ftnplatform.org","https://www.ftnplatform.org","http://localhost:8000","http://127.0.0.1:8000"]);
function headers(origin:string|null){return{"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin&&BASE_ORIGINS.has(origin)?origin:"https://ftnplatform.org","access-control-allow-headers":"authorization,apikey,content-type,x-ftn-device-credential","access-control-allow-methods":"POST,OPTIONS","cache-control":"no-store","vary":"Origin"};}
function reply(origin:string|null,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
function clean(v:unknown,max=200){return typeof v==="string"?v.trim().slice(0,max):"";}
function jwtSub(token:string){try{const p=token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");const j=JSON.parse(atob(p.padEnd(Math.ceil(p.length/4)*4,"=")));return /^[0-9a-f-]{36}$/i.test(j.sub||"")?j.sub:"";}catch{return"";}}
function scalar(v:unknown){if(v===null||v===undefined)return"";if(typeof v==="string")return v;return String(v);}
function host(value:string){try{return new URL(value).hostname.toLowerCase().replace(/^www\./,"");}catch{return"";}}

async function founderAllowed(req:Request,url:string){
  const authorization=req.headers.get("authorization")||"",device=req.headers.get("x-ftn-device-credential")||"",apikey=req.headers.get("apikey")||"";
  if(!authorization||!device)return{allowed:false,status:401,error:"Founder authorization required"};
  const r=await fetch(`${url}/functions/v1/ftn-owner-control`,{method:"POST",headers:{"content-type":"application/json","authorization":authorization,"apikey":apikey,"x-ftn-device-credential":device},body:JSON.stringify({action:"authorize"})});
  const data=await r.json().catch(()=>({}));
  return{allowed:r.ok&&data?.allowed===true,status:r.status,error:data?.error||"Founder authorization denied"};
}

Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST"||(origin&&!BASE_ORIGINS.has(origin)))return reply(origin,{allowed:false,error:"Not allowed"},403);
  const url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!service)return reply(origin,{allowed:false,error:"FTN Index operations unavailable"},503);
  const auth=await founderAllowed(req,url);if(!auth.allowed)return reply(origin,{allowed:false,error:auth.error},auth.status||403);
  const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");const actor=jwtSub(token);
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  let body:any={};try{body=await req.json();}catch{return reply(origin,{allowed:false,error:"Invalid request"},400);}
  const action=clean(body.action,80)||"dashboard";
  const journal=async(name:string,target:string,previous:unknown,next:unknown,reason:string)=>{if(!actor)return;await db.from("ftn_control_journal").insert({actor_id:actor,action:name,target,previous_state:previous||{},requested_state:next||{},reason:reason||"FTN Index founder operation",dry_run:false,user_agent:clean(req.headers.get("user-agent"),500)});};

  if(action==="dashboard"){
    const [{data:entities},{data:queues},{data:obs},{data:runs},{data:settings},{data:costs},{data:fields},{data:events}]=await Promise.all([
      db.from("ftn_index_entities").select("id,ftn_id,display_name,slug,territory_code,category,subcategory,public_status,claimed,last_entity_confirmed_at,updated_at").order("updated_at",{ascending:false}).limit(500),
      db.from("ftn_index_outreach_queue").select("id,entity_id,territory_code,vertical,status,transport_key,do_not_contact,quality_status,quality_score,selected_for_pilot,selected_at,invited_at,external_message_id,last_error_code,updated_at").order("quality_score",{ascending:false}).limit(500),
      db.from("ftn_index_scout_observations").select("entity_id,candidate_url,quality_status,quality_score,quality_reasons,observed_at,created_at").order("created_at",{ascending:false}).limit(1000),
      db.from("ftn_index_scout_runs").select("run_key,territory_code,vertical,source_key,status,discovered_count,contactable_count,started_at,completed_at,error_code").order("started_at",{ascending:false}).limit(20),
      db.from("ftn_index_internal_settings").select("setting_key,setting_value").in("setting_key",["scout_enabled","outreach_enabled","outreach_transport","pilot_max_batch"]),
      db.from("ftn_cost_guard").select("service_key,service_label,plan_name,free_limit,usage_value,usage_unit,warning_percent,critical_percent,throttle_percent,founder_approved_paid,hard_stop_at_free_limit,last_checked_at,updated_at").in("service_key",["supabase_database","supabase_egress","supabase_storage","supabase_edge_invocations","ftn_index_email_transport"]),
      db.from("ftn_index_fields").select("entity_id,field_key,value_json").in("field_key",["email","website","phone","address","locality"]).is("superseded_at",null).eq("visibility","internal").limit(2500),
      db.from("ftn_index_outreach_events").select("entity_id,event_type,provider,external_message_id,created_at").order("created_at",{ascending:false}).limit(100)
    ]);
    const entityMap=new Map((entities||[]).map((x:any)=>[x.id,x]));
    const latestObs=new Map<string,any>();for(const x of obs||[])if(x.entity_id&&!latestObs.has(x.entity_id))latestObs.set(x.entity_id,x);
    const fieldMap=new Map<string,Record<string,string>>();for(const x of fields||[]){if(!fieldMap.has(x.entity_id))fieldMap.set(x.entity_id,{});fieldMap.get(x.entity_id)![x.field_key]=scalar(x.value_json);}
    const duplicateEmails=new Map<string,number>(),duplicateHosts=new Map<string,number>();
    for(const q of queues||[]){const f=fieldMap.get(q.entity_id)||{},email=(f.email||"").toLowerCase(),domain=host(f.website||"");if(email)duplicateEmails.set(email,(duplicateEmails.get(email)||0)+1);if(domain)duplicateHosts.set(domain,(duplicateHosts.get(domain)||0)+1);}
    const candidates=(queues||[]).map((q:any)=>{const e:any=entityMap.get(q.entity_id)||{},o=latestObs.get(q.entity_id)||{},f=fieldMap.get(q.entity_id)||{},email=(f.email||"").toLowerCase(),domain=host(f.website||"");return{queue_id:q.id,entity_id:q.entity_id,ftn_id:e.ftn_id,display_name:e.display_name,slug:e.slug,territory_code:e.territory_code,category:e.category,subcategory:e.subcategory,public_status:e.public_status,outreach_status:q.status,quality_status:q.quality_status||o.quality_status,quality_score:q.quality_score??o.quality_score,quality_reasons:o.quality_reasons||[],email:f.email||"",website:f.website||"",phone:f.phone||"",address:f.address||"",locality:f.locality||"",source_url:o.candidate_url||"",selected_for_pilot:q.selected_for_pilot,selected_at:q.selected_at,invited_at:q.invited_at,do_not_contact:q.do_not_contact,duplicate_contact:Boolean(email&&(duplicateEmails.get(email)||0)>1),duplicate_domain:Boolean(domain&&(duplicateHosts.get(domain)||0)>1),last_error_code:q.last_error_code||null};});
    const recommended:any[]=[];const usedEmails=new Set<string>(),usedHosts=new Set<string>();
    for(const c of candidates.filter((x:any)=>x.quality_status==="pass"&&x.outreach_status==="blocked-transport"&&!x.do_not_contact).sort((a:any,b:any)=>(b.quality_score||0)-(a.quality_score||0)||String(a.display_name).localeCompare(String(b.display_name)))){const email=String(c.email||"").toLowerCase(),domain=host(c.website||"");if(!email)continue;if(usedEmails.has(email)||(domain&&usedHosts.has(domain)))continue;usedEmails.add(email);if(domain)usedHosts.add(domain);recommended.push(c);if(recommended.length>=5)break;}
    const metric=(fn:(x:any)=>boolean)=>candidates.filter(fn).length;
    const settingsObj=Object.fromEntries((settings||[]).map((x:any)=>[x.setting_key,x.setting_value]));
    const transportConfigured=Boolean(Deno.env.get("FTN_INDEX_RESEND_API_KEY")&&Deno.env.get("FTN_INDEX_FROM_EMAIL"));
    return reply(origin,{allowed:true,index:{metrics:{entities:(entities||[]).length,provisional:(entities||[]).filter((x:any)=>x.public_status==="provisional").length,current:(entities||[]).filter((x:any)=>x.public_status==="current").length,pass:metric((x:any)=>x.quality_status==="pass"),review:metric((x:any)=>x.quality_status==="review"),reject:metric((x:any)=>x.quality_status==="reject"),contactable:metric((x:any)=>x.quality_status==="pass"&&Boolean(x.email)&&!x.do_not_contact),blocked:metric((x:any)=>x.outreach_status==="blocked-transport"),invited:metric((x:any)=>x.outreach_status==="invited"),clicked:metric((x:any)=>x.outreach_status==="clicked"),claimed:metric((x:any)=>x.outreach_status==="claimed"),optouts:metric((x:any)=>x.do_not_contact===true),pilotSelected:metric((x:any)=>x.selected_for_pilot===true)},settings:settingsObj,transport:{provider:settingsObj.outreach_transport||"resend",configured:transportConfigured,freeMonthlyLimit:3000,freeDailyLimit:100},lastRun:(runs||[])[0]||null,runs:runs||[],costs:costs||[],candidates,recommendedPilot:recommended,events:events||[]}});
  }

  if(action==="set-control"){
    const key=clean(body.key,80);if(!["scout_enabled","outreach_enabled"].includes(key))return reply(origin,{allowed:false,error:"Unsupported control"},400);
    const value=body.value===true?"true":"false";
    if(key==="outreach_enabled"&&value==="true"&&!(Deno.env.get("FTN_INDEX_RESEND_API_KEY")&&Deno.env.get("FTN_INDEX_FROM_EMAIL")))return reply(origin,{allowed:false,error:"Email transport is not configured. Add the FTN Resend API key and verified FTN sender first."},409);
    const{data:before}=await db.from("ftn_index_internal_settings").select("setting_value").eq("setting_key",key).maybeSingle();
    await db.from("ftn_index_internal_settings").upsert({setting_key:key,setting_value:value,updated_at:new Date().toISOString()});
    await journal("FTN_INDEX_CONTROL",`ftn-index:${key}`,before||{}, {setting_value:value},clean(body.reason,300)||`Set ${key}=${value}`);
    return reply(origin,{allowed:true,key,value});
  }

  if(action==="prepare-pilot"){
    const ids=Array.isArray(body.entityIds)?[...new Set(body.entityIds.map((x:any)=>clean(x,60)).filter((x:string)=>/^[0-9a-f-]{36}$/i.test(x)))]:[];
    const{data:maxRow}=await db.from("ftn_index_internal_settings").select("setting_value").eq("setting_key","pilot_max_batch").maybeSingle();const max=Math.max(1,Math.min(5,Number(maxRow?.setting_value)||5));
    if(!ids.length||ids.length>max)return reply(origin,{allowed:false,error:`Select between 1 and ${max} businesses.`},400);
    const{data:qs}=await db.from("ftn_index_outreach_queue").select("id,entity_id,status,quality_status,do_not_contact").in("entity_id",ids);
    if((qs||[]).length!==ids.length||(qs||[]).some((x:any)=>x.status!=="blocked-transport"||x.quality_status!=="pass"||x.do_not_contact))return reply(origin,{allowed:false,error:"Every pilot record must be PASS, contactable, not opted out and unsent."},409);
    const{data:fs}=await db.from("ftn_index_fields").select("entity_id,field_key,value_json").in("entity_id",ids).in("field_key",["email","website"]).is("superseded_at",null);
    const map=new Map<string,Record<string,string>>();for(const f of fs||[]){if(!map.has(f.entity_id))map.set(f.entity_id,{});map.get(f.entity_id)![f.field_key]=scalar(f.value_json);}
    const emails=new Set<string>(),domains=new Set<string>();for(const id of ids){const f=map.get(id)||{},email=(f.email||"").toLowerCase(),domain=host(f.website||"");if(!email)return reply(origin,{allowed:false,error:"Each pilot business needs a public email."},409);if(emails.has(email)||(domain&&domains.has(domain)))return reply(origin,{allowed:false,error:"Pilot contains duplicate contact/domain records. Resolve duplicates before sending."},409);emails.add(email);if(domain)domains.add(domain);}
    const now=new Date().toISOString();await db.from("ftn_index_outreach_queue").update({selected_for_pilot:false,selected_at:null}).eq("selected_for_pilot",true).in("status",["blocked-transport","failed"]);
    await db.from("ftn_index_outreach_queue").update({selected_for_pilot:true,selected_at:now}).in("entity_id",ids).eq("status","blocked-transport");
    for(const q of qs||[])await db.from("ftn_index_outreach_events").insert({entity_id:q.entity_id,outreach_queue_id:q.id,event_type:"pilot-selected",metadata:{batch_size:ids.length}});
    await journal("FTN_INDEX_PREPARE_PILOT","ftn-index:pilot",{}, {entity_ids:ids},clean(body.reason,300)||"Prepare controlled FTN Index pilot");
    return reply(origin,{allowed:true,selected:ids.length});
  }

  if(action==="clear-pilot"){
    const{data:selected}=await db.from("ftn_index_outreach_queue").select("id,entity_id").eq("selected_for_pilot",true);
    await db.from("ftn_index_outreach_queue").update({selected_for_pilot:false,selected_at:null}).eq("selected_for_pilot",true).eq("status","blocked-transport");
    for(const q of selected||[])await db.from("ftn_index_outreach_events").insert({entity_id:q.entity_id,outreach_queue_id:q.id,event_type:"pilot-cleared"});
    await journal("FTN_INDEX_CLEAR_PILOT","ftn-index:pilot",{selected:(selected||[]).length},{selected:0},clean(body.reason,300)||"Clear FTN Index pilot selection");
    return reply(origin,{allowed:true,cleared:(selected||[]).length});
  }

  if(action==="send-pilot"){
    const{data:enabled}=await db.from("ftn_index_internal_settings").select("setting_value").eq("setting_key","outreach_enabled").maybeSingle();if(enabled?.setting_value!=="true")return reply(origin,{allowed:false,error:"Outreach is disabled in founder controls."},409);
    const{data:secret}=await db.from("ftn_index_internal_settings").select("setting_value").eq("setting_key","outreach_internal_secret").maybeSingle();if(!secret?.setting_value)return reply(origin,{allowed:false,error:"Outreach internal authorization is unavailable."},503);
    const response=await fetch(`${url}/functions/v1/ftn-index-outreach`,{method:"POST",headers:{"content-type":"application/json","x-ftn-index-outreach-secret":secret.setting_value},body:JSON.stringify({action:"send-selected-pilot"})});const data=await response.json().catch(()=>({}));
    await journal("FTN_INDEX_SEND_PILOT","ftn-index:pilot",{}, {result:data},clean(body.reason,300)||"Send controlled FTN Index pilot");
    return reply(origin,data,response.status);
  }

  return reply(origin,{allowed:false,error:"Unknown FTN Index operation"},400);
});
