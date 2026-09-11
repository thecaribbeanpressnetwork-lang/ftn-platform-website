import { gatewayHealth, runGateway, type GatewayProvider, type IbisProduct, type IbisTurn } from "../_shared/ibis-intelligence-gateway.ts";
import { createReasoningState, providerReasoningDirective, type CebosEvidence } from "../_shared/ibis-cebos.ts";

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
function originAllowed(origin: string | null) { if (!origin) return true; if (allowedOrigins.has(origin)) return true; try { const url = new URL(origin); return url.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(url.hostname); } catch { return false; } }
const windows = new Map<string, { count: number; resetAt: number }>();
const BASE_INSTRUCTION = [
  "You are ibis, FTN Platform's intelligent Caribbean assistant.",
  "Answer the user's actual question directly and naturally. Strategic reasoning is internal: never expose scorecards, hidden planning labels, chain-of-thought, or internal frameworks unless the user explicitly asks for methodology.",
  "Never fabricate names, professions, biographies, credits, organizations, statistics, links, current events, product capabilities, data access, or actions.",
  "A model's memory is not evidence. Factual claims about people, current events, businesses, institutions or other externally verifiable subjects must be bounded by supplied evidence; otherwise state what remains unverified.",
  "Never claim an FTN product can perform an action unless that capability is explicitly present in supplied registry/context.",
  "Mission Control is private institutional infrastructure, not a public product.",
  "For planning/business advice, use only user-supplied facts and grounded evidence; never pretend to see private sales, inventory, customers, finances, analytics, messages, files or accounts.",
  "Be concise, useful, explicit about uncertainty, and end on the highest-value next action when one is clear."
].join(" ");

