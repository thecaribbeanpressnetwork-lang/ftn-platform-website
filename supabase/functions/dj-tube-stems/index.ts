import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL_VERSION="cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953";
const ORIGINS=new Set(["https://ftnplatform.org","https://www.ftnplatform.org"]);
function headers(origin:string|null){return{"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin&&ORIGINS.has(origin)?origin:"https://ftnplatform.org","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","cache-control":"no-store","vary":"Origin"};}
function reply(origin:string|null,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(origin)});}
function clean(v:unknown,max=500){return typeof v==="string"?v.trim().slice(0,max):"";}
async function hash(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");}

Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST"||(origin&&!ORIGINS.has(origin)))return reply(origin,{error:"Not allowed"},403);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",providerToken=Deno.env.get("REPLICATE_API_TOKEN")||"",accessToken=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!supabaseUrl||!serviceRole)return reply(origin,{error:"Stem identity and cost controls are not configured"},503);
  const admin=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(accessToken),user=userData?.user;
  if(userError||!user)return reply(origin,{error:"Sign in before requesting a stem job"},401);
  if(Deno.env.get("FTN_STEM_GENERATION_ENABLED")!=="true"||!providerToken)return reply(origin,{error:"Paid stem processing is disabled; no provider was called and no ibis Credits were reserved"},409);
  let body:any={};try{body=await req.json();}catch{return reply(origin,{error:"Invalid request"},400);}
  const audio=clean(body.audio,2000),projectId=clean(body.projectId,80),clientRequestId=clean(body.clientRequestId,160),format=clean(body.outputFormat,10)||"mp3";
  if(body.rightsConfirmed!==true)return reply(origin,{error:"Confirm that you own or are licensed to process this audio"},422);
  let input:URL;try{input=new URL(audio);}catch{return reply(origin,{error:"A signed private FTN audio URL is required"},422);}
  const expectedHost=new URL(supabaseUrl).host;
  if(input.protocol!=="https:"||input.host!==expectedHost||!input.pathname.startsWith("/storage/v1/object/sign/ftn-private-audio/")||!input.searchParams.get("token"))return reply(origin,{error:"Only a short-lived signed URL from private FTN audio storage is accepted"},422);
  if(!/^[0-9a-f-]{36}$/i.test(projectId)||clientRequestId.length<8||!["mp3","wav"].includes(format))return reply(origin,{error:"Valid project, idempotency key and output format required"},422);
  const inputHash=await hash(user.id+"|"+input.pathname+"|"+clientRequestId);
  const {data:job,error:reserveError}=await admin.rpc("ftn_reserve_ai_credits",{p_user_id:user.id,p_provider_id:"replicate-demucs",p_capability:"separate_stems",p_project_id:projectId,p_input_hash:inputHash,p_client_request_id:clientRequestId});
  if(reserveError||!job)return reply(origin,{error:reserveError?.message||"Stem cost could not be reserved; no provider was called"},402);
  try{
    const upstream=await fetch("https://api.replicate.com/v1/predictions",{method:"POST",headers:{Authorization:`Bearer ${providerToken}`,"Content-Type":"application/json","Prefer":"wait"},body:JSON.stringify({version:MODEL_VERSION,input:{audio,model_name:"htdemucs",shifts:1,overlap:.25,clip_mode:"rescale",mp3_bitrate:320,output_format:format,float32:false}}),signal:AbortSignal.timeout(120000)});
    const result=await upstream.json().catch(()=>({}));
    if(!upstream.ok||!result.id)throw new Error("provider submission failed");
    // Exact actual billing is provider-report dependent. Do not finalize with an invented cost.
    // Keep the job submitted and reconcile/finalize from a verified provider record/webhook.
    await admin.from("ftn_ai_jobs").update({status:result.status==="succeeded"?"PROCESSING":"SUBMITTED",provider_job_id:String(result.id).slice(0,300),output_manifest:{providerStatus:result.status||"submitted"},updated_at:new Date().toISOString()}).eq("id",job.id);
    return reply(origin,{jobId:job.id,providerJobId:result.id,status:result.status||"submitted",reservedCredits:job.reserved_credits,notice:"Credits are reserved. Final cost and downloadable output are not claimed until verified reconciliation."},202);
  }catch(error){await admin.rpc("ftn_refund_ai_job",{p_job_id:job.id,p_error_code:"PROVIDER_SUBMISSION_FAILED"});return reply(origin,{error:"Stem provider failed; the reserved ibis Credits were refunded and no output is claimed"},502);}
});
