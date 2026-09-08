import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

const allowed = new Set(["https://ftnplatform.org","https://www.ftnplatform.org"]);
const windows = new Map<string,{start:number,count:number}>();
const headers=(origin:string|null)=>({"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin&&allowed.has(origin)?origin:"https://ftnplatform.org","access-control-allow-headers":"authorization,apikey,content-type","access-control-allow-methods":"POST,OPTIONS","cache-control":"no-store","vary":"Origin"});
const reply=(origin:string|null,body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,"0")).join("");
async function hmac(key:string,value:string){const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(value)));}
function limited(userId:string){const now=Date.now(),slot=windows.get(userId);if(!slot||now-slot.start>900_000){windows.set(userId,{start:now,count:1});return false;}slot.count++;return slot.count>5;}

Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=="POST"||(origin&&!allowed.has(origin)))return reply(origin,{error:"Not allowed"},403);
  const url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!url||!service)return reply(origin,{error:"Billing service is unavailable"},503);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await admin.auth.getUser(token),user=userData?.user;
  if(userError||!user)return reply(origin,{error:"Sign in to manage FTN ibis Pro"},401);
  let body:{action?:string,planId?:string}={};try{body=await req.json();}catch{return reply(origin,{error:"Invalid request"},400);}

  if(body.action==="status"){
    const now=new Date().toISOString();
    const {data:entitlement}=await admin.from("ftn_ibis_entitlements").select("plan_id,tier,status,starts_at,ends_at").eq("user_id",user.id).eq("status","ACTIVE").gt("ends_at",now).order("ends_at",{ascending:false}).limit(1).maybeSingle();
    return reply(origin,{tier:entitlement?"PRO":"STANDARD",entitlement:entitlement||null});
  }
  if(body.action!=="checkout"||body.planId!=="ibis-pro-30d")return reply(origin,{error:"Unknown billing action or plan"},422);
  if(limited(user.id))return reply(origin,{error:"Too many checkout attempts. Wait 15 minutes."},429);

  const {data:plan,error:planError}=await admin.from("ftn_ibis_plans").select("plan_id,name,tier,price_minor,currency,duration_days,active").eq("plan_id",body.planId).eq("active",true).single();
  if(planError||!plan||plan.tier!=="PRO"||plan.price_minor<=0)return reply(origin,{error:"This Pro plan is unavailable"},409);
  const businessId=Deno.env.get("WAM_BUSINESS_ID")||"",apiKey=Deno.env.get("WAM_API_KEY")||"",environment=Deno.env.get("WAM_ENVIRONMENT")==="production"?"production":"staging";
  if(!/^[0-9a-f-]{36}$/i.test(businessId)||!(/^[0-9a-f]{64}$/i.test(apiKey)||/^sk_test_[0-9a-f]+$/i.test(apiKey)))return reply(origin,{error:"WAM checkout is awaiting merchant connection; no charge was created",code:"WAM_NOT_CONFIGURED"},503);

  const orderId=crypto.randomUUID(),reference=`FTNIBIS-${Date.now()}-${orderId.slice(0,8)}`;
  const {error:orderError}=await admin.from("ftn_ibis_payment_orders").insert({id:orderId,user_id:user.id,plan_id:plan.plan_id,order_reference:reference,amount_minor:plan.price_minor,currency:plan.currency});
  if(orderError)return reply(origin,{error:"Checkout order could not be recorded"},500);
  const payload=JSON.stringify({amountCents:plan.price_minor,currency:plan.currency,orderReference:reference,description:plan.name,returnUrl:"https://ftnplatform.org/ibis/pricing/?checkout=return",metadata:{ftnOrderId:orderId,ftnPlanId:plan.plan_id,ftnUserId:user.id},idempotencyKey:reference});
  const timestamp=Math.floor(Date.now()/1000).toString(),signature=await hmac(apiKey,`${timestamp}.${payload}`),base=environment==="production"?"https://billing.wam.money":"https://staging.billing.wam.money";
  try{
    const upstream=await fetch(`${base}/api/public/payment-intents`,{method:"POST",headers:{"content-type":"application/json","X-WAM-Api-Key":apiKey,"X-WAM-Timestamp":timestamp,"X-WAM-Signature":signature},body:payload,signal:AbortSignal.timeout(20_000)});
    const result=await upstream.json().catch(()=>({})),intent=result?.data;
    const checkout=typeof intent?.checkoutUrl==="string"?intent.checkoutUrl:"";
    const safeCheckout=checkout.startsWith(`${base}/pay/`);
    if(!upstream.ok||!intent?.paymentId||!safeCheckout){await admin.from("ftn_ibis_payment_orders").update({status:"FAILED",updated_at:new Date().toISOString()}).eq("id",orderId);return reply(origin,{error:"WAM could not create checkout; no FTN Pro access was granted",code:result?.code||"WAM_CHECKOUT_FAILED"},502);}
    await admin.from("ftn_ibis_payment_orders").update({status:"CHECKOUT_READY",provider_payment_id:String(intent.paymentId),provider_invoice_id:intent.invoiceId?String(intent.invoiceId):null,checkout_expires_at:intent.expiresAt||null,updated_at:new Date().toISOString()}).eq("id",orderId);
    return reply(origin,{checkoutUrl:checkout,orderId,environment},201);
  }catch{await admin.from("ftn_ibis_payment_orders").update({status:"FAILED",updated_at:new Date().toISOString()}).eq("id",orderId);return reply(origin,{error:"WAM checkout timed out; no FTN Pro access was granted"},504);}
});
