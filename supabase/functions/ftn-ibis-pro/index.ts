import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const allowed=new Set(["https://ftnplatform.org","https://www.ftnplatform.org"]);
const headers=(origin:string|null)=>({"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin&&allowed.has(origin)?origin:"https://ftnplatform.org","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","cache-control":"no-store","vary":"Origin"});
const reply=(origin:string|null,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
const clean=(value:unknown,max=240)=>typeof value==="string"?value.trim().slice(0,max):"";

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST"||(origin&&!allowed.has(origin)))return reply(origin,{error:"Not allowed"},403);
  const url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!url||!service)return reply(origin,{error:"FTN ibis Pro is unavailable"},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),{data:userData,error:userError}=await admin.auth.getUser(token),user=userData?.user;
  if(userError||!user)return reply(origin,{error:"Sign in to use FTN ibis Pro"},401);
  const {data:entitlement}=await admin.from("ftn_ibis_entitlements").select("ends_at").eq("user_id",user.id).eq("status","ACTIVE").gt("ends_at",new Date().toISOString()).order("ends_at",{ascending:false}).limit(1).maybeSingle();
  if(!entitlement)return reply(origin,{error:"An active FTN ibis Pro pass is required",code:"PRO_REQUIRED"},402);
  let body:any={};try{body=await req.json();}catch{return reply(origin,{error:"Invalid request"},400);}const action=clean(body.action,40);
  if(action==="list-watches"){const {data,error}=await admin.from("ftn_ibis_watchlists").select("id,name,query,markets,active,created_at,updated_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50);return error?reply(origin,{error:"Watchlist unavailable"},503):reply(origin,{watches:data||[],proEndsAt:entitlement.ends_at});}
  if(action==="save-watch"){const name=clean(body.name,120),query=clean(body.query,240),markets=Array.isArray(body.markets)?body.markets.map((v:unknown)=>clean(v,40)).filter(Boolean).slice(0,8):[];if(!name||query.length<2)return reply(origin,{error:"Watch name and query are required"},422);const {data,error}=await admin.from("ftn_ibis_watchlists").insert({user_id:user.id,name,query,markets}).select("id,name,query,markets,active,created_at").single();return error?reply(origin,{error:"Watch could not be saved"},500):reply(origin,{watch:data},201);}
  if(action==="delete-watch"){const id=clean(body.id,40);if(!/^[0-9a-f-]{36}$/i.test(id))return reply(origin,{error:"Valid watch ID required"},422);const {error}=await admin.from("ftn_ibis_watchlists").delete().eq("id",id).eq("user_id",user.id);return error?reply(origin,{error:"Watch could not be deleted"},500):reply(origin,{ok:true});}
  if(action==="capital-brief"){
    const query=clean(body.query,240);if(query.length<2)return reply(origin,{error:"Describe the capital or partnership need"},422);
    const source=await fetch("https://ftnplatform.org/ibis/international-capital/landscape.json",{headers:{accept:"application/json"},signal:AbortSignal.timeout(8000)});
    if(!source.ok)return reply(origin,{error:"Capital registry is temporarily unavailable"},503);const landscape=await source.json(),tokens=query.toLowerCase().split(/[^a-z0-9]+/).filter((v:string)=>v.length>2);
    const records=(Array.isArray(landscape.records)?landscape.records:[]).map((record:any)=>{const hay=JSON.stringify(record).toLowerCase(),score=tokens.reduce((n:string[],t:string)=>n+(hay.includes(t)?1:0),0)+(record.decision==="PRIORITY"?2:record.decision==="PARTNER"?1:0);return{record,score};}).sort((a:any,b:any)=>b.score-a.score).slice(0,8).map((item:any)=>item.record);
    return reply(origin,{query,generatedAt:new Date().toISOString(),proEndsAt:entitlement.ends_at,records,method:"Deterministic matching against founder-reviewed, source-linked records; verify live eligibility before applying."});
  }
  return reply(origin,{error:"Unknown Pro action"},400);
});

