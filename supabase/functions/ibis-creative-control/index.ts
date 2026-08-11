import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Capability = "generate_image"|"generate_video"|"generate_instrumental"|"separate_stems"|"mix_audio"|"master_audio";
interface ProviderAdapter { id:string; capability:Capability[]; submit(input:unknown):Promise<{providerJobId:string}>; status(providerJobId:string):Promise<unknown>; }

// Intentionally empty in this release candidate. A provider is added here only after its
// official contract/output terms, credentials, exact unit economics and refund behavior pass review.
const adapters:Record<string,ProviderAdapter> = {};
const origins=new Set(["https://ftnplatform.org","https://www.ftnplatform.org"]);
const windows=new Map<string,{start:number,count:number}>();
function limited(userId:string){const now=Date.now(),slot=windows.get(userId);if(!slot||now-slot.start>60_000){windows.set(userId,{start:now,count:1});return false;}slot.count+=1;return slot.count>30;}
function cors(origin:string|null){return{"access-control-allow-origin":origin&&origins.has(origin)?origin:"https://ftnplatform.org","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin"};}
function reply(origin:string|null,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:cors(origin)});}
function clean(v:unknown,max=1000){return typeof v==="string"?v.trim().slice(0,max):"";}

Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=="POST"||(origin&&!origins.has(origin)))return reply(origin,{error:"Not allowed"},403);
  const url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!url||!service)return reply(origin,{error:"Creative control is not configured"},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(token),user=userData?.user;
  if(userError||!user)return reply(origin,{error:"Sign in to use protected creative projects"},401);
  if(limited(user.id))return reply(origin,{error:"Too many creative control requests. Wait one minute before retrying."},429);
  let body:any={};try{body=await req.json();}catch{return reply(origin,{error:"Invalid request"},400);}
  const action=clean(body.action,60);
  if(action==="providers"){
    const {data,error}=await admin.from("ftn_ai_providers").select("provider_id,name,categories,website,official_api_url,official_affiliate_program_url,api_status,affiliate_status,integration_type,commercial_use_status,redistribution_status,self_hostable,pay_as_you_go,prepaid_required,enabled,generation_enabled,last_verified,notes").order("name");
    if(error)return reply(origin,{error:"Provider evidence is unavailable"},503);
    return reply(origin,{providers:data||[],generationLock:Deno.env.get("FTN_CREATIVE_GENERATION_ENABLED")!=="true"});
  }
  if(action==="save-project"){
    const type=clean(body.projectType,30),title=clean(body.title,180),brief=body.brief&&typeof body.brief==="object"?body.brief:{};
    if(!["image","video","auto","instrumental","mix","master","stems"].includes(type)||!title)return reply(origin,{error:"Valid project type and title required"},422);
    const {data,error}=await admin.from("ftn_ai_projects").insert({user_id:user.id,title,project_type:type,brief,status:"PLANNED"}).select("id,status,created_at").single();
    return error?reply(origin,{error:"Project was not saved"},500):reply(origin,{project:data});
  }
  if(action==="quote"){
    const providerId=clean(body.providerId,80),capability=clean(body.capability,80);
    const {data:p}=await admin.from("ftn_ai_providers").select("provider_id,name,categories,customer_credit_cost,enabled,generation_enabled,commercial_use_status,redistribution_status").eq("provider_id",providerId).maybeSingle();
    if(!p||!p.enabled||!p.generation_enabled||!p.customer_credit_cost)return reply(origin,{approved:false,generationLock:true,error:"This provider is not approved for paid FTN generation"},409);
    if(!["generate_image","generate_video","generate_instrumental","separate_stems","mix_audio","master_audio"].includes(capability))return reply(origin,{approved:false,error:"Unsupported capability"},422);
    const {data:account}=await admin.from("ftn_ai_credit_accounts").select("balance").eq("user_id",user.id).maybeSingle();
    const balance=account?.balance||0;
    return reply(origin,{approved:balance>=p.customer_credit_cost,provider:p.name,creditCost:p.customer_credit_cost,balance,commercialUse:p.commercial_use_status,redistribution:p.redistribution_status,generationLock:Deno.env.get("FTN_CREATIVE_GENERATION_ENABLED")!=="true"||!adapters[providerId]});
  }
  if(action==="affiliate-click"){
    const providerId=clean(body.providerId,80),campaign=clean(body.campaign,100)||"ibis-creative-studio";
    const {data:p}=await admin.from("ftn_ai_providers").select("affiliate_url,affiliate_status").eq("provider_id",providerId).maybeSingle();
    if(!p||p.affiliate_status!=="VERIFIED"||!p.affiliate_url)return reply(origin,{error:"No approved FTN affiliate link is configured; use the clearly labelled official provider page instead"},409);
    await admin.from("ftn_ai_affiliate_clicks").insert({user_id:user.id,provider_id:providerId,campaign});
    return reply(origin,{redirect:p.affiliate_url,disclosure:"FTN may earn a commission if you purchase through this link."});
  }
  if(action==="generate"){
    // The reserve/call/finalize/refund path cannot be entered before global and provider-specific enablement.
    if(Deno.env.get("FTN_CREATIVE_GENERATION_ENABLED")!=="true")return reply(origin,{error:"Paid creative generation is disabled; no provider was called and no credits were reserved"},409);
    const providerId=clean(body.providerId,80),adapter=adapters[providerId];
    if(!adapter)return reply(origin,{error:"No approved provider adapter is deployed; no credits were reserved"},409);
    return reply(origin,{error:"Generation workflow is not released"},409);
  }
  return reply(origin,{error:"Unknown action"},400);
});
