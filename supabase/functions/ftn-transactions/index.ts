import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const ALLOWED_TURNSTILE_HOSTS = new Set(["ftnplatform.org", "www.ftnplatform.org"]);
const TURNSTILE_ACTION = "ftn_transaction";
const DEFAULT_REVIEW_CC = "facethenationtt@gmail.com";
const EMAIL_WINDOW_MINUTES = 15;
const EMAIL_WINDOW_LIMIT = 5;

const headers = (origin: string) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOWED.has(origin) ? origin : "https://ftnplatform.org",
  "Access-Control-Allow-Headers": "content-type,x-ftn-turnstile",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Vary": "Origin",
});

const text = (value: unknown, max = 5000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const headerText = (value: unknown, max = 300) => text(value, max).replace(/[\r\n]+/g, " ");

function json(origin: string, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

function safePayloadLines(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const omit = /password|secret|token|credential|authorization|cookie|session|card|cvv/i;
  const lines: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(payload as Record<string, unknown>)) {
    if (lines.length >= 40 || omit.test(rawKey)) continue;
    const key = headerText(rawKey, 80);
    let value = "";
    if (rawValue == null) continue;
    if (["string", "number", "boolean"].includes(typeof rawValue)) {
      value = text(String(rawValue), 900);
    } else {
      try {
        value = JSON.stringify(rawValue).slice(0, 900);
      } catch {
        continue;
      }
    }
    if (key && value) lines.push(`${key}: ${value}`);
  }
  return lines;
}

function base64UrlUtf8(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function gmailAccessToken() {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET") || "";
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN") || "";
  if (!clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Gmail OAuth refresh failed (${response.status})`);
  const result = await response.json();
  const accessToken = typeof result.access_token === "string" ? result.access_token : "";
  if (!accessToken) throw new Error("Gmail OAuth refresh returned no access token");
  return accessToken;
}

function founderDraftMessage(record: Record<string, any>) {
  const reviewCc = headerText(Deno.env.get("FTN_REVIEW_CC") || DEFAULT_REVIEW_CC, 320);
  const recipient = headerText(record.client_email, 320);
  const creator = headerText(record.creator_name || "Creator / client", 200);
  const work = headerText(record.work_title || "Untitled work / request", 300);
  const type = headerText(record.transaction_type || record.tool_id || "FTN transaction", 100);
  const payloadLines = safePayloadLines(record.payload);
  const subject = `FTN ${type} — ${work} — ${record.transaction_id}`;

  const body = [
    `FTN TRANSACTION ${record.transaction_id}`,
    "",
    `Date: ${new Date().toISOString()}`,
    `Creator / client: ${creator}`,
    `Work / request: ${work}`,
    `Transaction type: ${type}`,
    `Country: ${record.country || "Not specified"}`,
    "Authority declaration: CONFIRMED",
    "Human verification: PASSED",
    "",
    "USER-CONFIRMED METADATA",
    ...(payloadLines.length ? payloadLines : ["No additional structured metadata was supplied."]),
    "",
    "NEXT STEP",
    "This message is a founder-review draft only. FTN has recorded the request but has not automatically registered, published, distributed, forwarded, paid, submitted, licensed or accepted any third-party terms on the creator's behalf.",
    "",
    "FTN WORKFLOW DISCLAIMER",
    "FTN provides workflow, metadata and administrative assistance. The creator/rightsholder remains responsible for ownership, accuracy, permissions, registrations, contracts, legal obligations and final submission decisions.",
    "",
    `Reference: ${record.transaction_id}`,
    "FTN Platform · https://ftnplatform.org/",
  ].join("\r\n");

  const mime = [
    `To: ${recipient}`,
    ...(reviewCc ? [`Cc: ${reviewCc}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");

  return base64UrlUtf8(mime);
}

async function createFounderDraft(record: Record<string, any>) {
  const accessToken = await gmailAccessToken();
  if (!accessToken) return { configured: false, draftId: null };

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: { raw: founderDraftMessage(record) } }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`Gmail draft creation failed (${response.status}): ${detail}`);
  }
  const result = await response.json();
  const draftId = typeof result.id === "string" ? result.id : "";
  if (!draftId) throw new Error("Gmail draft creation returned no draft ID");
  return { configured: true, draftId };
}

