// FTN Platform — founder-authorized IBIS voice synthesis gateway.
// Primary path: FTN-controlled open-source Chatterbox Nano service.
// Optional secondary path: a pre-enrolled private ElevenLabs voice, if explicitly configured.
// Generic narrator voices are never accepted as the public IBIS founder voice.
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
function looksLikeWav(bytes: Uint8Array) {
  return bytes.length > 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45;
}
function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const SAMPLE_SHA256 = "a1c58062344bb586dad665b9db6b81bba56af85fbffd214a6c17df3f4d270e9b";
const SAMPLE_DURATION_SECONDS = 546.6265;
const SAMPLE_CODEC = "opus";
const SAMPLE_RATE_HZ = 48000;
const SAMPLE_CHANNELS = 1;
const ELEVEN_MODEL_ID = "eleven_multilingual_v2";
const OPEN_MODEL_ID = "ResembleAI/chatterbox-nano";
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

type OpenHealth = {
  configured?: boolean;
  ready?: boolean;
  voiceEnrolled?: boolean;
  voiceIdentity?: string;
  referenceSampleSha256?: string;
  provider?: string;
  model?: string;
  openSource?: boolean;
  license?: string;
  watermark?: string;
};
async function openVoiceHealth(base: string, token: string): Promise<OpenHealth | null> {
  if (!base || !token) return null;
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/health`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const body = await response.json().catch(() => null) as OpenHealth | null;
    if (!body || body.voiceIdentity !== "IBIS_FOUNDER_VOICE" || body.referenceSampleSha256 !== SAMPLE_SHA256) return null;
    return body;
  } catch { return null; }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response(null, { status: originAllowed(origin) ? 204 : 403, headers: cors(origin) });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405, origin);
  if (!originAllowed(origin)) return reply({ error: "Origin not allowed" }, 403, origin);
  let payload: { action?: unknown; text?: unknown };
  try { payload = await request.json(); } catch { return reply({ error: "Invalid request." }, 400, origin); }

  const openUrl = Deno.env.get("IBIS_FOUNDER_VOICE_OPEN_URL") || "";
  const openToken = Deno.env.get("IBIS_FOUNDER_VOICE_OPEN_TOKEN") || "";
  const elevenApiKey = Deno.env.get("ELEVENLABS_API_KEY") || "";
  const elevenVoiceId = Deno.env.get("IBIS_FOUNDER_VOICE_ID") || "";
  const openHealth = await openVoiceHealth(openUrl, openToken);
  const openReady = Boolean(openHealth?.ready && openHealth?.configured && openHealth?.voiceEnrolled);
  const elevenReady = Boolean(elevenApiKey && elevenVoiceId);
  const configured = openReady || elevenReady;
  const provider = openReady ? (openHealth?.provider || "chatterbox-nano") : elevenReady ? "elevenlabs" : "unconfigured";
  const model = openReady ? (openHealth?.model || OPEN_MODEL_ID) : elevenReady ? ELEVEN_MODEL_ID : OPEN_MODEL_ID;

  if (payload.action === "health") return reply({
    capability: "FOUNDER_TEXT_TO_SPEECH",
    provider,
    model,
    configured,
    ready: configured,
    founderVoiceRequired: true,
    genericVoiceAcceptedAsPrimary: false,
    voiceEnrolled: configured,
    voiceIdentity: "IBIS_FOUNDER_VOICE",
    primaryArchitecture: "open-source-self-hosted",
    openSourcePrimary: {
      provider: "chatterbox-nano",
      model: OPEN_MODEL_ID,
      license: "MIT",
      endpointConfigured: Boolean(openUrl && openToken),
      ready: openReady,
      watermark: openHealth?.watermark || "PerTh",
    },
    optionalSecondary: { provider: "elevenlabs", configured: elevenReady },
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
    error: "IBIS founder voice is not deployed/configured yet. Generic speech is not an acceptable substitute for the public IBIS voice.",
    capability: "FOUNDER_TEXT_TO_SPEECH",
    founderVoiceRequired: true,
    voiceEnrolled: false,
    openSourcePrimaryConfigured: Boolean(openUrl && openToken),
    optionalSecondaryConfigured: elevenReady,
  }, 503, origin);

  const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 2500) : "";
  if (!text) return reply({ error: "Provide text to speak." }, 400, origin);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!withinLimit(ip)) return reply({ error: "IBIS voice is rate-limited. Please wait a few minutes and try again." }, 429, origin);

  if (openReady) {
    try {
      const upstream = await fetch(`${openUrl.replace(/\/$/, "")}/speak`, {
        method: "POST",
        headers: { authorization: `Bearer ${openToken}`, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(90_000),
      });
      const body = await upstream.json().catch(() => ({})) as Record<string, unknown>;
      if (!upstream.ok) {
        console.error("ibis-founder-voice open-source upstream error", upstream.status);
        return reply({ error: "IBIS founder voice synthesis is temporarily unavailable.", providerStatus: upstream.status }, 502, origin);
      }
      const encoded = typeof body.audio === "string" ? body.audio : "";
      const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
      const extension = typeof body.extension === "string" ? body.extension : "";
      const bytes = encoded ? decodeBase64(encoded) : new Uint8Array();
      const validArtifact = (mimeType === "audio/wav" && extension === "wav" && looksLikeWav(bytes)) ||
        (mimeType === "audio/mpeg" && extension === "mp3" && looksLikeMp3(bytes));
      if (!validArtifact || body.voiceIdentity !== "IBIS_FOUNDER_VOICE" || body.referenceSampleSha256 !== SAMPLE_SHA256) {
        return reply({ error: "IBIS founder voice returned an invalid or unverified audio artifact." }, 502, origin);
      }
      return reply({
        audio: encoded,
        mimeType,
        extension,
        provider: body.provider || "chatterbox-nano",
        model: body.model || OPEN_MODEL_ID,
        openSource: true,
        license: body.license || "MIT",
        watermark: body.watermark || "PerTh",
        voiceIdentity: "IBIS_FOUNDER_VOICE",
        referenceSampleSha256: SAMPLE_SHA256,
        generatedAt: new Date().toISOString(),
      }, 200, origin);
    } catch (error) {
      console.error("ibis-founder-voice open-source server error", error);
      return reply({ error: "IBIS founder voice synthesis is temporarily unavailable." }, 502, origin);
    }
  }

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenVoiceId)}`, {
      method: "POST",
      headers: { "xi-api-key": elevenApiKey, "accept": "audio/mpeg", "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: ELEVEN_MODEL_ID, voice_settings: { stability: 0.52, similarity_boost: 0.82, style: 0.12, use_speaker_boost: true } }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) return reply({ error: "IBIS founder voice synthesis is temporarily unavailable.", providerStatus: upstream.status }, 502, origin);
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (!looksLikeMp3(bytes)) return reply({ error: "IBIS founder voice returned an unrecognized audio artifact and refused to label it MP3." }, 502, origin);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return reply({ audio: btoa(binary), mimeType: "audio/mpeg", extension: "mp3", provider: "ElevenLabs", model: ELEVEN_MODEL_ID, voiceIdentity: "IBIS_FOUNDER_VOICE", referenceSampleSha256: SAMPLE_SHA256, generatedAt: new Date().toISOString() }, 200, origin);
  } catch (error) {
    console.error("ibis-founder-voice secondary server error", error);
    return reply({ error: "IBIS founder voice synthesis is temporarily unavailable." }, 502, origin);
  }
});
