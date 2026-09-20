import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.2";

// Real ingestion boundary for Scarlett's product-usage-only telemetry (never browsing content --
// see docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md for the full contract). Modeled on
// supabase/functions/ftn-ibis-mcp-usage/index.ts's "small, allow-listed, server-validated" shape,
// extended with per-event adversarial hardening because this endpoint's caller is a browser
// extension talking to the open internet, not a trusted server-to-server hop.
//
// The extension never gets a service-role credential; it only ever reaches this function, which
// validates everything and writes with its own service-role client. RLS on
// ftn_scarlett_analytics_events denies anon/authenticated entirely -- this function's writes are
// the only path in, and there is no read path here at all (reads are ftn-owner-control's
// "scarlett-analytics" action, behind full founder+device authorization).

const webOrigins = new Set(["https://ftnplatform.org", "https://www.ftnplatform.org"]);
const extensionOrigin = "chrome-extension://clfkbacenkaicfpgchbmmolfbnanngfe";
const headers = (origin: string | null) => ({
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": origin && (webOrigins.has(origin) || origin === extensionOrigin) ? origin : "https://ftnplatform.org",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST,OPTIONS",
  "cache-control": "no-store",
  "vary": "Origin",
});
const reply = (origin: string | null, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(origin) });

const ALLOWED_EVENT_NAMES = new Set([
  "install", "extension_updated",
  "onboarding_started", "onboarding_completed",
  "session_started",
  "mode_used", "assist_used", "adapt_used", "transform_used", "compare_used", "blend_used",
  "data_faucet_opened", "shield_enabled", "shield_disabled", "site_break_recovery_used",
  "search_used", "find_used",
  "ibis_handoff", "headspace_handoff",
  "paywall_seen", "premium_preview_used", "checkout_started", "checkout_completed", "checkout_failed",
  "subscription_started", "subscription_renewed", "subscription_cancelled", "subscription_expired", "subscription_past_due",
  "error", "performance_sample",
]);
const ACCOUNT_STATES = new Set(["SIGNED_OUT", "FREE", "TRIAL", "SCARLETT_PLUS", "FTN_INTELLIGENCE", "FTN_PRO", "EXPIRED", "PAYMENT_PAST_DUE", "CANCELLED"]);
const SUBSCRIPTION_TIERS = new Set(["FREE", "SCARLETT_PLUS", "FTN_INTELLIGENCE", "FTN_PRO"]);
const BROWSER_FAMILIES = new Set(["chrome", "edge", "opera", "other"]);
const PLATFORM_FAMILIES = new Set(["windows", "mac", "linux", "chromeos", "other"]);
const MODES = new Set(["ORIGINAL", "ASSIST", "ADAPT", "TRANSFORM", "COMPARE", "BLEND"]);
const BUCKETS = new Set(["<50ms", "50-100ms", "100-250ms", "250-500ms", "500ms-1s", ">1s"]);
const ERROR_CLASSES = new Set(["network", "permission", "render", "handoff", "billing", "unknown"]);
const ACQUISITION_SOURCES = new Set(["ftn_site", "organic_search", "youtube", "tiktok", "facebook", "instagram", "direct", "partner", "press", "unknown"]);
// Closed vocabulary only -- this is the entire reason `metadata` can never become a raw-content
// backdoor. Anything not listed here is silently dropped, never stored, no matter what a call site
// (or a compromised client) tries to send.
const ALLOWED_METADATA_KEYS: Record<string, (v: unknown) => boolean> = {
  pageType: (v) => typeof v === "string" && ["APP", "LISTING", "FORM_SERVICE", "ARTICLE", "GENERIC"].includes(v),
  blendLevel: (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100,
  resultCount: (v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1000,
  trackerCategory: (v) => typeof v === "string" && ["analytics", "advertising", "social", "essential", "unknown"].includes(v),
  capability: (v) => typeof v === "string" && /^[a-z][a-z0-9.]{1,60}$/.test(v),
  searchIntent: (v) => typeof v === "string" && ["SHOPPING", "OPPORTUNITY", "LOCATION", "CURRENT_EVENTS", "RESEARCH", "GENERAL"].includes(v),
};

const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isShortString = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
// Defense-in-depth beyond the metadata allow-list: no allowed string value may look like it is
// carrying a URL, markup or a suspiciously long blob, even though the 5 allowed keys above already
// can't hold page content by construction. Applied to every allowed string metadata value.
const looksLikeContent = (v: string) => v.length > 60 || /https?:\/\/|<[a-z]|&lt;|javascript:/i.test(v);

function sanitizeMetadata(raw: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, validate] of Object.entries(ALLOWED_METADATA_KEYS)) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (!validate(value)) continue;
    if (typeof value === "string" && looksLikeContent(value)) continue;
    out[key] = value;
  }
  return out;
}

