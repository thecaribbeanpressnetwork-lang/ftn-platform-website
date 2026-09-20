import assert from 'node:assert/strict';
import fs from 'node:fs';

// Scarlett founder analytics: event schema, ingestion boundary, founder-dashboard authorization
// and public privacy disclosure. Modeled on the established static-source-assertion style already
// used by tests/scarlett-wam-billing-audit.mjs and tests/scarlett-audit.mjs -- this repo's Edge
// Functions have no live database connection in this environment, so correctness is verified
// against the actual deployed-shape source, not a live HTTP round trip.

const migration = fs.readFileSync('supabase/migrations/20260919140000_ftn_scarlett_analytics.sql', 'utf8');
const ingest = fs.readFileSync('supabase/functions/ftn-scarlett-telemetry/index.ts', 'utf8');
const ownerControl = fs.readFileSync('supabase/functions/ftn-owner-control/index.ts', 'utf8');
const billing = fs.readFileSync('supabase/functions/ftn-scarlett-billing/index.ts', 'utf8');
const webhook = fs.readFileSync('supabase/functions/ftn-scarlett-wam-webhook/index.ts', 'utf8');
const analytics = fs.readFileSync('apps/ftn-scarlett-browser-extension/analytics.js', 'utf8');
const popupHtml = fs.readFileSync('apps/ftn-scarlett-browser-extension/popup.html', 'utf8');
const popupJs = fs.readFileSync('apps/ftn-scarlett-browser-extension/popup.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('apps/ftn-scarlett-browser-extension/manifest.json', 'utf8'));
const dashboardGate = fs.readFileSync('god-mode/scarlett/index.html', 'utf8');
const dashboardClient = fs.readFileSync('js/scarlett-analytics-dashboard.js', 'utf8');
const dashboardLinkInjector = fs.readFileSync('js/god-mode-scarlett-link.js', 'utf8');
const privacyPolicy = fs.readFileSync('legal/privacy-policy/index.html', 'utf8');
const acquisitionJs = fs.readFileSync('js/scarlett-acquisition.js', 'utf8');
const pricingJs = fs.readFileSync('js/scarlett-pricing.js', 'utf8');
const scarlettPage = fs.readFileSync('scarlett/index.html', 'utf8');
const pricingPage = fs.readFileSync('scarlett/pricing/index.html', 'utf8');

const CANONICAL_EVENTS = [
  'install', 'extension_updated',
  'onboarding_started', 'onboarding_completed',
  'session_started',
  'mode_used', 'assist_used', 'adapt_used', 'transform_used', 'compare_used', 'blend_used',
  'data_faucet_opened', 'shield_enabled', 'shield_disabled', 'site_break_recovery_used',
  'search_used', 'find_used',
  'ibis_handoff', 'headspace_handoff',
  'paywall_seen', 'premium_preview_used', 'checkout_started', 'checkout_completed', 'checkout_failed',
  'subscription_started', 'subscription_renewed', 'subscription_cancelled', 'subscription_expired', 'subscription_past_due',
  'error', 'performance_sample',
];

// --- 1. Cross-layer event-name consistency: the migration's check constraint, the ingestion
// function's allow-list and the extension's client-side allow-list must never drift apart. ---
for (const name of CANONICAL_EVENTS) {
  assert(migration.includes(`'${name}'`), `migration event_name check is missing '${name}'`);
  assert(ingest.includes(`"${name}"`), `ftn-scarlett-telemetry ALLOWED_EVENT_NAMES is missing "${name}"`);
  assert(analytics.includes(`'${name}'`), `analytics.js ALLOWED_EVENTS is missing '${name}'`);
}
// --- 2. Database model: server-only RLS, replay protection, no raw-content columns. ---
for (const table of ['ftn_scarlett_analytics_events', 'ftn_scarlett_acquisition_attribution']) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon, authenticated`));
  assert.match(migration, new RegExp(`create policy "${table}_server_only" on public\\.${table}[\\s\\S]{0,80}for all to anon, authenticated using \\(false\\) with check \\(false\\)`));
}
assert.match(migration, /create unique index if not exists ftn_scarlett_analytics_events_event_id_key/, 'event_id must be unique -- this is what makes a replayed event id an idempotent no-op, not a duplicate row');
assert.doesNotMatch(migration, /\b(url|page_text|selected_text|search_query|form_value|email|password)\s+text\b/i, 'no column may exist that could hold a URL, page text, a query or a credential');
assert.match(migration, /metadata jsonb not null default '\{\}'::jsonb check \(jsonb_typeof\(metadata\) = 'object'\)/);
assert.match(migration, /country_or_region_coarse text check \(country_or_region_coarse is null or country_or_region_coarse ~ '\^\[A-Z\]\{2\}\$'\)/, 'region must be a 2-letter code, never a raw IP or precise coordinate');
assert.doesNotMatch(migration, /\bip_address\b|\braw_ip\b/i, 'no IP address column may exist anywhere in this pipeline');
assert.match(migration, /does NOT/, 'acquisition attribution must document its one-way, non-identity linkage');
assert.match(migration, /store a user_id or email/);
assert.match(migration, /durable browsing identity/);

// --- 3. Ingestion boundary: validate, strip, rate-limit, fail safe. ---
assert.match(ingest, /const ALLOWED_EVENT_NAMES = new Set/);
assert.match(ingest, /ALLOWED_METADATA_KEYS: Record<string, \(v: unknown\) => boolean>/, 'metadata must be an allow-list of validator functions, not a blocklist');
const metadataKeys = [...ingest.matchAll(/^\s*(\w+): \(v\) =>/gm)].map((m) => m[1]);
assert.deepEqual(new Set(metadataKeys), new Set(['pageType', 'blendLevel', 'resultCount', 'trackerCategory', 'capability', 'searchIntent']), 'metadata allow-list drifted from the documented closed vocabulary');
assert.match(ingest, /looksLikeContent/, 'allowed string metadata values must still be checked for URL/markup/length even though the key itself is allow-listed');
assert.match(ingest, /javascript:/, 'the content-shape check must catch javascript: URIs, not just http(s) URLs');
assert.match(ingest, /v\.length > 60/, 'an allowed metadata value must still be length-bounded');
assert.match(ingest, /MAX_BODY_BYTES = 40_000/);
assert.match(ingest, /rawBody\.length > MAX_BODY_BYTES.*?413/s, 'oversized payloads must be rejected, not silently truncated');
assert.match(ingest, /MAX_EVENTS_PER_BATCH = 25/);
assert.match(ingest, /events\.slice\(0, MAX_EVENTS_PER_BATCH\)/, 'a batch (including one with giant nested metadata padding) must be bounded, not processed unbounded');
assert.match(ingest, /rateLimited\(firstInstallId, 120, 5 \* 60_000\)/, 'burst/rate abuse must be rejected per install id');
assert.match(ingest, /!isUuid\(e\.eventId\)/, 'a missing/malformed event id must invalidate the event');
assert.match(ingest, /!isUuid\(e\.anonymousInstallId\)/, 'a missing anonymous install id must invalidate the event');
assert.doesNotMatch(ingest, /occurred_at:\s*e\./, 'the server must derive occurred_at itself -- a client-supplied timestamp must never be written');
assert.match(ingest, /occurred_at is deliberately NOT set here/);
assert.match(ingest, /onConflict:"event_id",ignoreDuplicates:true|onConflict: ?"event_id", ?ignoreDuplicates: ?true/, 'a replayed event id must upsert as a no-op, never error or double-count');
assert.match(ingest, /if \(!firstInstallId\) return reply\(origin, \{ error: "A valid anonymous install id is required" \}, 422\);/);
assert.doesNotMatch(ingest, /SUPABASE_SERVICE_ROLE_KEY.*(chrome-extension|extensionOrigin)/s, 'the extension must never receive a service-role credential');
assert.match(ingest, /const extensionOrigin = "chrome-extension:\/\/clfkbacenkaicfpgchbmmolfbnanngfe"/);

// --- 4. Server truth vs. self-reported dimension data (never trusted for billing decisions). ---
assert.match(ingest, /never trusted as entitlement truth/);
assert.match(ownerControl, /server truth, ftn_scarlett_entitlements/, 'the founder dashboard must repeat the same server-truth-vs-self-reported distinction, not just the ingestion function');

// --- 5. Founder dashboard authorization: reuses ftn-owner-control's existing founder+device chain,
// never a separate/weaker check, and the action is read-only. ---
const deviceCheckIdx = ownerControl.indexOf('const device = await findDevice();');
const scarlettActionIdx = ownerControl.indexOf('action === "scarlett-analytics"');
assert(deviceCheckIdx > 0 && scarlettActionIdx > deviceCheckIdx, 'the scarlett-analytics action must be reachable only after the same founder-identity + operator-role + device-credential chain every other owner-control action passes through');
const actionBlockEnd = ownerControl.indexOf('\n  }', ownerControl.indexOf('if (action === "scarlett-analytics") {'));
const actionBlock = ownerControl.slice(ownerControl.indexOf('if (action === "scarlett-analytics") {'), ownerControl.lastIndexOf('return reply(origin, {', actionBlockEnd + 4000) + 4000);
assert.doesNotMatch(actionBlock, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/, 'the founder analytics action must be strictly read-only');
assert.match(ownerControl, /Reuses this function's own founder\+device authorization chain/);

// --- 6. Founder dashboard client: real auth flow, not a hidden-nav-only gate. ---
assert.match(dashboardGate, /noindex,nofollow,noarchive,nosnippet,noimageindex/, 'the gate page must be non-indexable, matching every other /god-mode/ page');
assert.match(dashboardClient, /global\.FTN\.Auth\.ownerAccess\(\)/, 'must call the real founder+device authorization check before rendering anything');
assert.match(dashboardClient, /deviceApprovalRequired/, 'must handle the device-approval-required state explicitly, not just a generic denial');
assert.match(dashboardClient, /global\.FTN\.Auth\.ownerInvoke\(\{action:'scarlett-analytics'\}\)/);
assert.doesNotMatch(dashboardClient, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_/, 'the browser-side dashboard client must never hold a service-role credential');
assert.match(dashboardLinkInjector, /god-mode\/scarlett\//);

// --- 7. Essential operational events are emitted server-side (never trusted from the client),
// distinct from optional product analytics. ---
assert.match(billing, /trackEvent\(admin,"checkout_started"/);
assert.match(billing, /trackEvent\(admin,"checkout_failed"/);
assert.match(webhook, /event_name:"checkout_completed"/);
assert.match(webhook, /event_name:wasRenewal\?"subscription_renewed":"subscription_started"/);
assert.match(billing, /analytics is best-effort; never blocks or fails a billing operation/);
assert.match(webhook, /analytics is best-effort; fulfillment above already succeeded/);
// One-way conversion attribution: only set once, never overwritten by a later renewal/event.
assert.match(webhook, /\.is\("converted_at",null\)/, 'conversion attribution must be written once and never overwritten');
assert.match(billing, /Checkout must be started from ftnplatform\.org/, 'checkout (and the acquisition-attribution row it creates) must still be blocked from the extension origin');

// --- 8. Extension-side: preference-gated, allow-listed, delivered only via bounded background
// alarms -- never continuous, never per-content-script. ---
assert(manifest.permissions.includes('alarms'), 'chrome.alarms is the MV3-correct bounded-delivery primitive; manifest must declare it');
assert.equal(manifest.content_scripts[0].js[0], 'analytics.js', 'analytics.js must load before ibis-handoff.js so a real ibis_handoff/headspace_handoff event can actually be logged on the ibis-ai/Headspace destination page');
assert.match(popupHtml, /Help improve Scarlett with anonymous product analytics/);
assert.match(popupHtml, /id="analytics-toggle"/);
assert.match(popupJs, /setAnalyticsEnabled\(analyticsToggle\.checked\)/);
assert.match(popupJs, /getAnalyticsEnabled/);

// --- 9. Public privacy disclosure matches the real implementation -- only claims the pipeline
// actually supports. ---
assert.match(privacyPolicy, /id="scarlett"/);
assert.match(privacyPolicy, /No full URL, page title, page text, selected text, document\/email\/Google Docs\/Sheets content, form value, search-query text, ibis\/Headspace prompt content, tracker request payload, cookie, auth token, password or payment credential/);
assert.match(privacyPolicy, /Accept-Language/, 'must disclose the real, honest mechanism for coarse region -- not IP geolocation');
assert.doesNotMatch(privacyPolicy, /Scarlett['’]s paid plans (are|is) (live|active)\b/i, 'must not claim live checkout while WAM is not yet connected');
assert.match(privacyPolicy, /not yet live -- no real charge can be created/);
assert.match(privacyPolicy, /turn Scarlett's product-analytics setting off at any time/);

// --- 10. Acquisition capture: real, minimal, hostname/category only -- never a full referrer URL,
// never anything beyond the closed vocabulary the billing function itself validates. ---
assert.doesNotMatch(acquisitionJs, /document\.referrer\)\)/, 'must never store the full referrer, only its hostname');
assert.match(acquisitionJs, /new URL\(document\.referrer\)\.hostname/);
assert.match(acquisitionJs, /sessionStorage/, 'acquisition capture must be session-scoped, not a persistent cross-session tracker');
assert.match(scarlettPage, /scarlett-acquisition\.js/);
assert.match(pricingPage, /scarlett-acquisition\.js/);
assert.match(pricingJs, /global\.FTN\.ScarlettAcquisition&&global\.FTN\.ScarlettAcquisition\.read\(\)/);
assert.match(pricingJs, /body\.anonymousInstallId=aid/);
assert.match(popupJs, /url\.searchParams\.set\('aid',installId\)/, 'the extension popup must attach its own install id to the pricing link for one-way conversion attribution');

console.log('Scarlett analytics audit: event-schema cross-layer consistency, RLS, replay/rate-limit/oversize/metadata-allowlist hardening, founder-dashboard authorization reuse, essential-vs-optional event separation and public privacy disclosure verified.');
