// FTN Platform — governed LTX text-to-video adapter.
// IMPORTANT: LTX API generation is paid per output second. This function is fail-closed:
// - health and quote never call LTX and never spend;
// - generation requires a server-side LTX_PAID_GENERATION_ENABLED=true flag;
// - every generation request must explicitly approve the exact quoted USD ceiling.
// An API key alone is never authority to spend.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const windows = new Map<string, { count: number; resetAt: number }>();
const MODEL = "ltx-2-3-fast";
const PRICE_PER_SECOND_720P = 0.03;
const VALID_DURATIONS = new Set([6, 8, 10, 12, 14, 16, 18, 20]);
const VALID_RESOLUTIONS = new Set(["1280x720", "720x1280"]);
const API_BASE = "https://api.ltx.io";

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
    windows.set(ip, { count: 1, resetAt: now + 5 * 60_000 });
    return true;
  }
  if (current.count >= 12) return false;
  current.count += 1;
  return true;
}
function money(value: number) { return Math.round(value * 100) / 100; }
function quote(duration: number, resolution: string) {
  if (!VALID_DURATIONS.has(duration)) return null;
  if (!VALID_RESOLUTIONS.has(resolution)) return null;
  return {
    provider: "LTX API",
    model: MODEL,
    duration,
    resolution,
    fps: 24,
    generateAudio: true,
    pricePerSecondUsd: PRICE_PER_SECOND_720P,
    maximumCostUsd: money(duration * PRICE_PER_SECOND_720P),
    customerFundingRequired: true,
    generationAttempted: false,
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  let payload: {
    action?: unknown;
    prompt?: unknown;
    duration?: unknown;
    resolution?: unknown;
    approvedCostUsd?: unknown;
    confirmPaidGeneration?: unknown;
    jobId?: unknown;
  };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const apiKey = Deno.env.get("LTXV_API_KEY") || "";
  const paidGenerationEnabled = Deno.env.get("LTX_PAID_GENERATION_ENABLED") === "true";

  if (payload.action === "health") {
    return reply({
      capability: "VIDEO_GENERATION",
      provider: "ltx-api",
      model: MODEL,
      configured: Boolean(apiKey),
      paidGenerationEnabled,
      readyToQuote: true,
      readyToGenerate: Boolean(apiKey && paidGenerationEnabled),
      pricePerSecondUsd: PRICE_PER_SECOND_720P,
      minimumDuration: 6,
      minimumQuotedCostUsd: money(6 * PRICE_PER_SECOND_720P),
      supportedResolutions: [...VALID_RESOLUTIONS],
      generationAttempted: false,
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  const duration = Number(payload.duration || 6);
  const resolution = typeof payload.resolution === "string" ? payload.resolution : "1280x720";
  const currentQuote = quote(duration, resolution);
  if (!currentQuote) return reply({ error: "Unsupported LTX duration or resolution. This launch adapter is limited to reviewed LTX-2.3 Fast 720p options." }, 400, origin);

  if (payload.action === "quote") {
    return reply({ ...currentQuote, quotedAt: new Date().toISOString() }, 200, origin);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis video needs a short break. Please wait a few minutes and try again." }, 429, origin);

  if (payload.action === "status") {
    const jobId = typeof payload.jobId === "string" ? payload.jobId.trim() : "";
    if (!apiKey) return reply({ error: "LTX video is not configured. No paid request was made." }, 503, origin);
    if (!/^[A-Za-z0-9-]{8,100}$/.test(jobId)) return reply({ error: "Invalid LTX job id." }, 400, origin);
    try {
      const upstream = await fetch(`${API_BASE}/v2/text-to-video/${encodeURIComponent(jobId)}`, {
        headers: { authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return reply({ error: "LTX job status is temporarily unavailable.", providerStatus: upstream.status }, 502, origin);
      const result = data && typeof data.result === "object" ? data.result : null;
      return reply({
        jobId,
        status: typeof data.status === "string" ? data.status : "unknown",
        videoUrl: typeof result?.video_url === "string" ? result.video_url : null,
        provider: "LTX API",
        model: MODEL,
        checkedAt: new Date().toISOString(),
      }, 200, origin);
    } catch (error) {
      console.error("ibis-video-ltx status error", error);
      return reply({ error: "LTX job status is temporarily unavailable." }, 502, origin);
    }
  }

  if (payload.action !== "generate") return reply({ error: "action must be health, quote, generate or status." }, 400, origin);
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 5_000) : "";
  if (!prompt) return reply({ error: "Describe the video first." }, 400, origin);
  if (!apiKey) return reply({ error: "LTX video is not configured. No paid request was made." }, 503, origin);
  if (!paidGenerationEnabled) return reply({ error: "Paid LTX generation is locked by founder policy. No request was sent and nothing was charged.", quote: currentQuote }, 403, origin);
  if (payload.confirmPaidGeneration !== true) return reply({ error: "Explicit paid-generation confirmation is required. No request was sent and nothing was charged.", quote: currentQuote }, 409, origin);
  const approved = typeof payload.approvedCostUsd === "number" ? money(payload.approvedCostUsd) : NaN;
  if (!Number.isFinite(approved) || approved !== currentQuote.maximumCostUsd) {
    return reply({ error: "Approved cost does not exactly match the current quote. No request was sent and nothing was charged.", quote: currentQuote }, 409, origin);
  }

  try {
    const upstream = await fetch(`${API_BASE}/v2/text-to-video`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt, model: MODEL, duration, resolution, fps: 24, generate_audio: true }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("LTX video submit failed", upstream.status, JSON.stringify(data));
      const publicError = upstream.status === 402 ? "LTX reports insufficient paid balance. No video job was started." : "LTX video generation is temporarily unavailable.";
      return reply({ error: publicError, providerStatus: upstream.status }, upstream.status === 402 ? 402 : 502, origin);
    }
    const jobId = typeof data.id === "string" ? data.id : "";
    if (!jobId) return reply({ error: "LTX accepted the request but returned no job id." }, 502, origin);
    return reply({
      jobId,
      status: "submitted",
      provider: "LTX API",
      model: MODEL,
      quote: currentQuote,
      submittedAt: typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
    }, 202, origin);
  } catch (error) {
    console.error("ibis-video-ltx submit error", error);
    return reply({ error: "LTX video generation is temporarily unavailable." }, 502, origin);
  }
});