// Coarse geography from the request's own Accept-Language regional subtag (e.g. "en-TT,en;q=0.9"
// -> "TT"). This is a browser/OS locale signal, not IP geolocation -- no IP address is read, hashed
// or stored anywhere in this function. See docs/FTN_SCARLETT_ANALYTICS_PIPELINE.md section 6 for
// the honest limits (a Trinidad-based user with an en-US locale will show as US).
function coarseRegion(acceptLanguage: string | null): string | null {
  const match = /^[a-z]{2,3}-([A-Z]{2})\b/.exec((acceptLanguage || "").split(",")[0]?.trim() || "");
  return match ? match[1] : null;
}

const windows = new Map<string, { start: number; count: number }>();
function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const slot = windows.get(key);
  if (!slot || now - slot.start > windowMs) { windows.set(key, { start: now, count: 1 }); return false; }
  slot.count++;
  return slot.count > max;
}

function validateEvent(raw: unknown, acceptLanguage: string | null): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (!isUuid(e.eventId) || !ALLOWED_EVENT_NAMES.has(String(e.eventName)) || !isUuid(e.anonymousInstallId) || !isUuid(e.anonymousSessionId)) return null;
  const eventVersion = Number.isInteger(e.eventVersion) && (e.eventVersion as number) >= 1 && (e.eventVersion as number) <= 100 ? e.eventVersion : 1;
  const row: Record<string, unknown> = {
    event_id: e.eventId,
    event_name: e.eventName,
    event_version: eventVersion,
    anonymous_install_id: e.anonymousInstallId,
    anonymous_session_id: e.anonymousSessionId,
    // account_state/subscription_tier here are self-reported by the client for aggregate
    // dashboard dimension purposes ONLY -- never trusted as entitlement truth. Real paid-tier
    // counts, MRR and conversion in the founder dashboard are computed from
    // ftn_scarlett_entitlements/ftn_scarlett_payment_orders (WAM-webhook-verified), not from this
    // column. A spoofed value here can only skew a usage-breakdown chart, never grant access.
    account_state: ACCOUNT_STATES.has(String(e.accountState)) ? e.accountState : null,
    subscription_tier: SUBSCRIPTION_TIERS.has(String(e.subscriptionTier)) ? e.subscriptionTier : null,
    scarlett_version: isShortString(e.scarlettVersion, 20) && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(String(e.scarlettVersion)) ? e.scarlettVersion : null,
    browser_family: BROWSER_FAMILIES.has(String(e.browserFamily)) ? e.browserFamily : null,
    browser_version_bucket: isShortString(e.browserVersionBucket, 20) ? e.browserVersionBucket : null,
    platform_family: PLATFORM_FAMILIES.has(String(e.platformFamily)) ? e.platformFamily : null,
    country_or_region_coarse: coarseRegion(acceptLanguage),
    acquisition_source: ACQUISITION_SOURCES.has(String(e.acquisitionSource)) ? e.acquisitionSource : "unknown",
    campaign_id: isShortString(e.campaignId, 60) && /^[a-z0-9_-]{1,60}$/.test(String(e.campaignId)) ? e.campaignId : null,
    feature: isShortString(e.feature, 40) && !looksLikeContent(String(e.feature)) ? e.feature : null,
    mode: MODES.has(String(e.mode)) ? e.mode : null,
    result: isShortString(e.result, 30) && !looksLikeContent(String(e.result)) ? e.result : null,
    duration_bucket: BUCKETS.has(String(e.durationBucket)) ? e.durationBucket : null,
    performance_bucket: BUCKETS.has(String(e.performanceBucket)) ? e.performanceBucket : null,
    error_class: ERROR_CLASSES.has(String(e.errorClass)) ? e.errorClass : null,
    error_code: isShortString(e.errorCode, 60) && /^[a-z0-9_-]{1,60}$/.test(String(e.errorCode)) ? e.errorCode : null,
    experiment_id: isShortString(e.experimentId, 60) && /^[a-z0-9_-]{1,60}$/.test(String(e.experimentId)) ? e.experimentId : null,
    experiment_variant: isShortString(e.experimentVariant, 40) && /^[a-z0-9_-]{1,40}$/.test(String(e.experimentVariant)) ? e.experimentVariant : null,
    metadata: sanitizeMetadata(e.metadata),
    // occurred_at is deliberately NOT set here -- the table's `default now()` is the only source of
    // truth for when an event happened. A client-supplied timestamp is never read or trusted.
  };
  return row;
}

