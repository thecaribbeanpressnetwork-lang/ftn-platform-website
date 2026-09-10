// FTN Platform — Bytez free-credit-only native video adapter.
// Founder-approved 2026-09-10: Bytez/LTX is the first native VIDEO_GENERATION route.
// Guardrails: BYTEZ_API_KEY required, explicit free-credit confirmation required, one request per IP
// per 30 minutes, no paid fallback, fail closed on auth/credit/model/artifact failure.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const REVIEWED_OPEN_MODEL = "Lightricks/LTX-Video-0.9.7-dev";
const REVIEWED_OPEN_MODEL_LICENSE = "LTXV Open Weights License";
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
function bytezHeaders(apiKey: string) {
  return { Authorization: `Key ${apiKey}`, "Content-Type": "application/json", lang: "javascript" };
}
function withinLimit(ip: string) {
  const now = Date.now();
  const c = windows.get(ip);
  if (!c || c.resetAt <= now) {
    windows.set(ip, { count: 1, resetAt: now + 30 * 60_000 });
    return true;
  }
  if (c.count >= 1) return false;
  c.count += 1;
  return true;
}
async function probeCatalog(apiKey: string) {
  try {
    const upstream = await fetch(CATALOG_URL, { headers: bytezHeaders(apiKey), signal: AbortSignal.timeout(20_000) });
    if (!upstream.ok) return { providerHealthy: false, providerStatus: upstream.status, targetAvailable: false, candidates: [] };
    const data = await upstream.json().catch(() => ({}));
    const rows = Array.isArray((data as any)?.output) ? (data as any).output : [];
    const candidates = rows.filter((r: any) => r && r.task === "text-to-video").slice(0, 40).map((r: any) => ({
      modelId: typeof r.modelId === "string" ? r.modelId : null,
      params: Number.isFinite(Number(r.params)) ? Number(r.params) : null,
      meter: typeof r.meter === "string" ? r.meter : null,
      meterPrice: r.meterPrice ?? null,
      status: typeof r.status === "string" ? r.status : null,
    })).filter((r: any) => r.modelId);
    const target = candidates.find((r: any) => r.modelId === REVIEWED_OPEN_MODEL) || null;
    return { providerHealthy: true, providerStatus: upstream.status, targetAvailable: Boolean(target), target, candidates };
  } catch {
    return { providerHealthy: false, providerStatus: null, targetAvailable: false, candidates: [] };
  }
}
function catalogFailureAllowsDirectProof(s: { providerHealthy: boolean; providerStatus: number | null }) {
  return s.providerHealthy === false && (s.providerStatus === 500 || s.providerStatus === null);
}
function firstVideoUrl(value: any): string {
  if (typeof value === "string" && /^https:\/\//i.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstVideoUrl(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    for (const key of ["videoUrl", "url", "output", "file", "downloadUrl", "result"]) {
      const found = firstVideoUrl(value[key]);
      if (found) return found;
    }
  }
  return "";
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  let payload: { action?: unknown; prompt?: unknown; confirmFreeCreditUse?: unknown; duration?: unknown; resolution?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const apiKey = Deno.env.get("BYTEZ_API_KEY") || "";
  if (payload.action === "health") return reply({
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
    licenseConstraint: "Commercial use subject to LTXV Open Weights License; entities at or above US$10M annual revenue require a separate paid commercial license.",
    productionGenerationEnabled: true,
    readyToGenerate: Boolean(apiKey),
    generationAttempted: false,
    status: Boolean(apiKey) ? "FOUNDER_APPROVED_FREE_CREDIT_NATIVE_VIDEO_READY" : "AWAITING_BYTEZ_API_KEY",
    checkedAt: new Date().toISOString(),
  }, 200, origin);

  if (payload.action === "catalog") {
    if (!apiKey) return reply({ configured: false, providerHealthy: false, generationAttempted: false }, 200, origin);
    const state = await probeCatalog(apiKey);
    const advisory = catalogFailureAllowsDirectProof(state);
    return reply({
      capability: "VIDEO_GENERATION", provider: "bytez", configured: true, freeCreditOnly: true,
      paidFallbackImplemented: false, closedProviderModelsEnabled: false, catalogChecked: true, ...state,
      readyForGeneration: (state.providerHealthy && state.targetAvailable) || advisory,
      catalogAdvisoryOnly: advisory, generationAttempted: false, checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  if (payload.action !== "generate" && payload.action !== "prove_open_model") {
    return reply({ error: "action must be health, catalog, generate, or prove_open_model." }, 400, origin);
  }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 2000) : "";
  if (!prompt) return reply({ error: "Describe the video first." }, 400, origin);
  if (!apiKey) return reply({ error: "Bytez is not configured. No request was made.", provider: "Bytez", nativeTextToVideo: true }, 503, origin);
  if (payload.confirmFreeCreditUse !== true) return reply({ error: "Explicit confirmation to use Bytez free credits is required. No request was made.", provider: "Bytez", nativeTextToVideo: true }, 409, origin);

  const preflight = await probeCatalog(apiKey);
  const advisory = catalogFailureAllowsDirectProof(preflight);
  if ((!preflight.providerHealthy || !preflight.targetAvailable) && !advisory) {
    return reply({
      error: "Bytez reviewed open video model is not currently available. No inference request was sent.",
      providerStatus: preflight.providerStatus,
      targetAvailable: preflight.targetAvailable,
      provider: "Bytez",
      nativeTextToVideo: true,
      freeCreditOnly: true,
    }, 503, origin);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "The Bytez native video route is rate-limited.", provider: "Bytez", nativeTextToVideo: true }, 429, origin);

  try {
    const upstream = await fetch(MODEL_URL, {
      method: "POST",
      headers: bytezHeaders(apiKey),
      body: JSON.stringify({
        text: prompt,
        duration: typeof payload.duration === "number" ? payload.duration : 6,
        resolution: typeof payload.resolution === "string" ? payload.resolution : "1280x720",
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.status === 402) return reply({
      error: "Bytez free credits are exhausted or this model requires paid access. No paid fallback exists and no purchase was attempted.",
      freeCreditOnly: true, providerStatus: 402, provider: "Bytez", nativeTextToVideo: true,
    }, 402, origin);
    if (!upstream.ok) {
      console.error("ibis-video-bytez native generation failed", upstream.status, JSON.stringify(data));
      return reply({ error: "Bytez native generation is temporarily unavailable.", providerStatus: upstream.status, freeCreditOnly: true, provider: "Bytez", nativeTextToVideo: true }, 502, origin);
    }
    if ((data as any)?.error) {
      console.error("ibis-video-bytez native generation model error", JSON.stringify((data as any).error));
      return reply({ error: "Bytez returned an inference error.", providerStatus: 200, freeCreditOnly: true, provider: "Bytez", nativeTextToVideo: true }, 502, origin);
    }
    const videoUrl = firstVideoUrl((data as any)?.output ?? data);
    if (!videoUrl) return reply({
      error: "Bytez returned no usable video URL.",
      providerStatus: 200,
      outputType: Array.isArray((data as any)?.output) ? "array" : typeof (data as any)?.output,
      freeCreditOnly: true,
      provider: "Bytez",
      nativeTextToVideo: true,
    }, 502, origin);
    return reply({
      videoUrl,
      provider: "Bytez",
      model: REVIEWED_OPEN_MODEL,
      modelLicense: REVIEWED_OPEN_MODEL_LICENSE,
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      proofOnly: false,
      nativeTextToVideo: true,
      catalogPreflightStatus: preflight.providerStatus,
      catalogAdvisoryOnly: advisory,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error("ibis-video-bytez generation error", error);
    return reply({ error: "Bytez native generation is temporarily unavailable.", freeCreditOnly: true, provider: "Bytez", nativeTextToVideo: true }, 502, origin);
  }
});
