// FTN Platform — ibis IMAGE_GENERATION route via Cloudflare Workers AI (Phase 3B follow-through:
// the "IMAGE research -> IMPLEMENT" step). Mirrors supabase/functions/ibis-text-cloudflare's
// shape exactly -- same CORS/rate-limit/fail-closed pattern, same account and free Neuron
// allocation, same ZERO_COST_TO_IBIS classification. Registered in
// js/ibis-provider-registry.js as two model-level candidates so a single model's outage doesn't
// remove IMAGE_GENERATION eligibility entirely: cloudflare-workers-ai-image-flux (primary,
// @cf/black-forest-labs/flux-1-schnell) and cloudflare-workers-ai-image-sdxl (fallback,
// @cf/bytedance/stable-diffusion-xl-lightning). One function serves both -- the client selects
// the model via a validated allowlist, never an arbitrary client-supplied model id.

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

// Same per-IP window shape as ibis-query, ibis-assistant and ibis-text-cloudflare.
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

// Fixed allowlist -- the client picks a registry provider id, never a raw Cloudflare model
// string, so this route can never be pointed at an unreviewed model.
const MODELS: Record<string, string> = {
  "cloudflare-workers-ai-image-flux": "@cf/black-forest-labs/flux-1-schnell",
  "cloudflare-workers-ai-image-sdxl": "@cf/bytedance/stable-diffusion-xl-lightning",
};

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);

  let payload: { prompt?: unknown; providerId?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 2_000) : "";
  if (!prompt) return reply({ error: "Describe the image first." }, 400, origin);

  const providerId = typeof payload.providerId === "string" ? payload.providerId : "cloudflare-workers-ai-image-flux";
  const model = MODELS[providerId];
  if (!model) return reply({ error: "Unknown image provider." }, 400, origin);

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!accountId || !apiToken) return reply({ error: "ibis image generation is not configured yet on this route. No request was sent and nothing was charged." }, 503, origin);

  try {
    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ prompt }),
      // Phase 4A fix: bounded timeout, same pattern already proven in ibis-query.
      signal: AbortSignal.timeout(20_000),
    });

    const contentType = upstream.headers.get("content-type") || "";
    let image: string | null = null;

    if (contentType.indexOf("application/json") !== -1) {
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok || data?.success === false) {
        console.error("Cloudflare Workers AI image request failed", upstream.status, JSON.stringify(data?.errors || data));
        return reply({ error: "ibis image generation is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
      }
      // Confirmed 2026-08-21 via a real, direct, authenticated test against the live Cloudflare
      // API (see IBIS-MAP.md Sec 0.17): flux-1-schnell's REST response really is
      // {result:{image:"<base64>"}, success:true, ...} -- result.image is the real field, not a
      // guess. b64_json kept as a defensive fallback only (never observed in practice).
      image = typeof data?.result?.image === "string" ? data.result.image
        : typeof data?.result?.b64_json === "string" ? data.result.b64_json
        : null;
    } else if (upstream.ok && contentType.indexOf("image/") === 0) {
      // Confirmed 2026-08-21: stable-diffusion-xl-lightning takes this branch for real -- it
      // returns raw binary with an "image/png" content-type header, but the actual decoded bytes
      // are JPEG (0xFFD8 magic bytes), a real, confirmed mismatch on Cloudflare's own API. This
      // branch is correct as written because it trusts the actual bytes, not the declared label.
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      image = btoa(binary);
    } else {
      const text = await upstream.text().catch(() => "");
      console.error("Cloudflare Workers AI image request failed", upstream.status, text.slice(0, 500));
    }

    if (!image) return reply({ error: "ibis did not return an image. Please try again." }, 502, origin);
    return reply({ image, providerId, model, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis-image-cloudflare server error", error);
    return reply({ error: "ibis image generation is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
  }
});
