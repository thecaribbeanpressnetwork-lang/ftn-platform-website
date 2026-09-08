// ibis funding-demo provider health probe.
// Preview-only: verifies configured provider credentials/model visibility without generating content.
// Never returns credentials or upstream response bodies.

const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);

function headers(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://ftnplatform.org",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

async function checkAnthropic() {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { provider: "Anthropic", state: "NOT_CONFIGURED" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { provider: "Anthropic", state: "UNHEALTHY", httpStatus: res.status };
    const data = await res.json().catch(() => null);
    const ids = Array.isArray(data?.data) ? data.data.map((m: { id?: string }) => m.id).filter(Boolean) : [];
    const configuredModel = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6";
    return {
      provider: "Anthropic",
      state: "HEALTHY",
      configuredModel,
      configuredModelVisible: ids.includes(configuredModel),
      modelCount: ids.length,
    };
  } catch (error) {
    return { provider: "Anthropic", state: "UNREACHABLE", errorClass: error instanceof Error ? error.name : "Error" };
  }
}

async function checkGemini() {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return { provider: "Gemini", state: "NOT_CONFIGURED" };
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { Accept: "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { provider: "Gemini", state: "UNHEALTHY", httpStatus: res.status };
    const data = await res.json().catch(() => null);
    const ids = Array.isArray(data?.models)
      ? data.models.map((m: { name?: string }) => String(m.name || "").replace(/^models\//, "")).filter(Boolean)
      : [];
    const configuredModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    return {
      provider: "Gemini",
      state: "HEALTHY",
      configuredModel,
      configuredModelVisible: ids.includes(configuredModel),
      modelCount: ids.length,
    };
  } catch (error) {
    return { provider: "Gemini", state: "UNREACHABLE", errorClass: error instanceof Error ? error.name : "Error" };
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: headers(origin) });
  if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: headers(origin) });
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers: headers(origin) });

  const checkedAt = new Date().toISOString();
  const providers = await Promise.all([checkAnthropic(), checkGemini()]);
  const healthyCount = providers.filter((p) => p.state === "HEALTHY").length;
  return new Response(JSON.stringify({
    capability: "MODEL_PROVIDER_HEALTH",
    environment: "FUNDING_DEMO_PREVIEW",
    checkedAt,
    healthyCount,
    providers,
  }), { status: 200, headers: headers(origin) });
});
