// FTN Platform — ibis AUDIO_TRANSCRIPTION + TEXT_TO_SPEECH via Cloudflare Workers AI.
// Health is zero-consumption: it checks only whether the required server-side configuration exists.

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

const ASR_MODEL = "@cf/openai/whisper-large-v3-turbo";
const TTS_MODEL = "@cf/deepgram/aura-2-en";

function looksLikeMp3(bytes: Uint8Array) {
  if (bytes.length < 4) return false;
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return id3 || frame;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  let payload: { action?: unknown; mode?: unknown; audio?: unknown; text?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const configured = Boolean(accountId && apiToken);

  if (payload.action === "health") {
    return reply({
      capability: ["TEXT_TO_SPEECH", "AUDIO_TRANSCRIPTION"],
      provider: "cloudflare-workers-ai",
      configured,
      ready: configured,
      ttsModel: TTS_MODEL,
      asrModel: ASR_MODEL,
      generationAttempted: false,
      checkedAt: new Date().toISOString(),
    }, 200, origin);
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "ibis needs a short break. Please wait a few minutes and try again." }, 429, origin);

  const mode = payload.mode === "transcribe" || payload.mode === "speak" ? payload.mode : null;
  if (!mode) return reply({ error: "mode must be \"transcribe\" or \"speak\"." }, 400, origin);
  if (!configured) return reply({ error: "ibis speech is not configured yet on this route. No request was sent and nothing was charged." }, 503, origin);

  try {
    if (mode === "transcribe") {
      const audio = typeof payload.audio === "string" ? payload.audio : "";
      if (!audio) return reply({ error: "Provide base64-encoded audio to transcribe." }, 400, origin);
      if (audio.length > 20_000_000) return reply({ error: "Audio is too large for this route." }, 413, origin);

      const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${ASR_MODEL}`, {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${apiToken}` },
        body: JSON.stringify({ audio }),
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

    const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 2_000) : "";
    if (!text) return reply({ error: "Provide text to speak." }, 400, origin);

    const upstream = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${TTS_MODEL}`, {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${apiToken}` },
      body: JSON.stringify({ text, speaker: "luna", encoding: "mp3" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => "");
      console.error("Cloudflare Workers AI speech request failed", upstream.status, errText.slice(0, 500));
      return reply({ error: "ibis speech synthesis is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (!looksLikeMp3(bytes)) return reply({ error: "ibis received an unrecognized speech artifact and refused to label it as MP3." }, 502, origin);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const audio = btoa(binary);
    return reply({ audio, mimeType: "audio/mpeg", extension: "mp3", model: TTS_MODEL, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis-speech-cloudflare server error", error);
    return reply({ error: "ibis speech is temporarily unavailable on this route. Please try again shortly." }, 502, origin);
  }
});
