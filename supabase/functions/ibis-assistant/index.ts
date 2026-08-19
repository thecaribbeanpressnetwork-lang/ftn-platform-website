// FTN Platform — ibis sitewide assistant widget route.
// Narrowly scoped: this function only proxies the persistent ibis widget's chat turns to
// Anthropic. It does not touch auth, other FTN Edge Functions, or any database table.
// The Anthropic credential stays in Supabase secrets; it must never be exposed to the browser.

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

// Same per-IP window shape as supabase/functions/ibis-query/index.ts, kept consistent
// deliberately rather than inventing a second rate-limit convention.
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

const SYSTEM_PROMPT = "You are ibis, FTN Platform's intelligent Caribbean assistant. You know every FTN product, its purpose, its route and its current status. You help citizens, creators, investors and institutions navigate the Caribbean ecosystem. You are warm, precise and Caribbean-first. You never fabricate. When you don't know something, you say so and route the user to the right place. FTN products include: Community Connect (/community-connect/), FTN Govern (/govern/), FTN Parliament (/parliament/), Face The Nation (/facethenation), FTN Live (/observatory/), FTN Kaiso (/kaiso/), ibis.ai (/ibis-ai/), FTN Radio (/radio/), FTN Screen (/screen/), FTN TV (/tv/), FTN Events (/events/), FTN Riddim (/riddim/), FTN Fire (/riddim/fire/), FTN DJ Tube (/riddim/dj/), FTN DAW (/riddim/daw/), FTN EPK (/radio/#ftn-epk), FTN Opportunities (/opportunities/), FTN Invest-in (/invest/), FTN Display Network (/display-network/), FTN Account (/account/). Mission Control is private institutional infrastructure, not a public product -- do not offer it as a destination. Keep answers concise: a short paragraph or a few lines, not an essay.";

type Turn = { role: "user" | "assistant"; content: string };

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);

  let payload: { messages?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const raw = Array.isArray(payload.messages) ? payload.messages : [];
  const turns: Turn[] = raw
    .filter((m): m is { role: unknown; content: unknown } => m && typeof m === "object")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: typeof m.content === "string" ? m.content.trim().slice(0, 2_000) : "",
    }))
    .filter((m) => m.content.length > 0)
    .slice(-20); // last 20 turns is plenty of session context and bounds request size/cost

  if (!turns.length) return reply({ error: "Ask ibis something first." }, 400, origin);
  if (turns[turns.length - 1].role !== "user") return reply({ error: "Invalid conversation state." }, 400, origin);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return reply({ error: "ibis is not configured yet. No request was sent and nothing was charged." }, 503, origin);
  // Model name as specified by the founder brief. Left as an env override in case the exact
  // id needs correcting later -- see the deployment note in docs/deferred-content.md.
  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: turns.map((t) => ({ role: t.role, content: t.content })),
      }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("Anthropic request failed", upstream.status, data?.error?.message || "unknown error");
      return reply({ error: "ibis is temporarily unavailable. Please try again shortly." }, 502, origin);
    }
    const answer = Array.isArray(data?.content)
      ? data.content.map((block: { type?: string; text?: string }) => (block?.type === "text" ? block.text || "" : "")).join("").trim()
      : "";
    if (!answer) return reply({ error: "ibis did not return an answer. Please try again." }, 502, origin);
    return reply({ answer, provider: "Anthropic", model, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis widget server error", error);
    return reply({ error: "ibis is temporarily unavailable. Please try again shortly." }, 502, origin);
  }
});