function cors(origin: string | null) { return { "Access-Control-Allow-Origin": origin && originAllowed(origin) ? origin : "https://ftnplatform.org", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" }; }
function reply(body: unknown, status: number, origin: string | null) { return new Response(JSON.stringify(body), { status, headers: cors(origin) }); }
function withinLimit(ip: string) { const now = Date.now(), current = windows.get(ip); if (!current || current.resetAt <= now) { windows.set(ip, { count: 1, resetAt: now + 5 * 60_000 }); return true; } if (current.count >= 24) return false; current.count += 1; return true; }
function transcript(turns: IbisTurn[]) { return turns.map((turn) => `${turn.role === "assistant" ? "ibis" : "user"}: ${turn.content}`).join("\n"); }
function timeoutSignal(ms: number) { return AbortSignal.timeout(Math.max(500, ms)); }
function sanitizedEvidence(raw: unknown): CebosEvidence[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => !!x && typeof x === "object" && typeof (x as any).claim === "string" && typeof (x as any).sourceClass === "string")
    .slice(0, 20).map((x: any, i) => ({
      id: String(x.id || `evidence-${i}`).slice(0, 100), claim: String(x.claim).slice(0, 1200), status: x.status || "UNRESOLVED", sourceClass: x.sourceClass,
      sourceUrl: typeof x.sourceUrl === "string" ? x.sourceUrl.slice(0, 1500) : null, publisher: typeof x.publisher === "string" ? x.publisher.slice(0, 200) : null,
      eventTime: x.eventTime || null, recordTime: x.recordTime || null, actorAccessTime: x.actorAccessTime || null, retrievedAt: x.retrievedAt || null,
      discoveryUtility: Number.isFinite(x.discoveryUtility) ? x.discoveryUtility : 0, decisionAuthority: Number.isFinite(x.decisionAuthority) ? x.decisionAuthority : 0,
      geographicRelevance: typeof x.geographicRelevance === "string" ? x.geographicRelevance.slice(0, 200) : null, contradictions: Array.isArray(x.contradictions) ? x.contradictions.slice(0, 6).map((v: unknown) => String(v).slice(0, 500)) : [],
    })) as CebosEvidence[];
}
function evidencePrompt(evidence: CebosEvidence[]) {
  if (!evidence.length) return "";
  return "\nGrounding evidence supplied for this request (use only for claims it actually supports; preserve contradictions and status):\n" + evidence.map((e, i) => `${i + 1}. [${e.status}/${e.sourceClass}] ${e.claim}${e.publisher ? ` — ${e.publisher}` : ""}${e.sourceUrl ? ` — ${e.sourceUrl}` : ""}`).join("\n");
}
function systemPrompt(products: IbisProduct[], requestText: string, locationContext: string | null, evidence: CebosEvidence[]) {
  const rows = products.slice(0, 30).map((p) => `${p.name} (${p.route})${p.tagline ? " — " + p.tagline.slice(0, 120) : ""}`);
  const state = createReasoningState({ request: requestText, locationContext });
  return `${BASE_INSTRUCTION}\n${providerReasoningDirective(state)}${rows.length ? `\nCurrent FTN products (registry evidence only; do not infer capabilities beyond these records):\n${rows.join("\n")}` : ""}${evidencePrompt(evidence)}`;
}

function cloudflare(turns: IbisTurn[], system: string): GatewayProvider {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "", key = Deno.env.get("CLOUDFLARE_API_TOKEN") || "", model = "@cf/meta/llama-3.1-8b-instruct";
  return { id: "cloudflare-workers-ai", label: "Cloudflare Workers AI", model, configured: !!(accountId && key), run: async (timeoutMs) => { const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ messages: [{ role: "system", content: system }, ...turns], temperature: 0.2 }), signal: timeoutSignal(timeoutMs) }); const data = await response.json().catch(() => ({})); if (!response.ok || data?.success === false) throw new Error(`HTTP_${response.status}`); return { answer: data?.result?.response || "", model }; } };
}
function anthropic(turns: IbisTurn[], system: string): GatewayProvider {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || "", model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
  return { id: "anthropic", label: "Anthropic", model, configured: !!key, run: async (timeoutMs) => { const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 800, system, messages: turns }), signal: timeoutSignal(timeoutMs) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`HTTP_${response.status}`); const answer = Array.isArray(data?.content) ? data.content.map((block: { type?: string; text?: string }) => block?.type === "text" ? block.text || "" : "").join("") : ""; return { answer, model }; } };
}
function gemini(turns: IbisTurn[], system: string): GatewayProvider {
  const key = Deno.env.get("GEMINI_API_KEY") || "", model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  return { id: "gemini", label: "Google Gemini", model, configured: !!key, run: async (timeoutMs) => { const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: transcript(turns) }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 800 } }), signal: timeoutSignal(timeoutMs) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`HTTP_${response.status}`); const answer = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || ""; return { answer, model }; } };
}
function openAICompatible(slot: "PRIMARY" | "SECONDARY", turns: IbisTurn[], system: string): GatewayProvider {
  const prefix = slot === "PRIMARY" ? "IBIS_OPENAI_COMPAT" : "IBIS_OPENAI_COMPAT_2", base = (Deno.env.get(`${prefix}_BASE_URL`) || "").replace(/\/$/, ""), key = Deno.env.get(`${prefix}_API_KEY`) || "", model = Deno.env.get(`${prefix}_MODEL`) || "", label = Deno.env.get(`${prefix}_PROVIDER`) || `OpenAI-compatible ${slot.toLowerCase()}`;
  return { id: prefix.toLowerCase(), label, model, configured: !!(base && key && model), run: async (timeoutMs) => { const response = await fetch(`${base}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...turns], temperature: 0.2, max_tokens: 800 }), signal: timeoutSignal(timeoutMs) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`HTTP_${response.status}`); return { answer: data?.choices?.[0]?.message?.content || "", model }; } };
}
function ollama(turns: IbisTurn[], system: string): GatewayProvider {
  const base = (Deno.env.get("IBIS_OLLAMA_BASE_URL") || "").replace(/\/$/, ""), model = Deno.env.get("IBIS_OLLAMA_MODEL") || "", token = Deno.env.get("IBIS_OLLAMA_API_KEY") || "";
  return { id: "ollama", label: "FTN local model", model, configured: !!(base && model), run: async (timeoutMs) => { const headers: Record<string, string> = { "content-type": "application/json" }; if (token) headers.authorization = `Bearer ${token}`; const response = await fetch(`${base}/api/chat`, { method: "POST", headers, body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, ...turns] }), signal: timeoutSignal(timeoutMs) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`HTTP_${response.status}`); return { answer: data?.message?.content || "", model }; } };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (!originAllowed(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"; if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);
  let payload: { action?: string; messages?: unknown; products?: unknown; evidence?: unknown; locationContext?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const products: IbisProduct[] = Array.isArray(payload.products) ? payload.products.filter((p): p is IbisProduct => !!p && typeof p === "object" && typeof (p as any).name === "string" && typeof (p as any).route === "string").slice(0, 30) : [];
  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const turns: IbisTurn[] = raw.filter((m) => !!m && typeof m === "object").map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: typeof m.content === "string" ? m.content.trim().slice(0, 2_000) : "" })).filter((m) => m.content).slice(-20);
  const evidence = sanitizedEvidence(payload.evidence), locationContext = typeof payload.locationContext === "string" ? payload.locationContext.slice(0, 200) : null;
  const currentText = turns[turns.length - 1]?.content || "";
  const system = systemPrompt(products, currentText, locationContext, evidence);
  const providers = [cloudflare(turns, system), anthropic(turns, system), gemini(turns, system), openAICompatible("PRIMARY", turns, system), openAICompatible("SECONDARY", turns, system), ollama(turns, system)];
  if (payload.action === "health") return reply(gatewayHealth(providers), 200, origin);
  if (!turns.length || turns[turns.length - 1].role !== "user") return reply({ error: "Ask ibis something first." }, 400, origin);
  const result = await runGateway({ text: currentText, products, providers, evidence, locationContext });
  return reply(result, 200, origin);
});
