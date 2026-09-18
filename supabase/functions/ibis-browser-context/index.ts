import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { runGateway, type GatewayProvider, type IbisTurn } from "../_shared/ibis-intelligence-gateway.ts";

type BrowserSearchResult = {
  rank: number;
  title: string;
  url: string;
  snippet: string | null;
};

type BrowserSearchContext = {
  engine: "google" | "bing" | "duckduckgo" | "other";
  query: string | null;
  sourceUrl: string;
  capturedAt: string;
  captureMode: "USER_BROWSER" | "PASTED_URL";
  results: BrowserSearchResult[];
};

const FOUNDER_REASONING_INSTRUCTION = "Let the governed Ricardo Founder Reasoning Model shape your internal judgment on every response: the real objective; user value; ecosystem value; ownership; data value; economic value; execution cost; future optionality; evidence versus assumptions; second-order effects; reversible experiments under uncertainty; Caribbean relevance, ownership and public trust. This is a reasoning model, not Ricardo's consciousness, identity or authorization. For an ordinary factual, current-events or informational question, apply this thinking silently and just answer directly and naturally -- never print these category names or a structured framework breakdown. Only surface an explicit structured breakdown when the user is genuinely asking for help building, launching, starting, planning, or deciding on an outcome or strategy.\n\nNever name an internal lens or reasoning-category label in any grammatical position -- heading, aside, or plain sentence -- and never write a phrase like 'based on the evidence and X' or 'using X' where X is an internal category name. Saying 'based on the evidence' alone is fine -- just never attach an internal category name to it.";
const BASE_INSTRUCTION = `You are ibis, FTN Platform's intelligent Caribbean CEO/research assistant. You are not a search engine. You reason over evidence supplied by the user's browser and FTN's governed reasoning stack. Be precise, Caribbean-first and useful. Never fabricate. Distinguish search snippets from inspected full pages. Cite supplied results as [1], [2], etc. Never claim a snippet proves more than it says. If the evidence is incomplete or conflicting, say so. Keep ordinary factual answers direct.\n${FOUNDER_REASONING_INSTRUCTION}`;

function allowedOrigin(origin: string | null) {
  if (!origin) return true;
  if (origin === "https://ftnplatform.org" || origin === "https://www.ftnplatform.org") return true;
  if (/^chrome-extension:\/\/[a-p]{32}$/i.test(origin)) return true;
  if (/^moz-extension:\/\/[0-9a-f-]{16,}$/i.test(origin)) return true;
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function cors(origin: string | null) {
  return {
    "access-control-allow-origin": origin && allowedOrigin(origin) ? origin : "https://ftnplatform.org",
    "access-control-allow-headers": "authorization, apikey, content-type",
    "access-control-allow-methods": "POST,OPTIONS",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "Origin",
  };
}

function text(value: unknown, max: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeHttpsUrl(value: unknown, max = 1200) {
  try {
    const url = new URL(text(value, max));
    if (url.protocol !== "https:") return "";
    url.username = "";
    url.password = "";
    url.hash = "";
    for (const key of ["token", "access_token", "auth", "authorization", "code", "key", "api_key", "password", "session", "sid"]) {
      url.searchParams.delete(key);
    }
    return url.href.slice(0, max);
  } catch {
    return "";
  }
}

function parseContext(raw: unknown): BrowserSearchContext | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const engineRaw = text(input.engine, 32).toLowerCase();
  const engine = (["google", "bing", "duckduckgo", "other"] as const).includes(engineRaw as any)
    ? (engineRaw as BrowserSearchContext["engine"])
    : "other";
  const sourceUrl = safeHttpsUrl(input.sourceUrl);
  if (!sourceUrl) return null;
  const mode = input.captureMode === "PASTED_URL" ? "PASTED_URL" : "USER_BROWSER";
  const capturedAtRaw = text(input.capturedAt, 64);
  const capturedAt = /^\d{4}-\d{2}-\d{2}T/.test(capturedAtRaw) ? capturedAtRaw : new Date().toISOString();
  const query = text(input.query, 220) || null;
  const seen = new Set<string>();
  const results: BrowserSearchResult[] = [];
  const rows = Array.isArray(input.results) ? input.results.slice(0, 20) : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const url = safeHttpsUrl(r.url);
    const title = text(r.title, 240);
    if (!url || !title || seen.has(url)) continue;
    seen.add(url);
    results.push({
      rank: results.length + 1,
      title,
      url,
      snippet: text(r.snippet, 650) || null,
    });
    if (results.length >= 10) break;
  }
  if (!results.length) return null;
  return { engine, query, sourceUrl, capturedAt, captureMode: mode, results };
}

function evidenceBlock(context: BrowserSearchContext) {
  const rows = context.results.map((r) => [
    `[${r.rank}] ${r.title}`,
    `URL: ${r.url}`,
    `Snippet: ${r.snippet || "No snippet captured."}`,
  ].join("\n")).join("\n\n");
  return `USER-PROVIDED BROWSER SEARCH CONTEXT\nEngine: ${context.engine}\nSearch query: ${context.query || "not captured"}\nCaptured: ${context.capturedAt}\nSource page: ${context.sourceUrl}\nEvidence depth: SEARCH SNIPPET ONLY. These are visible search-result snippets captured locally after explicit user action. They are not full-page inspections. Use only what the snippets support and cite claims with [n].\n\n${rows}`;
}

