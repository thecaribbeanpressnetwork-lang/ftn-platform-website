// FTN Platform — governed Bytez open-model execution adapter.
// Demo/system key only for recovery validation. Per-user BYOK is tracked separately and will use server-side secret storage.
// Closed-source/provider-key routes are intentionally disabled here. No top-up, auto-reload, or paid fallback exists.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const API_ROOT = "https://api.bytez.com/models/v2";
const TEXT_PROOF_MODEL = "openai-community/gpt2";
const TEXT_PROOF_LICENSE = "MIT";

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

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  let payload: { action?: unknown; text?: unknown; confirmFreeCreditUse?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }
  const apiKey = Deno.env.get("BYTEZ_API_KEY") || "";

  if (payload.action === "health") {
    return reply({
      provider: "bytez",
      configured: Boolean(apiKey),
      authScheme: "KEY_PREFIX",
      freeCreditOnly: true,
      closedProviderModelsEnabled: false,
      paidFallbackImplemented: false,
      perUserByokImplemented: false,
      generationAttempted: false,
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  if (payload.action === "list_tasks") {
    if (!apiKey) return reply({ error: "Bytez is not configured.", inferenceAttempted: false }, 503, origin);
    try {
      const upstream = await fetch(`${API_ROOT}/list/tasks`, { headers: bytezHeaders(apiKey), signal: AbortSignal.timeout(20_000) });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) return reply({ error: "Bytez task discovery unavailable.", providerStatus: upstream.status, inferenceAttempted: false }, 502, origin);
      const rows = Array.isArray(data?.output) ? data.output : [];
      return reply({ provider: "bytez", taskCount: rows.length, tasks: rows.slice(0, 100), inferenceAttempted: false }, 200, origin);
    } catch {
      return reply({ error: "Bytez task discovery unavailable.", inferenceAttempted: false }, 502, origin);
    }
  }

  if (payload.action !== "prove_text") return reply({ error: "action must be health, list_tasks, or prove_text." }, 400, origin);
  if (!apiKey) return reply({ error: "Bytez is not configured. No inference request was made." }, 503, origin);
  if (payload.confirmFreeCreditUse !== true) return reply({ error: "Explicit confirmation to use Bytez free credits is required. No inference request was made." }, 409, origin);
  const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 400) : "";
  if (!text) return reply({ error: "Text is required." }, 400, origin);

  try {
    const upstream = await fetch(`${API_ROOT}/${TEXT_PROOF_MODEL}`, {
      method: "POST",
      headers: bytezHeaders(apiKey),
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(60_000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.status === 402) return reply({ error: "Bytez free credits exhausted. No paid fallback exists.", providerStatus: 402, freeCreditOnly: true }, 402, origin);
    if (!upstream.ok) return reply({ error: "Bytez open-model inference failed.", providerStatus: upstream.status, freeCreditOnly: true }, 502, origin);
    if (data?.error) return reply({ error: "Bytez model returned an inference error.", providerStatus: 200, freeCreditOnly: true }, 502, origin);
    return reply({
      provider: "Bytez",
      model: TEXT_PROOF_MODEL,
      modelLicense: TEXT_PROOF_LICENSE,
      freeCreditOnly: true,
      paidFallbackImplemented: false,
      output: data?.output ?? null,
      proofOnly: true,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch {
    return reply({ error: "Bytez open-model inference unavailable.", freeCreditOnly: true }, 502, origin);
  }
});
