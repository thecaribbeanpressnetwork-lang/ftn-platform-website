// FTN Platform — Bytez free-credit-only video adapter.
// Uses Bytez's documented SDK auth shape: Authorization: Key <BYTEZ_API_KEY>.
// Production generation remains disabled until a commercially usable OPEN model passes real E2E.
// Closed-provider models are disabled because they may require separate provider credentials/billing.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const REVIEWED_OPEN_MODEL = "Wan-AI/Wan2.1-T2V-1.3B";
const REVIEWED_OPEN_MODEL_LICENSE = "Apache-2.0";
const API_ROOT = "https://api.bytez.com/models/v2";
const MODEL_URL = `${API_ROOT}/${REVIEWED_OPEN_MODEL}`;
const CATALOG_URL = `${API_ROOT}/list/models?task=text-to-video`;
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
function authHeader(apiKey: string) {
  return { Authorization: `Key ${apiKey}` };
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

async function probeCatalog(apiKey: string) {
  try {
    const upstream = await fetch(CATALOG_URL, {
      headers: authHeader(apiKey),
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      return { providerHealthy: false, providerStatus: upstream.status, targetAvailable: false, candidates: [] };
    }
    const data = await upstream.json().catch(() => ({}));
    const rows = Array.isArray(data?.output) ? data.output : [];
    const candidates = rows
      .filter((row: any) => row && row.task === "text-to-video")
      .slice(0, 40)
      .map((row: any) => ({
        modelId: typeof row.modelId === "string" ? row.modelId : null,
        params: Number.isFinite(Number(row.params)) ? Number(row.params) : null,
        meter: typeof row.meter === "string" ? row.meter : null,
        meterPrice: row.meterPrice ?? null,
        status: typeof row.status === "string" ? row.status : null,
      }))
      .filter((row: any) => row.modelId);
    const target = candidates.find((row: any) => row.modelId === REVIEWED_OPEN_MODEL) || null;
    return { providerHealthy: true, providerStatus: upstream.status, targetAvailable: Boolean(target), target, candidates };
  } catch {
    return { providerHealthy: false, providerStatus: null, targetAvailable: false, candidates: [] };
  }
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
      authScheme: "KEY_PREFIX",
      freeCreditAccountConfirmedExternally: true,
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      closedProviderModelsEnabled: false,
      reviewedOpenModel: REVIEWED_OPEN_MODEL,
      reviewedOpenModelLicense: REVIEWED_OPEN_MODEL_LICENSE,
      reviewedOpenModelE2EProven: false,
      productionGenerationEnabled: false,
      readyToGenerate: false,
      generationAttempted: false,
      status: "FREE_CREDIT_FUNDED_OPEN_MODEL_AWAITING_E2E",
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  if (payload.action === "catalog") {
    if (!apiKey) return reply({ configured: false, providerHealthy: false, generationAttempted: false }, 200, origin);
    const state = await probeCatalog(apiKey);
    return reply({
      capability: "VIDEO_GENERATION",
      provider: "bytez",
      configured: true,
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      closedProviderModelsEnabled: false,
      catalogChecked: true,
      ...state,
      readyForProof: state.providerHealthy && state.targetAvailable,
      generationAttempted: false,
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  if (payload.action === "generate") {
    return reply({
      error: "Bytez production video generation is disabled until the reviewed open model passes E2E validation.",
      readyToGenerate: false,
      generationAttempted: false,
    }, 503, origin);
  }

  if (payload.action !== "prove_open_model") {
    return reply({ error: "action must be health, catalog, generate, or prove_open_model." }, 400, origin);
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 2_000) : "";
  if (!prompt) return reply({ error: "Describe the proof video first." }, 400, origin);
  if (!apiKey) return reply({ error: "Bytez is not configured. No request was made." }, 503, origin);
  if (payload.confirmFreeCreditUse !== true) return reply({ error: "Explicit confirmation to use Bytez free credits is required. No request was made." }, 409, origin);

  const preflight = await probeCatalog(apiKey);
  if (!preflight.providerHealthy || !preflight.targetAvailable) {
    return reply({
      error: "Bytez reviewed open video model is not currently available. No inference request was sent.",
      providerStatus: preflight.providerStatus,
      targetAvailable: preflight.targetAvailable,
      freeCreditOnly: true,
    }, 503, origin);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "The one-shot Bytez proof route is rate-limited." }, 429, origin);

  try {
    const upstream = await fetch(MODEL_URL, {
      method: "POST",
      headers: { ...authHeader(apiKey), "Content-Type": "application/json" },
      body: JSON.stringify({ text: prompt }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.status === 402) {
      return reply({ error: "Bytez free credits are exhausted. No paid fallback exists and no purchase was attempted.", freeCreditOnly: true, providerStatus: 402 }, 402, origin);
    }
    if (!upstream.ok) {
      console.error("ibis-video-bytez open-model proof failed", upstream.status, JSON.stringify(data));
      return reply({ error: "Bytez open-model proof is temporarily unavailable.", providerStatus: upstream.status, freeCreditOnly: true }, 502, origin);
    }
    if (data?.error) {
      console.error("ibis-video-bytez open-model proof model error", JSON.stringify(data.error));
      return reply({ error: "Bytez open-model returned an inference error.", providerStatus: 200, freeCreditOnly: true }, 502, origin);
    }
    const videoUrl = typeof data.output === "string" && /^https:\/\//i.test(data.output) ? data.output : "";
    if (!videoUrl) return reply({ error: "Bytez returned no usable video URL.", providerStatus: 200, outputType: Array.isArray(data.output) ? "array" : typeof data.output, freeCreditOnly: true }, 502, origin);
    return reply({
      videoUrl,
      provider: "Bytez",
      model: REVIEWED_OPEN_MODEL,
      modelLicense: REVIEWED_OPEN_MODEL_LICENSE,
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      proofOnly: true,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error("ibis-video-bytez proof error", error);
    return reply({ error: "Bytez open-model proof is temporarily unavailable.", freeCreditOnly: true }, 502, origin);
  }
});
