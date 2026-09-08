import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const bytesToHex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,"0")).join("");
async function digest(value:string){return bytesToHex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)));}
async function sign(secret:string,value:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return bytesToHex(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value)));}
function equal(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const secret=Deno.env.get("WAM_WEBHOOK_SECRET")||"",url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!secret||!url||!service)return json({error:"Webhook is not configured"},503);
  const raw=await req.text(),timestamp=req.headers.get("x-wam-timestamp")||"",signature=(req.headers.get("x-wam-signature")||"").toLowerCase();
  const stamp=Number(timestamp),now=Math.floor(Date.now()/1000);
  if(!Number.isInteger(stamp)||Math.abs(now-stamp)>300||!/^[0-9a-f]{64}$/.test(signature)||!equal(signature,await sign(secret,`${timestamp}.${raw}`)))return json({error:"Invalid webhook signature"},401);
  let event:any;try{event=JSON.parse(raw);}catch{return json({error:"Invalid JSON"},400);}
  const eventId=typeof event.id==="string"?event.id.slice(0,255):"",type=typeof event.type==="string"?event.type.slice(0,100):"",data=event.data||{};
  if(!eventId||!type.startsWith("payment_intent."))return json({error:"Unsupported event"},422);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}}),hash=await digest(raw);
  const {error:insertError}=await admin.from("ftn_ibis_payment_events").insert({event_id:eventId,event_type:type,provider_payment_id:String(data.paymentId||"").slice(0,255)||null,payload_sha256:hash});
  if(insertError?.code==="23505")return json({ok:true,duplicate:true});
  if(insertError)return json({error:"Event ledger unavailable"},503);
  const fail=async(code:string,status=422)=>{await admin.from("ftn_ibis_payment_events").update({processing_status:"REJECTED",processed_at:new Date().toISOString(),error_code:code}).eq("event_id",eventId);return json({error:code},status);};
  const paymentId=String(data.paymentId||""),reference=String(data.merchantReference||"");
  let orderQuery=admin.from("ftn_ibis_payment_orders").select("id,user_id,plan_id,amount_minor,currency,status");
  if(/^[0-9a-f-]{36}$/i.test(paymentId))orderQuery=orderQuery.eq("provider_payment_id",paymentId);
  else if(/^FTNIBIS-[0-9]{13}-[0-9a-f]{8}$/i.test(reference))orderQuery=orderQuery.eq("order_reference",reference);
  else return await fail("INVALID_PAYMENT_REFERENCE");
  const {data:order}=await orderQuery.maybeSingle();
  if(!order)return await fail("ORDER_NOT_FOUND",404);
  const statusMap:Record<string,string>={"payment_intent.created":"PENDING","payment_intent.requires_payment_method":"CHECKOUT_READY","payment_intent.processing":"PROCESSING","payment_intent.succeeded":"SUCCEEDED","payment_intent.failed":"FAILED","payment_intent.canceled":"CANCELED","payment_intent.expired":"EXPIRED"};
  const next=statusMap[type];if(!next)return await fail("EVENT_NOT_ALLOWED");
  if(order.status==="SUCCEEDED"&&next!=="SUCCEEDED"){await admin.from("ftn_ibis_payment_events").update({processing_status:"PROCESSED",processed_at:new Date().toISOString(),error_code:"IGNORED_STATUS_REGRESSION"}).eq("event_id",eventId);return json({ok:true,ignored:true});}
  if(type==="payment_intent.succeeded"){
    if(Number(data.amountCents)!==order.amount_minor||String(data.currency)!==order.currency)return await fail("PAYMENT_MISMATCH");
    const {data:plan}=await admin.from("ftn_ibis_plans").select("duration_days,tier").eq("plan_id",order.plan_id).single();
    if(!plan||plan.tier!=="PRO"||!plan.duration_days)return await fail("PLAN_NOT_FULFILLABLE");
    const {data:existing}=await admin.from("ftn_ibis_entitlements").select("ends_at").eq("user_id",order.user_id).eq("plan_id",order.plan_id).maybeSingle();
    const base=existing&&new Date(existing.ends_at).getTime()>Date.now()?new Date(existing.ends_at):new Date(),ends=new Date(base.getTime()+plan.duration_days*86_400_000),nowIso=new Date().toISOString();
    const {error:entitlementError}=await admin.from("ftn_ibis_entitlements").upsert({user_id:order.user_id,plan_id:order.plan_id,tier:"PRO",status:"ACTIVE",starts_at:nowIso,ends_at:ends.toISOString(),source_order_id:order.id,updated_at:nowIso},{onConflict:"user_id,plan_id"});
    if(entitlementError){await admin.from("ftn_ibis_payment_events").update({processing_status:"FAILED",error_code:"ENTITLEMENT_WRITE_FAILED"}).eq("event_id",eventId);return json({error:"Fulfillment failed"},500);}
  }
  const nowIso=new Date().toISOString();
  await admin.from("ftn_ibis_payment_orders").update({status:next,completed_at:next==="SUCCEEDED"?nowIso:null,updated_at:nowIso}).eq("id",order.id);
  await admin.from("ftn_ibis_payment_events").update({processing_status:"PROCESSED",processed_at:nowIso}).eq("event_id",eventId);
  return json({ok:true});
});