const MAX_EVENTS_PER_BATCH = 25;
const MAX_BODY_BYTES = 40_000;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  const isWebOrigin = !origin || webOrigins.has(origin);
  const isExtensionOrigin = origin === extensionOrigin;
  if (req.method !== "POST" || !(isWebOrigin || isExtensionOrigin)) return reply(origin, { error: "Not allowed" }, 403);

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) return reply(origin, { error: "Payload too large" }, 413);
  let parsed: any;
  try { parsed = JSON.parse(rawBody); } catch { return reply(origin, { error: "Invalid JSON" }, 400); }
  const events = Array.isArray(parsed?.events) ? parsed.events.slice(0, MAX_EVENTS_PER_BATCH) : [];
  if (!events.length) return reply(origin, { error: "No events" }, 422);

  const firstInstallId = isUuid(events[0]?.anonymousInstallId) ? String(events[0].anonymousInstallId) : null;
  if (!firstInstallId) return reply(origin, { error: "A valid anonymous install id is required" }, 422);
  // Rate limit per anonymous install id, not per IP -- IP is never read or retained by this
  // function at all. Generous enough for a legitimate burst of same-tick events (a mode change can
  // fire 2-3 at once) while bounding abuse: 120 events per 5-minute window per install id.
  if (rateLimited(firstInstallId, 120, 5 * 60_000)) return reply(origin, { error: "Too many telemetry events. Slow down." }, 429);

  const acceptLanguage = req.headers.get("accept-language");
  const rows = events.map((e: unknown) => validateEvent(e, acceptLanguage)).filter((r: unknown): r is Record<string, unknown> => r !== null);
  if (!rows.length) return reply(origin, { error: "No valid events in batch" }, 422);

  const url = Deno.env.get("SUPABASE_URL") || "", service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !service) return reply(origin, { error: "Telemetry service is unavailable" }, 503);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  // upsert on the event_id unique index, ignoring duplicates -- a retried/replayed submission is
  // acknowledged as a no-op, never double-counted and never treated as a hard error (server must
  // fail safely, per the adversarial "replayed event ID" test case).
  const { error } = await admin.from("ftn_scarlett_analytics_events").upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });
  if (error) return reply(origin, { error: "Telemetry was not recorded" }, 500);
  return reply(origin, { recorded: rows.length });
});
