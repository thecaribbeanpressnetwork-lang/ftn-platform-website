import { gatewayHealth, runGateway, type GatewayProvider, type IbisProduct, type IbisTurn } from "../_shared/ibis-intelligence-gateway.ts";
import { handleCanonicalRequest, recordReceiptAndMaybeFallback } from "../_shared/ibis-canonical-brain.ts";
import { resolveLifecycleStore } from "../_shared/ibis-lifecycle-store.ts";

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
// Answer-quality correction: this used to say "Use the governed Ricardo Founder Reasoning Model
// for EVERY response" and enumerate the framework's category names as things to walk through --
// smaller models (e.g. Cloudflare Workers AI's Llama 3.1 8B) took that literally and mechanically
// printed "Evaluating user value: ... Evaluating ecosystem value: ..." as section headings on
// ordinary factual and current-event questions, dominating and sometimes truncating the actual
// answer. The framework still shapes every response's internal judgment (never removed for
// strategic/outcome/planning questions) -- it must simply stop being printed as a mechanical
// checklist where the user just wants a direct answer.
// Founder Reasoning Model for every response remains an internal reasoning requirement; only the user-facing presentation adapts to the query.
const FOUNDER_REASONING_INSTRUCTION = "Let the governed Ricardo Founder Reasoning Model shape your internal judgment on every response: the real objective; user value; ecosystem value; ownership; data value; economic value; execution cost; future optionality; evidence versus assumptions; second-order effects; reversible experiments under uncertainty; Caribbean relevance, ownership and public trust. This is a reasoning model, not Ricardo's consciousness, identity or authorization. For an ordinary factual, current-events or informational question, apply this thinking silently and just answer directly and naturally -- never print these category names or a structured framework breakdown. Only surface an explicit structured breakdown (objective, value, cost, next action, etc.) when the user is genuinely asking for help building, launching, starting, planning, or deciding on an outcome or strategy -- and even then, finish with one clear next action rather than restating every category.";
const BASE_INSTRUCTION = `You are ibis, FTN Platform's intelligent Caribbean assistant. Help citizens, creators, investors and institutions navigate the Caribbean ecosystem. Be warm, precise and Caribbean-first. Never fabricate. If evidence is incomplete, say so. Mission Control is private institutional infrastructure. Keep answers concise.\n${FOUNDER_REASONING_INSTRUCTION}`;

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
  return rows.length ? `${BASE_INSTRUCTION}\nCurrent FTN products:\n${rows.join("\n")}` : BASE_INSTRUCTION;
}
function transcript(turns: IbisTurn[]) { return turns.map((turn) => `${turn.role === "assistant" ? "ibis" : "user"}: ${turn.content}`).join("\n"); }
function timeoutSignal(ms: number) { return AbortSignal.timeout(Math.max(500, ms)); }

