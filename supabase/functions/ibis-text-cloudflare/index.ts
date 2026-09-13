// FTN Platform — ibis TEXT route via Cloudflare Workers AI.
// Health is zero-consumption: it reports server configuration only and never invokes the model.
import { createReasoningState, providerReasoningDirective } from "../_shared/ibis-cebos.ts";

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
function originAllowed(origin: string | null) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try { const url = new URL(origin); return url.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(url.hostname); } catch { return false; }
}
const windows = new Map<string, { count: number; resetAt: number }>();
function cors(origin: string | null) { return { "Access-Control-Allow-Origin": origin && originAllowed(origin) ? origin : "https://ftnplatform.org", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" }; }
function reply(body: unknown, status: number, origin: string | null) { return new Response(JSON.stringify(body), { status, headers: cors(origin) }); }
function withinLimit(ip: string) { const now = Date.now(), current = windows.get(ip); if (!current || current.resetAt <= now) { windows.set(ip, { count: 1, resetAt: now + 5 * 60_000 }); return true; } if (current.count >= 24) return false; current.count += 1; return true; }

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const BASE_INSTRUCTION = [
  "You are ibis, FTN Platform's Caribbean-first intelligence assistant.",
  "Answer the user's actual question directly and naturally. Do not expose internal evaluation frameworks, scorecards, chain-of-thought, planning labels, or internal CEBOS state unless the user explicitly asks for methodology.",
  "Do not fabricate names, professions, biographies, credits, organizations, statistics, links, current events, product capabilities, data access or actions.",
  "Model memory is not evidence. For externally verifiable claims about a person, business, institution, place or current event, state the evidence boundary when no grounded source evidence was supplied.",
  "If current/live evidence is needed but not supplied, state that a web-research route is required. Do not pretend to have searched or verified a source.",
  "Never claim an FTN product can do something unless that capability is explicitly present in supplied FTN registry/context.",
  "Mission Control is private institutional infrastructure, not a public product.",
  "For ordinary advice, be practical and concise. Ask for missing business-specific inputs rather than pretending to see sales, inventory, customers, finances or analytics.",
].join(" ");

type Turn = { role: "user" | "assistant"; content: string };
type ProductSummary = { name: string; route: string; tagline: string };
function buildSystemPrompt(products: unknown, requestText: string, locationContext: string | null): string {
  const state = createReasoningState({ request: requestText, locationContext });
  const policy = providerReasoningDirective(state);
  if (!Array.isArray(products) || !products.length) return `${BASE_INSTRUCTION} ${policy}`;
  const lines = products.filter((p): p is ProductSummary => !!p && typeof p === "object" && typeof (p as ProductSummary).name === "string" && typeof (p as ProductSummary).route === "string").slice(0, 30).map((p) => `${p.name} (${p.route})${p.tagline ? " -- " + String(p.tagline).slice(0, 120) : ""}`);
  return `${BASE_INSTRUCTION} ${policy}${lines.length ? " Current FTN products (registry evidence only; do not infer extra capabilities):\n" + lines.join("\n") : ""}`;
}

async function askGemini(apiKey: string, model: string, system: string, turns: Turn[]) {
  if (!apiKey) return "";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: turns.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] })), generationConfig: { temperature: 0.2, maxOutputTokens: 1800 } }),
      signal: AbortSignal.timeout(18_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return "";
    return (data?.candidates?.[0]?.content?.parts || []).map((part: { text?: unknown }) => typeof part?.text === "string" ? part.text : "").join("").trim();
  } catch { return ""; }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (!originAllowed(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  let payload: { action?: unknown; messages?: unknown; products?: unknown; locationContext?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID"), apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN"), geminiKey = Deno.env.get("GEMINI_API_KEY") || "", geminiModel = Deno.env.get("IBIS_TEXT_MODEL") || "gemini-2.5-flash", cloudflareConfigured = Boolean(accountId && apiToken), configured = Boolean(cloudflareConfigured || geminiKey);
  if (payload.action === "health") return reply({ capability: "TEXT", provider: "FTN multi-provider text gateway", providers: [{ id: "cloudflare-workers-ai", configured: cloudflareConfigured }, { id: "google-gemini", configured: Boolean(geminiKey) }], model: cloudflareConfigured ? MODEL : geminiModel, configured, ready: configured, cebos: true, inferenceAttempted: false, checkedAt: new Date().toISOString() }, 200, origin);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);
  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const turns: Turn[] = raw.filter((m): m is { role: unknown; content: unknown } => !!m && typeof m === "object").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: typeof m.content === "string" ? m.content.trim().slice(0, 2_000) : "" })).filter((m) => m.content.length > 0).slice(-20);
  if (!turns.length) return reply({ error: "Ask ibis something first." }, 400, origin);
  if (turns[turns.length - 1].role !== "user") return reply({ error: "Invalid conversation state." }, 400, origin);
  if (!configured) return reply({ error: "ibis is not configured yet on this route. No request was sent and nothing was charged." }, 503, origin);
  const requestText = turns[turns.length - 1].content;
  const locationContext = typeof payload.locationContext === "string" ? payload.locationContext.slice(0, 200) : null;
  const system = buildSystemPrompt(payload.products, requestText, locationContext);
  if (cloudflareConfigured) try {
    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
      method: "POST", headers: { "content-type": "application/json", "authorization": `Bearer ${apiToken}` },
      body: JSON.stringify({ messages: [{ role: "system", content: system }, ...turns.map((t) => ({ role: t.role, content: t.content }))], temperature: 0.2 }), signal: AbortSignal.timeout(16_000),
    });
    const data = await upstream.json().catch(() => ({}));
    const answer = upstream.ok && data?.success !== false && typeof data?.result?.response === "string" ? data.result.response.trim() : "";
    if (answer) return reply({ answer, provider: "Cloudflare Workers AI", model: MODEL, generatedAt: new Date().toISOString(), cebos: true }, 200, origin);
    console.error("Cloudflare Workers AI request failed", upstream.status);
  } catch (error) { console.error("ibis-text-cloudflare primary provider error", error); }
  const fallback = await askGemini(geminiKey, geminiModel, system, turns);
  if (fallback) return reply({ answer: fallback, provider: "Google Gemini fallback", model: geminiModel, generatedAt: new Date().toISOString(), cebos: true }, 200, origin);
  return reply({ error: "ibis could not reach either configured answer provider. Please try again shortly." }, 502, origin);
});