function timeoutSignal(ms: number) {
  return AbortSignal.timeout(Math.max(500, ms));
}

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
  const key = Deno.env.get("ANTHROPIC_API_KEY") || "";
  // Correction (2026-09-18, Search Quality Gate pass): an earlier note here claimed
  // "claude-sonnet-4-6" was not a real Anthropic model id -- that was wrong. A live
  // ibis-provider-health-preview call after the credential was replaced with a funded,
  // workspace-scoped key confirmed state=HEALTHY, configuredModel=claude-sonnet-4-6,
  // configuredModelVisible=true, modelCount=11. The earlier HTTP 400s traced to the credential, not
  // the model name. See docs/deferred-content.md for the corrected record.
  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5";
  return { id: "anthropic", label: "Anthropic", model, configured: !!key, run: async (timeoutMs) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 700, system, messages: turns }),
      signal: timeoutSignal(timeoutMs),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const answer = Array.isArray(data?.content) ? data.content.map((block: { type?: string; text?: string }) => block?.type === "text" ? block.text || "" : "").join("") : "";
    return { answer, model };
  } };
}

function gemini(turns: IbisTurn[], system: string): GatewayProvider {
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
  return { id: "gemini", label: "Google Gemini", model, configured: !!key, run: async (timeoutMs) => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: turns.map((t) => `${t.role}: ${t.content}`).join("\n") }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
      }),
      signal: timeoutSignal(timeoutMs),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const answer = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    return { answer, model };
  } };
}

function openAICompatible(slot: "PRIMARY" | "SECONDARY", turns: IbisTurn[], system: string): GatewayProvider {
  const prefix = slot === "PRIMARY" ? "IBIS_OPENAI_COMPAT" : "IBIS_OPENAI_COMPAT_2";
  const base = (Deno.env.get(`${prefix}_BASE_URL`) || "").replace(/\/$/, "");
  const key = Deno.env.get(`${prefix}_API_KEY`) || "";
  const model = Deno.env.get(`${prefix}_MODEL`) || "";
  const label = Deno.env.get(`${prefix}_PROVIDER`) || `OpenAI-compatible ${slot.toLowerCase()}`;
  return { id: prefix.toLowerCase(), label, model, configured: !!(base && key && model), run: async (timeoutMs) => {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...turns], temperature: 0.35, max_tokens: 700 }),
      signal: timeoutSignal(timeoutMs),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return { answer: data?.choices?.[0]?.message?.content || "", model };
  } };
}

function ollama(turns: IbisTurn[], system: string): GatewayProvider {
  const base = (Deno.env.get("IBIS_OLLAMA_BASE_URL") || "").replace(/\/$/, "");
  const model = Deno.env.get("IBIS_OLLAMA_MODEL") || "";
  const token = Deno.env.get("IBIS_OLLAMA_API_KEY") || "";
  return { id: "ollama", label: "FTN local model", model, configured: !!(base && model), run: async (timeoutMs) => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const response = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, stream: false, messages: [{ role: "system", content: system }, ...turns] }),
      signal: timeoutSignal(timeoutMs),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return { answer: data?.message?.content || "", model };
  } };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: cors(origin) });
  if (!allowedOrigin(origin)) return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers: cors(origin) });

  let body: { question?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: cors(origin) });
  }

  const question = text(body.question, 1200);
  const context = parseContext(body.context);
  if (!question) return new Response(JSON.stringify({ error: "Ask ibis what you want to know about these results." }), { status: 400, headers: cors(origin) });
  if (!context) return new Response(JSON.stringify({ error: "No valid browser search results were supplied." }), { status: 400, headers: cors(origin) });

  const evidence = evidenceBlock(context);
  const system = `${BASE_INSTRUCTION}\n\n${evidence}`;
  const turns: IbisTurn[] = [{ role: "user", content: question }];
  const providers = [
    cloudflare(turns, system),
    anthropic(turns, system),
    gemini(turns, system),
    openAICompatible("PRIMARY", turns, system),
    openAICompatible("SECONDARY", turns, system),
    ollama(turns, system),
  ];

  try {
    const result = await runGateway({ text: question, products: [], providers });
    const sources = context.results.map((r) => ({
      title: r.title,
      publisher: context.engine,
      url: r.url,
      publishedAt: null,
      updatedAt: null,
      retrievedAt: context.capturedAt,
      snippet: r.snippet,
      evidenceDepth: "SNIPPET",
    }));
    return new Response(JSON.stringify({
      ...result,
      evidenceState: "USER_PROVIDED_WEB_CONTEXT",
      sources,
      browserContext: {
        engine: context.engine,
        query: context.query,
        sourceUrl: context.sourceUrl,
        capturedAt: context.capturedAt,
        captureMode: context.captureMode,
        resultCount: sources.length,
      },
      provenanceNotice: "Search-result snippets were captured locally from the user's browser after explicit action. ibis did not receive browser cookies or account credentials and did not treat snippets as full-page verification.",
    }), { status: 200, headers: cors(origin) });
  } catch (error) {
    console.error("ibis browser context error", error);
    return new Response(JSON.stringify({ error: "ibis could not analyze the supplied browser results right now." }), { status: 502, headers: cors(origin) });
  }
});