async function exceedsEmailRateLimit(supabase: any, email: string) {
  const windowStart = new Date(Date.now() - EMAIL_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supabase
    .from("ftn_platform_transactions")
    .select("id", { count: "exact", head: true })
    .eq("client_email", email)
    .gte("created_at", windowStart);
  if (error) {
    console.error("Transaction rate-limit check failed", error);
    throw new Error("Transaction rate-limit check unavailable");
  }
  return (count || 0) >= EMAIL_WINDOW_LIMIT;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST" || !ALLOWED.has(origin)) return json(origin, { ok: false, error: "Not allowed" }, 403);

  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!turnstileSecret) {
    return json(origin, { ok: false, error: "Secure human verification is temporarily unavailable" }, 503);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(origin, { ok: false, error: "Invalid request" }, 400);
  }

  const email = text(body.client_email, 320).toLowerCase();
  const tool = text(body.tool_id, 80);
  const type = text(body.transaction_type, 80);
  const token = text(body.turnstile_token, 4096);

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !tool ||
    !type ||
    body.authority_confirmed !== true ||
    !token
  ) {
    return json(origin, { ok: false, error: "Required transaction fields or human verification are missing" }, 422);
  }

  const verifyBody = new FormData();
  verifyBody.set("secret", turnstileSecret);
  verifyBody.set("response", token);
  const ip = req.headers.get("CF-Connecting-IP");
  if (ip) verifyBody.set("remoteip", ip);

  let human = false;
  try {
    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: verifyBody,
      signal: AbortSignal.timeout(12000),
    });
    const result = await verification.json();
    const hostname = text(result.hostname, 255).toLowerCase();
    const action = text(result.action, 100);
    human = result.success === true && ALLOWED_TURNSTILE_HOSTS.has(hostname) && action === TURNSTILE_ACTION;
  } catch {
    human = false;
  }
  if (!human) return json(origin, { ok: false, error: "Human verification failed" }, 403);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (await exceedsEmailRateLimit(supabase, email)) {
      return json(
        origin,
        {
          ok: false,
          error: `Too many recent FTN transactions for this email. Wait ${EMAIL_WINDOW_MINUTES} minutes before trying again.`,
        },
        429,
      );
    }
  } catch {
    return json(origin, { ok: false, error: "Secure transaction controls are temporarily unavailable" }, 503);
  }

  const transactionId = `FTN-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const record = {
    transaction_id: transactionId,
    tool_id: tool,
    client_email: email,
    creator_name: text(body.creator_name, 200) || null,
    work_title: text(body.work_title, 300) || null,
    country: text(body.country, 100) || null,
    transaction_type: type,
    authority_confirmed: true,
    human_verified: true,
    route: text(body.route, 300) || null,
    payload: body.payload && typeof body.payload === "object" ? body.payload : {},
    founder_status: "FOUNDER_REVIEW",
    legal_version: text(body.legal_version, 50) || null,
    source_origin: origin,
    user_agent: text(req.headers.get("user-agent"), 500) || null,
  };

  const { error: insertError } = await supabase.from("ftn_platform_transactions").insert(record);
  if (insertError) {
    console.error(insertError);
    return json(origin, { ok: false, error: "Transaction could not be recorded" }, 500);
  }

  let draftPrepared = false;
  let draftConfigured = false;
  try {
    const draft = await createFounderDraft(record);
    draftConfigured = draft.configured;
    if (draft.draftId) {
      draftPrepared = true;
      const { error: updateError } = await supabase
        .from("ftn_platform_transactions")
        .update({ gmail_draft_id: draft.draftId, founder_status: "FOUNDER_REVIEW" })
        .eq("transaction_id", transactionId);
      if (updateError) console.error("Gmail draft created but transaction linkage update failed", updateError);
    }
  } catch (error) {
    console.error("Founder-review Gmail draft was not prepared", error);
  }

  return json(
    origin,
    {
      ok: true,
      transaction_id: transactionId,
      status: "FOUNDER_REVIEW",
      draft_prepared: draftPrepared,
      draft_integration_configured: draftConfigured,
    },
    201,
  );
});
