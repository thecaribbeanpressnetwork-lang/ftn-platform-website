// FTN Platform — ibis AUDIO_TRANSCRIPTION + TEXT_TO_SPEECH route via Cloudflare Workers AI.
// Mirrors supabase/functions/ibis-image-cloudflare's shape exactly -- same CORS/rate-limit/
// fail-closed pattern, same account and free Neuron allocation, same ZERO_COST_TO_IBIS
// classification (Neuron-billed like every other Workers AI model already integrated, confirmed
// against developers.cloudflare.com/workers-ai/platform/pricing/ -- both models fall well within
// the account's free daily Neuron allocation at the volumes IBIS would send). Registered in
// js/ibis-provider-registry.js as cloudflare-workers-ai-whisper (@cf/openai/whisper-large-v3-turbo,
// AUDIO_TRANSCRIPTION -- MIT licensed) and cloudflare-workers-ai-aura-tts (@cf/deepgram/aura-2-en,
// TEXT_TO_SPEECH). One function serves both -- mode selects the real upstream model, never an
// arbitrary client-supplied model id.
//
// Real, human-verified round-trip test (2026-08-21, see IBIS-MAP.md): aura-2-en synthesized real
// speech audio for "FTN Platform connects the Caribbean.", whisper-large-v3-turbo transcribed it
// back to "FTN platform connects the Caribbean." (only a capitalization difference) with real
// word-level timestamps and a real VTT payload -- both models confirmed EXECUTABLE this way.

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

// Same per-IP window shape as ibis-query, ibis-assistant and ibis-image-cloudflare.
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

// Fixed allowlist -- the client picks a registry provider id and a mode, never a raw Cloudflare
// model string, so this route can never be pointed at an unreviewed model.
const ASR_MODEL = "@cf/openai/whisper-large-v3-turbo";
const TTS_MODEL = "@cf/deepgram/aura-2-en";

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);

  let payload: { mode?: unknown; audio?: unknown; text?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const mode = payload.mode === "transcribe" || payload.mode === "speak" ? payload.mode : null;
  if (!mode) return reply({ error: "mode must be \"transcribe\" or \"speak\"." }, 400, origin);

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (!accountId || !apiToken) return reply({ error: "ibis speech is not configured yet on this route. No request was sent and nothing was charged." }, 503, origin);

  try {
    if (mode === "transcribe") {
      const audio = typeof payload.audio === "string" ? payload.audio : "";
      if (!audio) return reply({ error: "Provide base64-encoded audio to transcribe." }, 400, origin);
      if (audio.length > 20_000_000) return reply({ error: "Audio is too large for this route." }, 413, origin);

      const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${ASR_MODEL}`, {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${apiToken}` },
        body: JSON.stringify({ audio }),
        // Phase 4A fix: bounded timeout, same pattern already proven in ibis-query.
        signal: AbortSignal.timeout(20_000),
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok || data?.success === false) {
        console.error("Cloudflare Workers AI transcription request failed", upstream.status, JSON.stringify(data?.errors || data));
        return reply({ error: "ibis transcription is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
      }
      const text = typeof data?.result?.text === "string" ? data.result.text : null;
      if (text === null) return reply({ error: "ibis did not return a transcription. Please try again." }, 502, origin);
      return reply({
        text,
        segments: Array.isArray(data.result.segments) ? data.result.segments : [],
        vtt: typeof data.result.vtt === "string" ? data.result.vtt : null,
        wordCount: typeof data.result.word_count === "number" ? data.result.word_count : null,
        model: ASR_MODEL,
        generatedAt: new Date().toISOString(),
      }, 200, origin);
    }

    // mode === "speak"
    const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 2_000) : "";
    if (!text) return reply({ error: "Provide text to speak." }, 400, origin);

    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${TTS_MODEL}`, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${apiToken}` },
      body: JSON.stringify({ text, speaker: "luna", encoding: "mp3" }),
      // Phase 4A fix: bounded timeout, same pattern already proven in ibis-query.
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("Cloudflare Workers AI speech request failed", upstream.status, errText.slice(0, 500));
      return reply({ error: "ibis speech synthesis is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const audio = btoa(binary);
    return reply({ audio, mimeType: "audio/mpeg", model: TTS_MODEL, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis-speech-cloudflare server error", error);
    return reply({ error: "ibis speech is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
  }
});
