import { gatewayHealth, runGateway, type GatewayProvider, type IbisProduct, type IbisTurn } from "../_shared/ibis-intelligence-gateway.ts";

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
function originAllowed(origin: string | null) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(url.hostname);
  } catch { return false; }
}
const windows = new Map<string, { count: number; resetAt: number }>();
const BASE_INSTRUCTION = [
  "You are ibis, FTN Platform's intelligent Caribbean assistant.",
  "Answer the user's actual question directly and naturally. Use strategic reasoning internally when useful, but never expose internal scorecards, planning labels, chain-of-thought, or headings such as User Value, Ecosystem Value, Ownership, Data Value, Economic Value, Execution Cost, Future Optionality, Challenge Weak Ideas, Assumptions, Reversible Experiments, Shared Infrastructure, or Second-Order Effects unless the user explicitly asks for that framework.",
  "Never fabricate names, professions, biographies, credits, organizations, statistics, links, current events, product capabilities, data access, or actions.",
  "A model's memory is not evidence. If a factual claim about a person, current event, local business, institution, or other externally verifiable subject is not grounded in evidence supplied to this request, state the uncertainty rather than inventing detail.",
  "If current or live evidence is needed but not supplied, say that a live-source route is required. Do not pretend to have searched or verified a source.",
  "Never claim an FTN product can perform an action unless that capability is explicitly present in the supplied product registry/context.",
  "Mission Control is private institutional infrastructure, not a public product.",
  "Use Caribbean context when relevant, without forcing Caribbean references into unrelated questions.",
  "For planning or business advice, reason from the user's stated facts and ask for missing inputs instead of pretending you can see private sales, inventory, customers, finances, analytics, messages, files, or accounts.",
  "Be concise, useful, and transparent about evidence boundaries."
].join(" ");

function cors(origin: string | null) {
  return { "Access-Control-Allow-Origin": origin && originAllowed(origin) ? origin : "https://ftnplatform.org", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin" };
}
function reply(body: unknown, status: number, origin: string | null) { return new Response(JSON.stringify(body), { status, headers: cors(origin) }); }
function withinLimit(ip: string) {
  const now = Date.now(), current = windows.get(ip);
  if (!current || current.resetAt <= now) { windows.set(ip, { count: 1, resetAt: now + 5 * 60_000 }); return true; }
  if (current.count >= 24) return false;
  current.count += 1; return true;
}
function systemPrompt(products: IbisProduct[]) {
  const rows = products.slice(0, 30).map((p) => `${p.name} (${p.route})${p.tagline ? " — " + p.tagline.slice(0, 120) : ""}`);
  return rows.length ? `${BASE_INSTRUCTION}\nCurrent FTN products (registry evidence only; do not infer capabilities beyond these records):\n${rows.join("\n")}` : BASE_INSTRUCTION;
}
function transcript(turns: IbisTurn[]) { return turns.map((turn) => `${turn.role === "assistant" ? "ibis" : "user"}: ${turn.content}`).join("\n"); }
function timeoutSignal(ms: number) { return AbortSignal.timeout(Math.max(500, ms)); }

function cloudflare(turns: IbisTurn[], system: string): GatewayProvider {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
  const key = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
  const model = "@cf/meta/llama-3.1-8b-instruct";
  return { id: "cloudflare-workers-ai", label: "Cloudflare Workers AI", model, configured: !!(accountId && key), run: async (timeoutMs) => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ messages: [{ role: "system", content: system }, ...turns], temperature: 0.2 }), signal: timeoutSignal(timeoutMs) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) throw new Error(`HTTP_${response.status}`);
    return { answer: data?.result?.response || "", model };
  } };
}
function anthropic(turns: IbisTurn[], system: string): GatewayProvider {
  const key = Deno.env.get("ANTHROPIC_API_KEY") || "", model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
  return { id: "anthropic", label: "Anthropic", model, configured: !!key, run: async (timeoutMs) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 600, system, messages: turns }), signal: timeoutSignal(timeoutMs) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const answer = Array.isArray(data?.content) ? data.content.map((block: { type?: string; text?: string }) => block?.type === "text" ? block.text || "" : "").join("") : "";
    return { answer, model };
  } };
}
function gemini(turns: IbisTurn[], system: string): GatewayProvider {
  const key = Deno.env.get("GEMINI_API_KEY") || "", model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  return { id: "gemini", label: "Google Gemini", model, configured: !!key, run: async (timeoutMs) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: transcript(turns) }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 600 } }), signal: timeoutSignal(timeoutMs) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const answer = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    return { answer, model };
  } };
}
function openAICompatible(slot: "PRIMARY" | "SECONDARY", turns: IbisTurn[], system: string): GatewayProvider {
  const prefix = slot === "PRIMARY" ? "IBIS_OPENAI_COMPAT" : "IBIS_OPENAI_COMPAT_2";
  const base = (Deno.env.get(`${prefix}_BASE_URL`) || "").replace(/\/$/, ""), key = Deno.env.get(`${prefix}_API_KEY`) || "", model = Deno.env.get(`${prefix}_MODEL`) || "", label = Deno.env.get(`${prefix}_PROVIDER`) || `OpenAI-compatible ${slot.toLowerCase()}`;
  return { id: prefix.toLowerCase(), label, model, configured: !!(base && key && model), run: async (timeoutMs) => {
    const response = await fetch(`${base}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...turns], temperature: 0.2, max_tokens: 600 }), signal: timeoutSignal(timeoutMs) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return { answer: data?.choices?.[0]?.message?.content || "", model };
  } };
}
function ollama(turns: IbisTurn[], system: string): GatewayProvider {
  const base = (Deno.env.get("IBIS_OLLAMA_BASE_URL") || "").replace(/\/$/, ""), model = Deno.env.get("IBIS_OLLAMA_MODEL") || "", token = Deno.env.get("IBIS_OLLAMA_API_KEY") || "";
  return { id: "ollama", label: "FTN local model", model, configured: !!(base && model), run: async (timeoutMs) => {
    const headers: Record<string, string> = { "content-type": "application/json" }; if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(`${base}/api/chat`, { method: "POST", headers, body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, ...turns] }), signal: timeoutSignal(timeoutMs) });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`HTTP_${response.status}`); return { answer: data?.message?.content || "", model };
  } };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (!originAllowed(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);
  let payload: { action?: string; messages?: unknown; products?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const products: IbisProduct[] = Array.isArray(payload.products) ? payload.products.filter((p): p is IbisProduct => !!p && typeof p === "object" && typeof p.name === "string" && typeof p.route === "string").slice(0, 30) : [];
  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const turns: IbisTurn[] = raw.filter((m) => !!m && typeof m === "object").map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: typeof m.content === "string" ? m.content.trim().slice(0, 2_000) : "" })).filter((m) => m.content).slice(-20);
  const system = systemPrompt(products);
  const providers = [cloudflare(turns, system), anthropic(turns, system), gemini(turns, system), openAICompatible("PRIMARY", turns, system), openAICompatible("SECONDARY", turns, system), ollama(turns, system)];
  if (payload.action === "health") return reply(gatewayHealth(providers), 200, origin);
  if (!turns.length || turns[turns.length - 1].role !== "user") return reply({ error: "Ask ibis something first." }, 400, origin);
  const result = await runGateway({ text: turns[turns.length - 1].content, products, providers });
  return reply(result, 200, origin);
});
