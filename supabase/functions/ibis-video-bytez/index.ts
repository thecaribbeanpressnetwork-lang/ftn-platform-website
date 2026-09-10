// FTN Platform — Bytez free-credit-only text-to-video adapter.
// Uses only reviewed open models. No paid fallback is implemented.
// A 402/credit exhaustion response fails closed. This function never tops up credits.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const MODEL = "Wan-AI/Wan2.1-T2V-1.3B";
const MODEL_LICENSE = "Apache-2.0";
const API_URL = `https://api.bytez.com/models/v2/${MODEL}`;
const CATALOG_URL = "https://api.bytez.com/models/v2/list/models?task=text-to-video";
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
    windows.set(ip, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }
  if (current.count >= 4) return false;
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
      model: MODEL,
      modelLicense: MODEL_LICENSE,
      configured: Boolean(apiKey),
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      readyToGenerate: Boolean(apiKey),
      catalogChecked: false,
      generationAttempted: false,
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  if (payload.action === "catalog") {
    if (!apiKey) return reply({ error: "Bytez is not configured.", generationAttempted: false }, 503, origin);
    try {
      const upstream = await fetch(CATALOG_URL, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(15_000),
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        return reply({ error: "Bytez catalog is temporarily unavailable.", providerStatus: upstream.status, generationAttempted: false }, 502, origin);
      }
      const rows = Array.isArray(data?.output) ? data.output : [];
      const candidates = rows
        .filter((row: any) => row && row.task === "text-to-video" && Number(row.params) <= 7)
        .slice(0, 30)
        .map((row: any) => ({
          modelId: typeof row.modelId === "string" ? row.modelId : null,
          params: Number.isFinite(Number(row.params)) ? Number(row.params) : null,
          meter: typeof row.meter === "string" ? row.meter : null,
          meterPrice: typeof row.meterPrice === "string" ? row.meterPrice : null,
        }))
        .filter((row: any) => row.modelId);
      const target = candidates.find((row: any) => row.modelId === MODEL) || null;
      return reply({
        capability: "VIDEO_GENERATION",
        provider: "bytez",
        configured: true,
        freeCreditOnly: true,
        paidFallbackImplemented: false,
        catalogChecked: true,
        targetModel: MODEL,
        targetAvailable: Boolean(target),
        target,
        candidates,
        generationAttempted: false,
        checkedAt: new Date().toISOString(),
      }, 200, origin);
    } catch (error) {
      console.error("ibis-video-bytez catalog error", error);
      return reply({ error: "Bytez catalog is temporarily unavailable.", generationAttempted: false }, 502, origin);
    }
  }

  if (payload.action !== "generate") return reply({ error: "action must be health, catalog or generate." }, 400, origin);
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 2_000) : "";
  if (!prompt) return reply({ error: "Describe the video first." }, 400, origin);
  if (!apiKey) return reply({ error: "Bytez video is not configured. No request was made." }, 503, origin);
  if (payload.confirmFreeCreditUse !== true) return reply({ error: "Explicit confirmation to use Bytez free credits is required. No request was made." }, 409, origin);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "Bytez video generation is rate-limited. Try again later." }, 429, origin);

  try {
    const upstream = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ text: prompt }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.status === 402) {
      return reply({ error: "Bytez free credits are exhausted. No paid fallback exists and no purchase was attempted.", freeCreditOnly: true, providerStatus: 402 }, 402, origin);
    }
    if (!upstream.ok) {
      console.error("ibis-video-bytez upstream failed", upstream.status, JSON.stringify(data));
      return reply({ error: "Bytez video generation is temporarily unavailable.", providerStatus: upstream.status }, 502, origin);
    }
    if (data?.error) {
      console.error("ibis-video-bytez model error", JSON.stringify(data.error));
      return reply({ error: "Bytez model returned an inference error.", providerStatus: 200, providerError: String(data.error).slice(0, 240) }, 502, origin);
    }
    const videoUrl = typeof data.output === "string" && /^https:\/\//i.test(data.output) ? data.output : "";
    if (!videoUrl) return reply({ error: "Bytez returned no usable video URL.", providerStatus: 200, outputType: Array.isArray(data.output) ? "array" : typeof data.output }, 502, origin);
    return reply({
      videoUrl,
      provider: "Bytez",
      model: MODEL,
      modelLicense: MODEL_LICENSE,
      freeCreditOnly: true,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error("ibis-video-bytez error", error);
    return reply({ error: "Bytez video generation is temporarily unavailable." }, 502, origin);
  }
});
