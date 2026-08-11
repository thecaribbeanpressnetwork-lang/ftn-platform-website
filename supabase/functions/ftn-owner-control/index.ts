import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const baseOrigins = ["https://ftnplatform.org", "https://www.ftnplatform.org"];
const configuredOrigins = (Deno.env.get("FTN_ALLOWED_ORIGINS") || "").split(",").map((x) => x.trim()).filter(Boolean);
const allowedOrigins = new Set([...baseOrigins, ...configuredOrigins]);
function headers(origin: string | null) { return {"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin && allowedOrigins.has(origin) ? origin : "https://ftnplatform.org","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","cache-control":"no-store","vary":"Origin"}; }
function reply(origin: string | null, body: unknown, status=200) { return new Response(JSON.stringify(body),{status,headers:headers(origin)}); }
function bearer(req: Request) { return req.headers.get("authorization")?.replace(/^Bearer\s+/i,"") || ""; }
function clean(value: unknown, max=1000) { return typeof value === "string" ? value.trim().slice(0,max) : ""; }

Deno.serve(async (req) => {
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST" || (origin && !allowedOrigins.has(origin))) return reply(origin,{allowed:false,error:"Not allowed"},403);
  const url=Deno.env.get("SUPABASE_URL") || "",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",ownerId=Deno.env.get("FTN_OWNER_USER_ID") || "";
  if(!url || !service || !ownerId) return reply(origin,{allowed:false,error:"Owner authorization is not configured"},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),token=bearer(req);
  if(!token) return reply(origin,{allowed:false,error:"Authenticate first"},401);
  const {data:userData,error:userError}=await admin.auth.getUser(token),user=userData?.user;
  if(userError || !user) return reply(origin,{allowed:false,error:"Session could not be verified"},401);
  const {data:role}=await admin.from("ftn_operator_roles").select("role,revoked_at").eq("user_id",user.id).maybeSingle();
  if(user.id!==ownerId || role?.role!=="owner" || role?.revoked_at) return reply(origin,{allowed:false,error:"Owner authorization denied"},403);
  let body:any={};try{body=await req.json();}catch{return reply(origin,{allowed:false,error:"Invalid request"},400);}
  const action=clean(body.action,80)||"authorize";
  const {data:current}=await admin.from("ftn_control_state").select("mode,reason,updated_at,version").eq("singleton",true).maybeSingle();
  if(action==="authorize") return reply(origin,{allowed:true,state:current?.mode||"normal",verifiedAt:new Date().toISOString()});
  if(action==="dashboard") {
    const [{data:products},{data:journal},{data:providers},{data:jobs},{data:credits},{data:affiliateClicks}]=await Promise.all([
      admin.from("ftn_product_controls").select("*").order("product_id"),
      admin.from("ftn_control_journal").select("id,action,target,reason,dry_run,created_at").order("created_at",{ascending:false}).limit(50),
      admin.from("ftn_ai_providers").select("provider_id,name,categories,integration_type,api_status,affiliate_status,customer_credit_cost,provider_cost_microusd,enabled,generation_enabled,last_verified").order("name"),
      admin.from("ftn_ai_jobs").select("id,provider_id,capability,status,reserved_credits,quoted_provider_cost_microusd,actual_provider_cost_microusd,created_at").order("created_at",{ascending:false}).limit(100),
      admin.from("ftn_ai_credit_ledger").select("entry_type,amount,created_at").order("created_at",{ascending:false}).limit(200),
      admin.from("ftn_ai_affiliate_clicks").select("provider_id,campaign,created_at").order("created_at",{ascending:false}).limit(200)
    ]);
    return reply(origin,{allowed:true,state:current||{mode:"normal"},products:products||[],journal:journal||[],creative:{providers:providers||[],jobs:jobs||[],creditLedger:credits||[],affiliateClicks:affiliateClicks||[],generationGloballyEnabled:Deno.env.get("FTN_CREATIVE_GENERATION_ENABLED")==="true"}});
  }
  if(action==="emergency") {
    const mode=clean(body.mode,20),reason=clean(body.reason,1000),dryRun=body.dryRun!==false;
    if(!["pause","lockdown","nuclear","normal"].includes(mode) || reason.length<8) return reply(origin,{allowed:true,error:"Mode and a meaningful reason are required"},422);
    if(!dryRun && Deno.env.get("FTN_EMERGENCY_CONTROLS_ENABLED")!=="true") return reply(origin,{allowed:true,error:"Production emergency mutations are disabled; run a dry simulation"},409);
    const requested={mode,reason,requestedAt:new Date().toISOString()};
    if(!dryRun){const {error}=await admin.from("ftn_control_state").update({mode,reason,updated_by:user.id,updated_at:new Date().toISOString(),version:(current?.version||0)+1}).eq("singleton",true);if(error)return reply(origin,{allowed:true,error:"Control state was not changed"},500);}
    const {data:journal,error:journalError}=await admin.from("ftn_control_journal").insert({actor_id:user.id,action:"emergency",target:"platform",previous_state:current||{},requested_state:requested,reason,dry_run:dryRun,user_agent:clean(req.headers.get("user-agent"),500)}).select("id").single();
    if(journalError) return reply(origin,{allowed:true,error:"Control journal failed; no success claimed"},500);
    return reply(origin,{allowed:true,state:dryRun?(current?.mode||"normal"):mode,simulated:dryRun,journalId:journal.id});
  }
  if(action==="product-control") {
    const productId=clean(body.productId,80),reason=clean(body.reason,1000),requested={enabled:body.enabled!==false,status:clean(body.status,20),routing_priority:Number(body.routingPriority||100),usage_limit:body.usageLimit&&typeof body.usageLimit==="object"?body.usageLimit:{}};
    if(!/^[a-z0-9-]{2,80}$/.test(productId)||!["LIVE","BETA","MAINTENANCE","PRIVATE","PHASE 2"].includes(requested.status)||reason.length<8)return reply(origin,{allowed:true,error:"Valid product state and reason required"},422);
    const {data:before}=await admin.from("ftn_product_controls").select("*").eq("product_id",productId).maybeSingle();
    const {error}=await admin.from("ftn_product_controls").upsert({product_id:productId,...requested,reason,updated_by:user.id,updated_at:new Date().toISOString()});if(error)return reply(origin,{allowed:true,error:"Product control was not changed"},500);
    const {data:journal}=await admin.from("ftn_control_journal").insert({actor_id:user.id,action:"product-control",target:productId,previous_state:before||{},requested_state:requested,reason,dry_run:false,user_agent:clean(req.headers.get("user-agent"),500)}).select("id").single();
    return reply(origin,{allowed:true,productId,state:requested,journalId:journal?.id||null});
  }
  return reply(origin,{allowed:true,error:"Unknown owner action"},400);
});
