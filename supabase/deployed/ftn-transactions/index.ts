import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED = new Set(["https://ftnplatform.org","https://www.ftnplatform.org"]);
const headers = (origin:string) => ({"Content-Type":"application/json","Access-Control-Allow-Origin":ALLOWED.has(origin)?origin:"https://ftnplatform.org","Access-Control-Allow-Headers":"content-type,x-ftn-turnstile","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin"});
const text = (v:unknown,n=5000) => typeof v === "string" ? v.trim().slice(0,n) : "";

Deno.serve(async (req:Request) => {
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=="POST" || !ALLOWED.has(origin)) return new Response(JSON.stringify({ok:false,error:"Not allowed"}),{status:403,headers:headers(origin)});
 const secret=Deno.env.get("TURNSTILE_SECRET_KEY");
 if(!secret) return new Response(JSON.stringify({ok:false,error:"Secure human verification is temporarily unavailable"}),{status:503,headers:headers(origin)});
 let body:any; try{body=await req.json();}catch{return new Response(JSON.stringify({ok:false,error:"Invalid request"}),{status:400,headers:headers(origin)});}
 const email=text(body.client_email,320), tool=text(body.tool_id,80), type=text(body.transaction_type,80), token=text(body.turnstile_token,4096);
 if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !tool || !type || body.authority_confirmed!==true || !token) return new Response(JSON.stringify({ok:false,error:"Required transaction fields or human verification are missing"}),{status:422,headers:headers(origin)});
 const fd=new FormData();fd.set("secret",secret);fd.set("response",token);const ip=req.headers.get("CF-Connecting-IP");if(ip)fd.set("remoteip",ip);
 let human=false; try{const vr=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body:fd});const out=await vr.json();human=out.success===true;}catch{human=false;}
 if(!human) return new Response(JSON.stringify({ok:false,error:"Human verification failed"}),{status:403,headers:headers(origin)});
 const transaction_id=`FTN-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
 const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const record={transaction_id,tool_id:tool,client_email:email,creator_name:text(body.creator_name,200)||null,work_title:text(body.work_title,300)||null,country:text(body.country,100)||null,transaction_type:type,authority_confirmed:true,human_verified:true,route:text(body.route,300)||null,payload:body.payload&&typeof body.payload==="object"?body.payload:{},founder_status:"FOUNDER_REVIEW",legal_version:text(body.legal_version,50)||null,source_origin:origin,user_agent:text(req.headers.get("user-agent"),500)||null};
 const {error}=await supabase.from("ftn_platform_transactions").insert(record); if(error){console.error(error);return new Response(JSON.stringify({ok:false,error:"Transaction could not be recorded"}),{status:500,headers:headers(origin)});}
 return new Response(JSON.stringify({ok:true,transaction_id,status:"FOUNDER_REVIEW"}),{status:201,headers:headers(origin)});
});
