// FTN Platform — ibis IMAGE_GENERATION route via Cloudflare Workers AI.
// The generation route is fail-closed. The health action never calls Cloudflare or consumes
// neurons; it reports only whether the required server-side configuration is present.

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

const MODELS: Record<string, string> = {
  "cloudflare-workers-ai-image-flux": "@cf/black-forest-labs/flux-1-schnell",
  "cloudflare-workers-ai-image-sdxl": "@cf/bytedance/stable-diffusion-xl-lightning",
};

function detectImageType(base64: string) {
  try {
    const binary = atob(base64.slice(0, 32));
    const bytes = Array.from(binary, (c) => c.charCodeAt(0));
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mimeType: "image/jpeg", extension: "jpg" };
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mimeType: "image/png", extension: "png" };
  } catch (_) {}
  return null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  let payload: { action?: unknown; prompt?: unknown; providerId?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const configured = Boolean(accountId && apiToken);

  if (payload.action === "health") {
    return reply({
      capability: "IMAGE_GENERATION",
      provider: "cloudflare-workers-ai",
      configured,
      ready: configured,
      providerIds: Object.keys(MODELS),
      models: Object.values(MODELS),
      generationAttempted: false,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim().slice(0, 2_000) : "";
  if (!prompt) return reply({ error: "Describe the image first." }, 400, origin);

  const providerId = typeof payload.providerId === "string" ? payload.providerId : "cloudflare-workers-ai-image-flux";
  const model = MODELS[providerId];
  if (!model) return reply({ error: "Unknown image provider." }, 400, origin);
  if (!configured) return reply({ error: "ibis image generation is not configured yet on this route. No request was sent and nothing was charged." }, 503, origin);

  try {
    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${apiToken}` },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(20_000),
    });

    const contentType = upstream.headers.get("content-type") || "";
    let image: string | null = null;
    if (contentType.includes("application/json")) {
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok || data?.success === false) {
        console.error("Cloudflare Workers AI image request failed", upstream.status, JSON.stringify(data?.errors || data));
        return reply({ error: "ibis image generation is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
      }
      image = typeof data?.result?.image === "string" ? data.result.image
        : typeof data?.result?.b64_json === "string" ? data.result.b64_json
        : null;
    } else if (upstream.ok && contentType.startsWith("image/")) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      image = btoa(binary);
    } else {
      const text = await upstream.text().catch(() => "");
      console.error("Cloudflare Workers AI image request failed", upstream.status, text.slice(0, 500));
    }

    if (!image) return reply({ error: "ibis did not return an image. Please try again." }, 502, origin);
    const type = detectImageType(image);
    if (!type) return reply({ error: "ibis received an unrecognized image artifact and refused to label or download it." }, 502, origin);
    return reply({ image, mimeType: type.mimeType, extension: type.extension, providerId, model, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis-image-cloudflare server error", error);
    return reply({ error: "ibis image generation is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
  }
});
