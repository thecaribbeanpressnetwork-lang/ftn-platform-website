import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// FTN Fire speaks only to an FTN-controlled inference gateway. The gateway keeps the
// Hugging Face token private, owns the model runtime and exposes this small async contract:
// POST /v1/jobs -> 202 { id, status }; GET /v1/jobs/:id -> { status, output_url?,
// content_type?, actual_cost_microusd?, error_code? }. Output URLs must be explicitly
// allow-listed in FTN_FIRE_OUTPUT_ALLOWED_HOSTS before Fire downloads them into private storage.
const ORIGINS=new Set(["https://ftnplatform.org","https://www.ftnplatform.org"]);
const PROVIDER="stable-audio-3-medium",BUCKET="ftn-fire-output",MAX_BYTES=52_428_800;
const windows=new Map<string,{start:number,count:number}>();
function headers(origin:string|null){return{"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin&&ORIGINS.has(origin)?origin:"https://ftnplatform.org","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","cache-control":"no-store","vary":"Origin"};}
function reply(origin:string|null,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
function text(value:unknown,max=1000){return typeof value==="string"?value.trim().slice(0,max):"";}
function limited(id:string){const now=Date.now(),slot=windows.get(id);if(!slot||now-slot.start>60_000){windows.set(id,{start:now,count:1});return false;}slot.count++;return slot.count>12;}
function enabled(){return Deno.env.get("FTN_CREATIVE_GENERATION_ENABLED")==="true"&&Deno.env.get("FTN_FIRE_GENERATION_ENABLED")==="true";}
function gateway(){const raw=Deno.env.get("FTN_FIRE_INFERENCE_URL")||"",token=Deno.env.get("FTN_FIRE_INFERENCE_TOKEN")||"";let url:URL;try{url=new URL(raw);}catch{throw new Error("FTN Fire gateway is not configured");}if(url.protocol!=="https:"||!token)throw new Error("FTN Fire gateway is not configured");url.pathname=url.pathname.replace(/\/$/,"");return{url,token};}
function safeOutputUrl(raw:unknown){const value=text(raw,2000);let url:URL;try{url=new URL(value);}catch{return null;}const hosts=new Set((Deno.env.get("FTN_FIRE_OUTPUT_ALLOWED_HOSTS")||"").split(",").map(x=>x.trim()).filter(Boolean));return url.protocol==="https:"&&hosts.has(url.host)?url:null;}
async function sha(value:string){const data=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return [...new Uint8Array(data)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function providerFetch(path:string,init:RequestInit={}){const g=gateway(),url=new URL(path,g.url);const response=await fetch(url,{...init,headers:{Authorization:`Bearer ${g.token}`,"content-type":"application/json",...(init.headers||{})},signal:AbortSignal.timeout(30_000)});const json=await response.json().catch(()=>({}));if(!response.ok)throw new Error("FTN Fire gateway request failed");return json as Record<string,unknown>;}
function extension(contentType:string){if(["audio/mpeg","audio/mp4","audio/x-m4a"].includes(contentType))return contentType==="audio/mpeg"?"mp3":"m4a";return"wav";}
function publicJob(job:any,url?:string){return{jobId:job.id,status:job.status,reservedCredits:job.reserved_credits,createdAt:job.created_at,downloadUrl:url||null,errorCode:job.error_code||null};}

Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST"||(origin&&!ORIGINS.has(origin)))return reply(origin,{error:"Not allowed"},403);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!supabaseUrl||!service)return reply(origin,{error:"FTN Fire identity controls are not configured"},503);
  const admin=createClient(supabaseUrl,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(token),user=userData?.user;
  if(userError||!user)return reply(origin,{error:"Sign in to use FTN Fire"},401);
  if(limited(user.id))return reply(origin,{error:"Too many Fire requests. Wait one minute before retrying."},429);
  let body:any={};try{body=await req.json();}catch{return reply(origin,{error:"Invalid request"},400);}
  const action=text(body.action,30);
  if(action==="status"){
    const jobId=text(body.jobId,50);if(!/^[0-9a-f-]{36}$/i.test(jobId))return reply(origin,{error:"Valid Fire job required"},422);
    const {data:job}=await admin.from("ftn_ai_jobs").select("*").eq("id",jobId).eq("user_id",user.id).eq("provider_id",PROVIDER).maybeSingle();
    if(!job)return reply(origin,{error:"Fire job not found"},404);
    if(job.status==="SUCCEEDED"){const path=job.output_manifest?.storagePath;const signed=typeof path==="string"?await admin.storage.from(BUCKET).createSignedUrl(path,300):{data:null};return reply(origin,publicJob(job,signed.data?.signedUrl));}
    if(["REFUNDED","FAILED","CANCELLED"].includes(job.status))return reply(origin,publicJob(job));
    if(!enabled())return reply(origin,{...publicJob(job),notice:"Generation is currently paused; no additional provider request was made."},409);
    try{
      const remote=await providerFetch(`/v1/jobs/${encodeURIComponent(job.provider_job_id||"")}`,{method:"GET"}),state=text(remote.status,30).toUpperCase();
      if(["FAILED","CANCELLED"].includes(state)){const {data:refunded}=await admin.rpc("ftn_refund_ai_job",{p_job_id:job.id,p_error_code:text(remote.error_code,120)||"PROVIDER_FAILED"});return reply(origin,{...publicJob(refunded||job),notice:"FTN Fire failed before delivery; reserved credits were refunded."});}
      if(state!=="SUCCEEDED"){await admin.from("ftn_ai_jobs").update({status:"PROCESSING",output_manifest:{providerStatus:state||"PROCESSING"},updated_at:new Date().toISOString()}).eq("id",job.id);return reply(origin,{...publicJob({...job,status:"PROCESSING"}),providerStatus:state||"PROCESSING"},202);}
      const output=safeOutputUrl(remote.output_url),actual=Number(remote.actual_cost_microusd),type=text(remote.content_type,80)||"audio/wav";
      if(!output||!Number.isSafeInteger(actual)||actual<0)return reply(origin,{...publicJob(job),error:"Gateway completion record is incomplete; output is not being claimed or charged as delivered."},502);
      const audio=await fetch(output,{signal:AbortSignal.timeout(60_000)});if(!audio.ok)throw new Error("output unavailable");const bytes=Number(audio.headers.get("content-length")||0);if(bytes>MAX_BYTES)throw new Error("output too large");const buffer=new Uint8Array(await audio.arrayBuffer());if(!buffer.byteLength||buffer.byteLength>MAX_BYTES)throw new Error("output invalid");
      const path=`${user.id}/jobs/${job.id}/fire.${extension(type)}`,upload=await admin.storage.from(BUCKET).upload(path,buffer,{contentType:type,upsert:false});if(upload.error)throw new Error("private output save failed");
      const {data:done,error:finishError}=await admin.rpc("ftn_finalize_ai_job",{p_job_id:job.id,p_provider_job_id:job.provider_job_id,p_actual_provider_cost_microusd:actual,p_output_manifest:{storagePath:path,contentType:type,bytes:buffer.byteLength,providerStatus:"SUCCEEDED"}});if(finishError||!done)throw new Error("job finalization failed");
      const signed=await admin.storage.from(BUCKET).createSignedUrl(path,300);return reply(origin,publicJob(done,signed.data?.signedUrl));
    }catch{ return reply(origin,{...publicJob(job),error:"Fire output could not be safely retrieved. It remains pending for retry; no output is claimed."},502); }
  }
  if(action!=="generate")return reply(origin,{error:"Unknown FTN Fire action"},400);
  if(!enabled())return reply(origin,{error:"FTN Fire paid generation is not live yet. No provider was called and no credits were reserved."},409);
  const prompt=text(body.prompt,900),style=text(body.style,80),key=text(body.key,24),format=text(body.format,10)||"wav",clientRequestId=text(body.clientRequestId,160),duration=Number(body.durationSeconds);
  if(body.rightsConfirmed!==true||body.noArtistImitation!==true)return reply(origin,{error:"Confirm original direction and no artist imitation before generation"},422);
  if(prompt.length<12||/\b(lyrics?|vocals?|spoken word)\b/i.test(prompt)||!style||!key||clientRequestId.length<8||![15,30,45].includes(duration)||!["wav","mp3"].includes(format))return reply(origin,{error:"Use an instrumental-only prompt, valid format and a 15, 30 or 45-second duration"},422);
  const {data:provider}=await admin.from("ftn_ai_providers").select("enabled,generation_enabled,customer_credit_cost,provider_cost_microusd").eq("provider_id",PROVIDER).maybeSingle();
  if(!provider?.enabled||!provider.generation_enabled||!provider.customer_credit_cost||provider.provider_cost_microusd===null)return reply(origin,{error:"FTN Fire is not commercially approved yet. No credits were reserved."},409);
  const title=`Fire ${style} · ${duration}s`,brief={prompt,style,key,format,durationSeconds:duration,instrumentalOnly:true,artistImitation:false};
  const {data:project,error:projectError}=await admin.from("ftn_ai_projects").insert({user_id:user.id,title,project_type:"instrumental",status:"QUOTED",brief,provider_id:PROVIDER,provider_transfer_approved_at:new Date().toISOString()}).select("id").single();
  if(projectError||!project)return reply(origin,{error:"Fire project could not be prepared"},500);
  const inputHash=await sha(`${user.id}|${JSON.stringify(brief)}|${clientRequestId}`),{data:job,error:reserveError}=await admin.rpc("ftn_reserve_ai_credits",{p_user_id:user.id,p_provider_id:PROVIDER,p_capability:"generate_instrumental",p_project_id:project.id,p_input_hash:inputHash,p_client_request_id:clientRequestId});
  if(reserveError||!job)return reply(origin,{error:reserveError?.message||"Fire credits could not be reserved; no provider was called"},402);
  try{const remote=await providerFetch("/v1/jobs",{method:"POST",body:JSON.stringify({ftn_job_id:job.id,model:PROVIDER,prompt,style,key,duration_seconds:duration,format,instrumental_only:true,no_artist_imitation:true})}),providerJobId=text(remote.id,300);if(!providerJobId)throw new Error("gateway did not return a job");await admin.from("ftn_ai_jobs").update({status:"SUBMITTED",provider_job_id:providerJobId,output_manifest:{providerStatus:text(remote.status,30)||"SUBMITTED"},updated_at:new Date().toISOString()}).eq("id",job.id);return reply(origin,{...publicJob({...job,status:"SUBMITTED"}),providerJobId,notice:"Credits are reserved. Fire will provide a private download only after verified output reconciliation."},202);}catch{await admin.rpc("ftn_refund_ai_job",{p_job_id:job.id,p_error_code:"FIRE_GATEWAY_SUBMISSION_FAILED"});return reply(origin,{error:"FTN Fire could not start. Reserved credits were refunded; no output is claimed."},502);}
});