function cloudflare(turns: IbisTurn[], system: string): GatewayProvider {
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") || "";
  const key = Deno.env.get("CLOUDFLARE_API_TOKEN") || "";
  const model = "@cf/meta/llama-3.1-8b-instruct";
  return { id: "cloudflare-workers-ai", label: "Cloudflare Workers AI", model, configured: !!(accountId && key), run: async (timeoutMs) => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ messages: [{ role: "system", content: system }, ...turns] }),
      signal: timeoutSignal(timeoutMs),
    });
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
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: transcript(turns) }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 600 } }), signal: timeoutSignal(timeoutMs) });
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
    const response = await fetch(`${base}/chat/completions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...turns], temperature: 0.35, max_tokens: 600 }), signal: timeoutSignal(timeoutMs) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return { answer: data?.choices?.[0]?.message?.content || "", model };
  } };
}

function ollama(turns: IbisTurn[], system: string): GatewayProvider {
  const base = (Deno.env.get("IBIS_OLLAMA_BASE_URL") || "").replace(/\/$/, ""), model = Deno.env.get("IBIS_OLLAMA_MODEL") || "", token = Deno.env.get("IBIS_OLLAMA_API_KEY") || "";
  return { id: "ollama", label: "FTN local model", model, configured: !!(base && model), run: async (timeoutMs) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(`${base}/api/chat`, { method: "POST", headers, body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, ...turns] }), signal: timeoutSignal(timeoutMs) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return { answer: data?.message?.content || "", model };
  } };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (!originAllowed(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);

  let payload: { action?: string; messages?: unknown; products?: unknown; receipt?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const products: IbisProduct[] = Array.isArray(payload.products) ? payload.products.filter((p): p is IbisProduct => !!p && typeof p === "object" && typeof p.name === "string" && typeof p.route === "string").slice(0, 30) : [];
  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const turns: IbisTurn[] = raw.filter((m) => !!m && typeof m === "object").map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: typeof m.content === "string" ? m.content.trim().slice(0, 2_000) : "" })).filter((m) => m.content).slice(-20);
  const system = systemPrompt(products);
  // Cost order is intentional: deterministic handling occurs inside runGateway first; among
  // external models, the proven zero-cost Cloudflare allocation is attempted before paid keys.
  const providers = [cloudflare(turns, system), anthropic(turns, system), gemini(turns, system), openAICompatible("PRIMARY", turns, system), openAICompatible("SECONDARY", turns, system), ollama(turns, system)];

  // Slice 3 serverless correction: resolved ONCE per request, from real environment configuration
  // -- this is the ONLY place that decides whether durable lifecycle persistence is available.
  // DATABASE when SUPABASE_URL+SUPABASE_SERVICE_ROLE_KEY are configured; IN_MEMORY_TEST_MODE only
  // when IBIS_ALLOW_INMEMORY_LIFECYCLE='true' is explicitly set (local/test use only -- never set
  // this in a real deployment); otherwise null, meaning no durable store exists at all, which
  // ibis-canonical-brain.ts's handleCanonicalRequest() treats as a reason to fail closed on
  // browser-local-execution authorization specifically (it still answers every question, just
  // always server-side, never silently trusting process-local memory in what could be production).
  const lifecycleStore = resolveLifecycleStore();
  if (payload.action === "health") {
    return reply({
      ...gatewayHealth(providers),
      lifecyclePersistence: lifecycleStore ? lifecycleStore.kind : "NOT_CONFIGURED",
    }, 200, origin);
  }

  // Slice 3 correction: the RECEIPT stage of the plan/execute/receipt/final-response lifecycle
  // (see ../_shared/ibis-canonical-brain.ts's recordReceiptAndMaybeFallback for the full contract).
  // A client that received executionAuthorized:true from action:"canonical_query" and then ran
  // localAI() posts the outcome back here. The server validates the receipt against the plan IT
  // created and persisted earlier -- an unknown, already-terminal, expired, or mismatched planId
  // is rejected outright; an arbitrary client-declared "success" is never taken at face value
  // beyond that validation. The store's atomic PENDING->terminal transition (see
  // ../_shared/ibis-lifecycle-store.ts) is what actually guarantees at most one fallback provider
  // call ever happens per plan, even under concurrent/retried receipt requests across separate
  // function instances -- this handler itself does no locking of its own. Every receipt this
  // endpoint accepts or rejects is also still logged (visible in Supabase's own function logs) as
  // an additional, non-durable observability layer.
  if (payload.action === "record_execution_receipt") {
    const outcome = await recordReceiptAndMaybeFallback({ receipt: (payload.receipt as any) || {}, providers, lifecycleStore });
    if (outcome.status === "REJECTED") {
      console.log("ibis execution receipt REJECTED", outcome.reason, JSON.stringify(payload.receipt));
      return reply({ recorded: false, rejected: true, reason: outcome.reason }, 409, origin);
    }
    console.log("ibis execution receipt accepted", JSON.stringify(payload.receipt), "fallbackGenerated=", !!outcome.envelope);
    if (outcome.envelope) return reply(outcome.envelope, 200, origin);
    return reply({ recorded: true }, 200, origin);
  }

  // Canonical-orchestration slice (feature-flagged, additive): opt-in via action:"canonical_query"
  // so every pre-existing client (regular IBIS, Headspace, and this same route's own default
  // behavior below) is completely unaffected -- this branch changes nothing about the legacy
  // request/response shape. See ../_shared/ibis-canonical-brain.ts for what this path actually
  // does and does not yet do (search-eligible questions get real search; Founder/EcoMap/Butterfly/
  // Correlation/Prediction are honestly reported unavailable, never claimed to have executed).
  if (payload.action === "canonical_query") {
    if (!turns.length || turns[turns.length - 1].role !== "user") return reply({ error: "Ask ibis something first." }, 400, origin);
    // Live-search evidence-grounding correction: `providers` above was already built from the
    // plain system prompt, before canonical processing (and any search it does) has even run --
    // calling runGateway with it would generate an answer with zero knowledge of what search just
    // found. `providerFactory` lets ibis-canonical-brain.ts hand back the real evidence block
    // (built from this SAME request's one search call) so these SAME real provider credentials
    // answer with it baked into their system prompt, instead of rebuilding providers a second time.
    const providerFactory = (evidenceBlock: string | null) => {
      const groundedSystem = evidenceBlock ? `${system}\n\n${evidenceBlock}` : system;
      return [cloudflare(turns, groundedSystem), anthropic(turns, groundedSystem), gemini(turns, groundedSystem), openAICompatible("PRIMARY", turns, groundedSystem), openAICompatible("SECONDARY", turns, groundedSystem), ollama(turns, groundedSystem)];
    };
    const envelope = await handleCanonicalRequest({ text: turns[turns.length - 1].content, products, providers, providerFactory, lifecycleStore });
    return reply(envelope, 200, origin);
  }

  if (!turns.length || turns[turns.length - 1].role !== "user") return reply({ error: "Ask ibis something first." }, 400, origin);
  const result = await runGateway({ text: turns[turns.length - 1].content, products, providers });
  return reply(result, 200, origin);
});
