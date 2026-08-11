// FTN Platform — ibis.ai server route.
// The Gemini credential stays in Supabase secrets; it must never be exposed to the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const windows = new Map<string, { count: number; resetAt: number }>();

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://ftnplatform.org",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function reply(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

function withinLimit(ip: string) {
  const now = Date.now();
  const current = windows.get(ip);
  if (!current || current.resetAt <= now) {
    windows.set(ip, { count: 1, resetAt: now + 5 * 60_000 });
    return true;
  }
  if (current.count >= 24) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")||"";
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!supabaseUrl||!serviceRole)return reply({error:"ibis identity verification is not configured."},503,origin);
  const authClient=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userError}=await authClient.auth.getUser(token);
  if(userError||!userData?.user)return reply({ error: "Sign in to use ibis AI." }, 401, origin);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "Please wait a few minutes before trying again." }, 429, origin);

  let payload: { prompt?: unknown; country?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  const country = typeof payload.country === "string" ? payload.country.trim().slice(0, 80) : "Caribbean";
  if (!prompt || prompt.length > 2_000) return reply({ error: "Enter a request between 1 and 2,000 characters." }, 400, origin);

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return reply({ error: "ibis AI is not configured yet." }, 503, origin);
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  const instruction = [
    "You are ibis.ai, FTN Platform's Caribbean-first intelligence assistant.",
    "Answer plainly and concisely. You are not a source of live facts: do not invent figures, news, laws, events, links, citations, or personal details.",
    "Separate verified FTN-provided information from suggestions. If the request needs live or local evidence, say what source category should be checked.",
    "Never give legal, medical, financial, or emergency instructions as a substitute for a qualified local professional or official service.",
    "Use Caribbean context only when it is relevant. User country context: " + country + ".",
    "Offer at most three practical next actions and mention an FTN product only when it genuinely fits.",
    "Do not claim you performed an FTN action, searched the web, or accessed private data unless the prompt explicitly supplies those results.",
  ].join(" ");

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Gemini request failed", upstream.status, data?.error?.message || "unknown error");
      return reply({ error: "ibis AI is temporarily unavailable." }, 502, origin);
    }
    const answer = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (!answer) return reply({ error: "ibis did not return an answer. Please try again." }, 502, origin);
    return reply({ answer, provider: "Gemini", model, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis server error", error);
    return reply({ error: "ibis AI is temporarily unavailable." }, 502, origin);
  }
});
