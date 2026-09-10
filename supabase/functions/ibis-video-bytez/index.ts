// FTN Platform — Bytez free-credit-only text-to-video adapter.
// Production generation remains disabled until a real E2E video proof succeeds.
// One controlled proof route uses Bytez's currently advertised READY + Free Tier openai/sora-2 model.
// No paid fallback, top-up, auto-reload, or pay-as-you-go enablement exists in this function.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const PROOF_MODEL = "openai/sora-2";
const PROOF_MODEL_CLASS = "closed";
const PROOF_ACCESS = "BYTEZ_FREE_TIER";
const API_URL = `https://api.bytez.com/models/v2/${PROOF_MODEL}`;
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
    windows.set(ip, { count: 1, resetAt: now + 30 * 60_000 });
    return true;
  }
  if (current.count >= 1) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  let payload: { action?: unknown; prompt?: unknown; confirmFreeCreditUse?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const apiKey = Deno.env.get("BYTEZ_API_KEY") || "";

  if (payload.action === "health") {
    return reply({
      capability: "VIDEO_GENERATION",
      provider: "bytez",
      configured: Boolean(apiKey),
      credentialConfigured: Boolean(apiKey),
      proofModel: PROOF_MODEL,
      proofModelClass: PROOF_MODEL_CLASS,
      proofAccess: PROOF_ACCESS,
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      productionGenerationEnabled: false,
      readyToGenerate: false,
      generationAttempted: false,
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  if (payload.action === "generate") {
    return reply({
      error: "Bytez production video generation is disabled until the controlled free-tier E2E proof passes.",
      readyToGenerate: false,
      generationAttempted: false,
    }, 503, origin);
  }

  if (payload.action !== "prove_free_tier") {
    return reply({ error: "action must be health, generate, or prove_free_tier." }, 400, origin);
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 2_000) : "";
  if (!prompt) return reply({ error: "Describe the proof video first." }, 400, origin);
  if (!apiKey) return reply({ error: "Bytez is not configured. No request was made." }, 503, origin);
  if (payload.confirmFreeCreditUse !== true) {
    return reply({ error: "Explicit confirmation to use Bytez free credits is required. No request was made." }, 409, origin);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "The one-shot Bytez proof route is rate-limited." }, 429, origin);

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ text: prompt }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = await upstream.json().catch(() => ({}));

    if (upstream.status === 402 || upstream.status === 403) {
      return reply({
        error: "Bytez free-tier proof was refused by the provider. No paid fallback exists and no purchase was attempted.",
        providerStatus: upstream.status,
        freeCreditOnly: true,
      }, upstream.status === 402 ? 402 : 503, origin);
    }
    if (!upstream.ok) {
      console.error("ibis-video-bytez free-tier proof upstream failed", upstream.status, JSON.stringify(data));
      return reply({ error: "Bytez free-tier video proof is temporarily unavailable.", providerStatus: upstream.status, freeCreditOnly: true }, 502, origin);
    }
    if (data?.error) {
      console.error("ibis-video-bytez free-tier proof model error", JSON.stringify(data.error));
      return reply({ error: "Bytez free-tier model returned an inference error.", providerStatus: 200, freeCreditOnly: true }, 502, origin);
    }

    const videoUrl = typeof data.output === "string" && /^https:\/\//i.test(data.output) ? data.output : "";
    if (!videoUrl) {
      return reply({ error: "Bytez returned no usable video URL.", providerStatus: 200, outputType: Array.isArray(data.output) ? "array" : typeof data.output, freeCreditOnly: true }, 502, origin);
    }

    return reply({
      videoUrl,
      provider: "Bytez",
      model: PROOF_MODEL,
      modelClass: PROOF_MODEL_CLASS,
      accessClass: PROOF_ACCESS,
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      proofOnly: true,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error("ibis-video-bytez free-tier proof error", error);
    return reply({ error: "Bytez free-tier video proof is temporarily unavailable.", freeCreditOnly: true }, 502, origin);
  }
});
