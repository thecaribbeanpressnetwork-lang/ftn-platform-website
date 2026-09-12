// FTN Platform — founder-authorized IBIS voice synthesis.
// The public IBIS voice contract is the founder's enrolled voice, never a generic narrator.
// Voice enrollment is deliberately NOT exposed by this public function; only a pre-enrolled private voice ID may synthesize.
const allowedOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
function originAllowed(origin: string | null) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && /^(?:[a-z0-9-]+\.)?ftn-platform-website\.pages\.dev$/i.test(u.hostname);
  } catch { return false; }
}
function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && originAllowed(origin) ? origin : "https://ftnplatform.org",
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
function looksLikeMp3(bytes: Uint8Array) {
  if (bytes.length < 4) return false;
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return id3 || frame;
}
const SAMPLE_SHA256 = "a1c58062344bb586dad665b9db6b81bba56af85fbffd214a6c17df3f4d270e9b";
const SAMPLE_DURATION_SECONDS = 546.6265;
const SAMPLE_CODEC = "opus";
const SAMPLE_RATE_HZ = 48000;
const SAMPLE_CHANNELS = 1;
const MODEL_ID = "eleven_multilingual_v2";
const windows = new Map<string, { count: number; resetAt: number }>();
function withinLimit(ip: string) {
  const now = Date.now();
  const c = windows.get(ip);
  if (!c || c.resetAt <= now) {
    windows.set(ip, { count: 1, resetAt: now + 5 * 60_000 });
    return true;
  }
  if (c.count >= 20) return false;
  c.count += 1;
  return true;
}
Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: originAllowed(origin) ? 204 : 403, headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (!originAllowed(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  let payload: { action?: unknown; text?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
  const voiceId = Deno.env.get("IBIS_FOUNDER_VOICE_ID") || "";
  const configured = Boolean(apiKey && voiceId);

  if (payload.action === "health") return reply({
    capability: "FOUNDER_TEXT_TO_SPEECH",
    provider: "elevenlabs",
    configured,
    ready: configured,
    founderVoiceRequired: true,
    genericVoiceAcceptedAsPrimary: false,
    voiceEnrolled: Boolean(voiceId),
    credentialConfigured: Boolean(apiKey),
    model: MODEL_ID,
    referenceSample: {
      sha256: SAMPLE_SHA256,
      durationSeconds: SAMPLE_DURATION_SECONDS,
      codec: SAMPLE_CODEC,
      sampleRateHz: SAMPLE_RATE_HZ,
      channels: SAMPLE_CHANNELS,
    },
    generationAttempted: false,
    checkedAt: new Date().toISOString(),
  }, 200, origin);

  if (payload.action !== "speak") return reply({ error: "action must be health or speak." }, 400, origin);
  if (!configured) return reply({
    error: "IBIS founder voice is not enrolled/configured yet. Generic speech is not an acceptable substitute for the public IBIS voice.",
    capability: "FOUNDER_TEXT_TO_SPEECH",
    founderVoiceRequired: true,
    voiceEnrolled: Boolean(voiceId),
    credentialConfigured: Boolean(apiKey),
  }, 503, origin);

  const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 2500) : "";
  if (!text) return reply({ error: "Provide text to speak." }, 400, origin);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "IBIS voice is rate-limited. Please wait a few minutes and try again." }, 429, origin);

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "accept": "audio/mpeg",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.52, similarity_boost: 0.82, style: 0.12, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("ibis-founder-voice upstream error", upstream.status, detail.slice(0, 500));
      return reply({ error: "IBIS founder voice synthesis is temporarily unavailable.", providerStatus: upstream.status }, 502, origin);
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (!looksLikeMp3(bytes)) return reply({ error: "IBIS founder voice returned an unrecognized audio artifact and refused to label it MP3." }, 502, origin);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return reply({
      audio: btoa(binary),
      mimeType: "audio/mpeg",
      extension: "mp3",
      provider: "ElevenLabs",
      model: MODEL_ID,
      voiceIdentity: "IBIS_FOUNDER_VOICE",
      referenceSampleSha256: SAMPLE_SHA256,
      generatedAt: new Date().toISOString(),
    }, 200, origin);
  } catch (error) {
    console.error("ibis-founder-voice server error", error);
    return reply({ error: "IBIS founder voice synthesis is temporarily unavailable." }, 502, origin);
  }
});
