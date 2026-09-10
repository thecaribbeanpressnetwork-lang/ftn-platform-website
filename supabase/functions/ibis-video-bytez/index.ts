// FTN Platform — Bytez free-credit-only video adapter.
// User account is confirmed to have free Bytez credits, but production generation remains disabled
// until a commercially usable OPEN model passes a real E2E proof. Closed-provider models are not
// used here because they can require a separate provider key and provider-side billing.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const REVIEWED_OPEN_MODEL = "Wan-AI/Wan2.1-T2V-1.3B";
const REVIEWED_OPEN_MODEL_LICENSE = "Apache-2.0";

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

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  let payload: { action?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const apiKey = Deno.env.get("BYTEZ_API_KEY") || "";

  if (payload.action === "health") {
    return reply({
      capability: "VIDEO_GENERATION",
      provider: "bytez",
      configured: Boolean(apiKey),
      credentialConfigured: Boolean(apiKey),
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

  return reply({
    error: "Bytez video generation is disabled until a reviewed open model passes E2E validation.",
    freeCreditOnly: true,
    paidFallbackImplemented: false,
    generationAttempted: false,
    readyToGenerate: false,
  }, 503, origin);
});
