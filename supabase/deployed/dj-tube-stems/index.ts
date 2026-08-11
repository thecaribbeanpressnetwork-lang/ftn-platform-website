import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL_VERSION = "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({error:"POST required"}), {status:405,headers:{"content-type":"application/json"}});
  const token = Deno.env.get("REPLICATE_API_TOKEN");
  if (!token) return new Response(JSON.stringify({error:"Stem provider not configured",provider:"replicate",required_secret:"REPLICATE_API_TOKEN"}), {status:503,headers:{"content-type":"application/json"}});
  try {
    const body = await req.json();
    const audio = body.audio;
    if (!audio || !/^https:\/\//i.test(audio)) throw new Error("An authorized HTTPS audio URL is required");
    const input = {audio, model_name: body.model_name || "htdemucs", stem: body.stem || undefined, shifts: body.shifts ?? 1, overlap: body.overlap ?? 0.25, clip_mode:"rescale", mp3_bitrate:320, output_format:body.output_format || "mp3", float32:false};
    const r = await fetch("https://api.replicate.com/v1/predictions", {method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json","Prefer":"wait"},body:JSON.stringify({version:MODEL_VERSION,input})});
    const data = await r.json();
    return new Response(JSON.stringify(data),{status:r.status,headers:{"content-type":"application/json"}});
  } catch(e) { return new Response(JSON.stringify({error:String(e)}),{status:400,headers:{"content-type":"application/json"}}); }
});
