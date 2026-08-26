// FTN Index Scout v1 — controlled Caribbean business discovery.
// Initial lane: Trinidad & Tobago accommodation. Discovery sources create candidates only;
// quality-gated candidates remain internal until first-party confirmation or another approved provenance gate.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const OVERPASS="https://overpass-api.de/api/interpreter";
const TERRITORY="TTO",VERTICAL="accommodation",SOURCE_KEY="osm-overpass-discovery";
const TIMEOUT_MS=25_000,MAX_RESULTS=250;
type OsmElement={type:"node"|"way"|"relation";id:number;lat?:number;lon?:number;center?:{lat?:number;lon?:number};tags?:Record<string,string>};
type Quality={status:"pass"|"review"|"reject";score:number;reasons:string[]};

function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,90)||"caribbean-business";}
async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");}
function overpassQuery(){return `[out:json][timeout:20];area["ISO3166-1"="TT"][admin_level=2]->.searchArea;(nwr["tourism"~"^(hotel|guest_house|hostel|motel|apartment|chalet|resort)$"](area.searchArea););out center tags ${MAX_RESULTS};`;}
async function fetchCandidates(){const response=await fetch(OVERPASS,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8","User-Agent":"FTN-Index-Scout/1.2 (https://ftnplatform.org/index/)"},body:new URLSearchParams({data:overpassQuery()}),signal:AbortSignal.timeout(TIMEOUT_MS)});if(!response.ok)throw new Error(`overpass_${response.status}`);const data=await response.json();return(Array.isArray(data?.elements)?data.elements:[]).slice(0,MAX_RESULTS) as OsmElement[];}
function candidateFields(tags:Record<string,string>,element:OsmElement){const location=element.center||{lat:element.lat,lon:element.lon};const raw:Record<string,unknown>={name:tags.name||"",description:tags.description||"",phone:tags["contact:phone"]||tags.phone||"",email:(tags["contact:email"]||tags.email||"").trim().toLowerCase().slice(0,320),website:tags["contact:website"]||tags.website||"",address:[tags["addr:housenumber"],tags["addr:street"],tags["addr:city"]].filter(Boolean).join(" "),locality:tags["addr:city"]||tags["addr:suburb"]||tags["addr:place"]||"",hours:tags.opening_hours||"",instagram:tags["contact:instagram"]||"",facebook:tags["contact:facebook"]||"",whatsapp:tags["contact:whatsapp"]||"",accommodationType:tags.tourism||"",bookingUrl:tags["contact:booking"]||"",latitude:location.lat??null,longitude:location.lon??null};return Object.fromEntries(Object.entries(raw).filter(([,value])=>value!==""&&value!==null&&value!==undefined));}
function qualityGate(name:string,fields:Record<string,unknown>):Quality{
  const reasons:string[]=[]; let score=45;
  const normalized=name.toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
  const context=`${normalized} ${String(fields.website||"").toLowerCase()} ${String(fields.description||"").toLowerCase()}`;
  const conflict=/\b(clinic|medical|doctor|dr\.?\s|dental|pharmacy|hospital|school|college|university|church|ministry|government office|police station)\b/i.test(context);
  if(normalized.replace(/\s/g,"").length<3)reasons.push("name-not-machine-usable");
  if(conflict)reasons.push("vertical-conflict");
  if(fields.email){score+=18;reasons.push("public-email");}
  if(fields.website){score+=14;reasons.push("website");}
  if(fields.phone||fields.whatsapp){score+=8;reasons.push("phone");}
  if(fields.address||fields.locality){score+=7;reasons.push("location-text");}
  if(fields.latitude!==undefined&&fields.longitude!==undefined){score+=5;reasons.push("coordinates");}
  if(fields.accommodationType){score+=5;reasons.push("vertical-tag");}
  score=Math.max(0,Math.min(100,score));
  if(reasons.includes("name-not-machine-usable")||conflict)return{status:"reject",score:Math.min(score,35),reasons};
  if(score>=70)return{status:"pass",score,reasons};
  return{status:"review",score,reasons:[...reasons,"insufficient-corroborating-fields"]};
}

Deno.serve(async(request)=>{
  if(request.method!=="POST")return reply({error:"Method not allowed"},405);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!supabaseUrl||!serviceRole)return reply({error:"Scout unavailable"},503);
  const db=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
  const supplied=request.headers.get("x-ftn-scout-secret")||"";
  const{data:secretRow}=await db.from("ftn_index_internal_settings").select("setting_value").eq("setting_key","scout_cron_secret").maybeSingle();
  if(!secretRow?.setting_value||supplied!==secretRow.setting_value)return reply({error:"Unauthorized"},401);

  const day=new Date().toISOString().slice(0,10),runKey=`${day}:${TERRITORY}:${VERTICAL}:${SOURCE_KEY}`;
  const{data:existing}=await db.from("ftn_index_scout_runs").select("status").eq("run_key",runKey).maybeSingle();
  if(existing?.status==="completed")return reply({ok:true,skipped:"already_completed",runKey});

  let elements:OsmElement[];
  try{elements=await fetchCandidates();}
  catch(error){const code=error instanceof Error?error.message.slice(0,80):"discovery_failed";await db.from("ftn_index_scout_runs").upsert({run_key:runKey,territory_code:TERRITORY,vertical:VERTICAL,source_key:SOURCE_KEY,status:"failed",started_at:new Date().toISOString(),completed_at:new Date().toISOString(),error_code:code},{onConflict:"run_key"});return reply({error:"Discovery source unavailable",runKey},502);}

  const candidates=[];
  for(const element of elements){
    const tags=element.tags||{},name=(tags.name||"").trim(); if(!name)continue;
    const fields=candidateFields(tags,element),quality=qualityGate(name,fields);
    const sourceObject=`${element.type}/${element.id}`,ftnId=`FTN-${TERRITORY}-BIZ-OSM-${element.type[0].toUpperCase()}${element.id}`;
    candidates.push({ftn_id:ftnId,slug:`${slugify(name)}-${(await sha256(ftnId)).slice(0,8)}`,name,subcategory:tags.tourism||null,source_object:sourceObject,source_url:`https://www.openstreetmap.org/${sourceObject}`,source_hash:await sha256(`${SOURCE_KEY}:${sourceObject}`),quality_status:quality.status,quality_score:quality.score,quality_reasons:quality.reasons,fields});
  }

  const{data,error}=await db.rpc("ftn_index_ingest_scout_candidates",{p_run_key:runKey,p_territory_code:TERRITORY,p_vertical:VERTICAL,p_source_key:SOURCE_KEY,p_candidates:candidates});
  if(error||!data?.ok){console.error("FTN Index Scout bulk ingest",error);return reply({error:"Scout ingestion failed",runKey},500);}
  return reply({...data,outreach:"blocked_until_free_transport_is_approved"});
});
