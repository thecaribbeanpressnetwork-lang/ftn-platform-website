// FTN Platform — ibis TEXT route via Cloudflare Workers AI (Phase 3 provider-fabric pass).
// The second real TEXT provider behind the ibis widget, alongside supabase/functions/
// ibis-assistant (Anthropic). Registered in js/ibis-provider-registry.js as
// "cloudflare-workers-ai-text", costToIbis: ZERO_COST_TO_IBIS -- Cloudflare's own documentation
// states the free 10,000-Neuron/day allocation fails closed with an error rather than billing
// past the cap, verified 2026-08-20 against https://developers.cloudflare.com/workers-ai/platform/pricing/.
// Same narrowly-scoped boundary as ibis-assistant: no auth, no other table or function touched.

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

// Same per-IP window shape as ibis-query and ibis-assistant.
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

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const BASE_INSTRUCTION = "You are ibis, FTN Platform's intelligent Caribbean assistant. You help citizens, creators, investors and institutions navigate the Caribbean ecosystem. You are warm, precise and Caribbean-first. You never fabricate. When you don't know something, you say so. Mission Control is private institutional infrastructure, not a public product -- do not offer it as a destination. Keep answers concise: a short paragraph or a few lines, not an essay.";

type Turn = { role: "user" | "assistant"; content: string };
type ProductSummary = { name: string; route: string; tagline: string };

function buildSystemPrompt(products: unknown): string {
  if (!Array.isArray(products) || !products.length) return BASE_INSTRUCTION;
  const lines = products
    .filter((p): p is ProductSummary => !!p && typeof p === "object" && typeof (p as ProductSummary).name === "string" && typeof (p as ProductSummary).route === "string")
    .slice(0, 30)
    .map((p) => `${p.name} (${p.route})${p.tagline ? " -- " + String(p.tagline).slice(0, 120) : ""}`);
  if (!lines.length) return BASE_INSTRUCTION;
  return BASE_INSTRUCTION + " Current FTN products:\n" + lines.join("\n");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);

  let payload: { messages?: unknown; products?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const turns: Turn[] = raw
    .filter((m): m is { role: unknown; content: unknown } => m && typeof m === "object")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.trim().slice(0, 2_000) : "",
    }))
    .filter((m) => m.content.length > 0)
    .slice(-20);

  if (!turns.length) return reply({ error: "Ask ibis something first." }, 400, origin);
  if (turns[turns.length - 1].role !== "user") return reply({ error: "Invalid conversation state." }, 400, origin);

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!accountId || !apiToken) return reply({ error: "ibis is not configured yet on this route. No request was sent and nothing was charged." }, 503, origin);

  try {
    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: buildSystemPrompt(payload.products) },
          ...turns.map((t) => ({ role: t.role, content: t.content })),
        ],
      }),
      // Phase 4A fix: bounded timeout, same pattern already proven in ibis-query.
      signal: AbortSignal.timeout(20_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || data?.success === false) {
      console.error("Cloudflare Workers AI request failed", upstream.status, JSON.stringify(data?.errors || data));
      return reply({ error: "ibis is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
    }
    const answer = typeof data?.result?.response === "string" ? data.result.response.trim() : "";
    if (!answer) return reply({ error: "ibis did not return an answer. Please try again." }, 502, origin);
    return reply({ answer, provider: "Cloudflare Workers AI", model: MODEL, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis-text-cloudflare server error", error);
    return reply({ error: "ibis is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
  }
});
