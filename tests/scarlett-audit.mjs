import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../apps/ftn-scarlett-browser-extension/',import.meta.url);
const read=(name)=>fs.readFileSync(new URL(name,root),'utf8');
const manifest=JSON.parse(read('manifest.json'));
const popup=read('popup.js');
const understanding=read('page-understanding.js');
const policy=read('transformation-policy.js');
const content=read('content.js');
const handoff=read('ibis-handoff.js');
const background=read('background.js');
const representation=read('representation-engine.js');
const deckRenderer=read('deck-renderer.js');
const popupHtml=read('popup.html');
const shield=read('shield.js');
const trackerRegistry=read('tracker-registry.js');
const searchClient=read('ibis-search-client.js');
const entitlements=read('entitlements.js');
const analytics=read('analytics.js');
const analyticsDashboard=read('analytics-dashboard.js');

assert.equal(manifest.manifest_version,3);
assert.equal(manifest.name,'Scarlett by FTN');
assert.deepEqual([...manifest.permissions].sort(),['activeTab','scripting','storage'].sort());
for(const forbidden of ['<all_urls>','history','cookies','webRequest','declarativeNetRequest','geolocation','clipboardRead','clipboardWrite']){
  assert(!manifest.permissions.includes(forbidden),`Scarlett Core must not request ${forbidden} -- optional Shield permissions belong in their own opt-in bundle, never Core`);
}
assert.deepEqual([...manifest.host_permissions].sort(),[
  'https://ftnplatform.org/ibis-ai/*',
  'https://www.ftnplatform.org/ibis-ai/*',
  'https://ftnplatform.org/ibis-headspace-preview/*',
  'https://www.ftnplatform.org/ibis-headspace-preview/*'
].sort());
assert.equal(manifest.background.service_worker,'background.js');
assert.equal(manifest.content_scripts.length,1,'Scarlett must ship exactly one content script definition');
assert.deepEqual([...manifest.content_scripts[0].matches].sort(),[...manifest.host_permissions].sort(),'content script matches must stay identical to the declared host permissions (no silent scope drift)');

// Shield: webRequest/declarativeNetRequest/<all_urls> must be optional, never baked into Core --
// this is the whole point of the opt-in bundle (§16 of the product definition).
assert.deepEqual([...manifest.optional_permissions].sort(),['declarativeNetRequest','webRequest'].sort());
assert.deepEqual(manifest.optional_host_permissions,['<all_urls>']);

// Tracker registry: a curated, disclosed list, not a claim of completeness. Payment/CDN/font
// infrastructure must never be blockable (blocking it would break ordinary site functionality).
assert.match(trackerRegistry,/UNKNOWN/);
assert.match(trackerRegistry,/FUNCTIONALLY_REQUIRED/);
for(const neverBlockDomain of ['js.stripe.com','fonts.gstatic.com','cdnjs.cloudflare.com']){
  assert(trackerRegistry.includes(neverBlockDomain),`Tracker registry missing expected functionally-required domain: ${neverBlockDomain}`);
}
assert.doesNotMatch(trackerRegistry,/fetch\s*\(|XMLHttpRequest/);

// Shield: gated entirely behind chrome.permissions.request()/contains()/remove(), real
// declarativeNetRequest blocking (not a fake "blocked" label), a real webRequest observer that
// excludes the page's own origin from the tally, and a local, disclosed site-exception mechanism.
assert.match(shield,/chrome\.permissions\.request/);
assert.match(shield,/chrome\.permissions\.contains/);
assert.match(shield,/chrome\.permissions\.remove/);
assert.match(shield,/declarativeNetRequest\.updateDynamicRules/);
assert.match(shield,/onBeforeRequest/);
assert.match(shield,/details\.type === 'main_frame'\) return/,'the page\'s own top-level navigation must never be counted as a third-party connection');
assert.match(shield,/excludedInitiatorDomains/);
assert.match(shield,/blockableDomains/);
assert.match(trackerRegistry,/neverBlock/);
assert.doesNotMatch(shield,/\bfetch\s*\(|XMLHttpRequest/);

// Page understanding: local, bounded, deterministic. No network call of any kind.
assert.match(understanding,/google-sheets/);
assert.match(understanding,/google-docs/);
assert.match(understanding,/gmail/);
assert.match(understanding,/google-calendar/);
assert.match(understanding,/PASSWORD_FIELD/);
assert.match(understanding,/PAYMENT_FIELD/);
assert.match(understanding,/HEALTH_CONTEXT/);
assert.match(understanding,/pricingFacts/);
assert.match(understanding,/deadlineFacts/);
assert.match(understanding,/eligibilitySignal/);
assert.match(understanding,/downloadFacts/);
assert.match(understanding,/warningFacts/);
assert.match(understanding,/accessibilitySignals/);
assert.match(understanding,/imagesMissingAlt/);
assert.match(understanding,/focusFacts/);
assert.match(understanding,/editableSurface/);
assert.match(understanding,/_mainRegion/);
assert.doesNotMatch(understanding,/fetch\s*\(/);
assert.doesNotMatch(understanding,/XMLHttpRequest/);

// Transformation policy: the full V2 mode continuum (Original/Assist/Adapt/Transform/Compare/
// Blend), an explicit contract (requested vs effective mode, reason, risk, preserved regions,
// allowed/blocked operation classes), and a risk-capped Blend ceiling.
assert.match(policy,/SENSITIVE_SURFACE_ASSIST_ONLY/);
assert.match(policy,/COMPLEX_APP_MUSCLE_MEMORY/);
assert.match(policy,/MODES\s*=\s*\['ORIGINAL','ASSIST','ADAPT','TRANSFORM','COMPARE','BLEND'\]/);
assert.match(policy,/requestedMode/);
assert.match(policy,/effectiveMode/);
assert.match(policy,/preservedRegions/);
assert.match(policy,/allowedOperations/);
assert.match(policy,/blockedOperations/);
assert.match(policy,/ALWAYS_BLOCKED/);
assert.match(policy,/BLEND_STOPS/);
assert.match(policy,/resolveBlend/);
assert.match(policy,/resolveCompare/);
assert.match(policy,/maxBlendLevel/);
// Transform must collapse to Assist under exactly the same two conditions Adapt already does --
// a sensitive surface or a known complex app -- never a separate, weaker rule.
assert.match(policy,/\(requested\s*===\s*'ADAPT'\s*\|\|\s*requested\s*===\s*'TRANSFORM'\)\s*&&\s*model\?\.risk\?\.level\s*===\s*'HIGH'/);
assert.match(policy,/\(requested\s*===\s*'ADAPT'\s*\|\|\s*requested\s*===\s*'TRANSFORM'\)\s*&&\s*model\?\.app/);

// Representation engine: never invents content -- every section binds to real page-model facts,
// and it refuses to build for a known app or a sensitive surface even if called directly.
assert.match(representation,/sourceBindings/);
assert.match(representation,/transformationOperations/);
assert.match(representation,/reversibilityPlan/);
assert.match(representation,/model\.app \|\| model\.risk\?\.level === 'HIGH'\) return null/);
assert.doesNotMatch(representation,/fetch\s*\(|XMLHttpRequest/);

// Deck renderer: pure DOM, no innerHTML, never touches anything outside the container it is given,
// and never re-implements a foreign site's own action (mirrored actions stay disabled/informational).
assert.match(deckRenderer,/createElement/);
assert.doesNotMatch(deckRenderer,/innerHTML\s*=/);
assert.match(deckRenderer,/disabled\s*=\s*true/);
assert.doesNotMatch(deckRenderer,/fetch\s*\(|XMLHttpRequest/);

// Content/renderer: reversible ledger with real operation metadata, accessibility layer, optional
// intent capture, Headspace escalation, and the Transform/Compare/Blend continuum -- still no
// network call, no innerHTML, no cookie/history access, and content changes stay hide-only
// (never removed) so restore is structurally guaranteed.
assert.match(content,/data-ftn-scarlett-mode/);
assert.match(content,/restoreLedger/);
assert.match(content,/operationId/);
assert.match(content,/operationType/);
assert.match(content,/reversible:true/);
assert.match(content,/Ask ibis about this page/);
assert.match(content,/Open in Headspace/);
assert.match(content,/isComplexEscalationCandidate/);
assert.match(content,/escalation/);
assert.match(content,/chrome\.storage\.session\.set/);
assert.match(content,/chrome\.storage\.local\.(get|set)/);
assert.match(content,/SCARLETT_HANDOFF_V1/);
assert.match(content,/What are you trying to do/);
assert.match(content,/state\.intent/);
assert.match(content,/data-ftn-scarlett-a11y/);
assert.match(content,/Larger text/);
assert.match(content,/Stronger focus/);
assert.match(content,/mountTransformDeck/);
assert.match(content,/data-ftn-scarlett-hidden/);
assert.match(content,/NO_GROUNDED_REPRESENTATION_FALLBACK_ADAPT/,'Transform must gracefully fall back to Adapt, never fabricate a deck for an ungrounded page');
assert.match(content,/runScanAnimation/);
assert.match(content,/reducedMotion/);
assert.match(content,/SCARLETT_CAPTURE_TAB/);
assert.match(content,/compareCaptureFailed/,'Compare must tell the user plainly when the before-capture is unavailable, never pretend it rendered one');
assert.match(content,/blendVisualMode/);
assert.match(content,/blendLevel/);
assert.match(content,/SCARLETT_FAUCET_SUMMARY/);
assert.match(content,/Close the Faucet/);
assert.match(content,/Site broken/);
assert.match(content,/not a claim of complete visibility/);
assert.doesNotMatch(content,/\bfetch\s*\(/);
assert.doesNotMatch(content,/document\.cookie|chrome\.history|chrome\.cookies/);
assert.doesNotMatch(content,/innerHTML\s*=/);
assert.doesNotMatch(content,/\bremoveChild\b/,'content.js must only ever hide source content via the ledger, never remove a source node');

// Background: routes the two escalation targets and the ephemeral, local-only tab capture for
// Compare, still only ever ftnplatform.org destinations plus the capture reply going straight back
// to the requesting tab (never written to storage, never sent anywhere else).
assert.match(background,/ibis-headspace-preview/);
assert.match(background,/ibis-ai/);
assert.match(background,/SCARLETT_CAPTURE_TAB/);
assert.match(background,/captureVisibleTab/);
assert.match(background,/SCARLETT_SHIELD_STATUS/);
assert.match(background,/SCARLETT_SHIELD_REQUEST/);
assert.match(background,/SCARLETT_SHIELD_REVOKE/);
assert.match(background,/SCARLETT_FAUCET_SUMMARY/);
// background.js's only legitimate chrome.storage reference is raising chrome.storage.session's
// access level (checked explicitly further below) -- it must never itself persist the Compare
// screenshot or any other captured data.
assert.doesNotMatch(background,/chrome\.storage\.(local|session)\.(set|get)\(/,'the capture reply must go straight back to the tab, never be persisted by background.js itself');
assert.doesNotMatch(background,/fetch\s*\(/);

assert.match(handoff,/Review the minimal page context before inserting it into ibis/);
assert.match(handoff,/Nothing is sent until you choose Insert/);
assert.match(handoff,/Continue in Headspace/);
assert.match(handoff,/chrome\.storage\.session\.remove/);
assert.doesNotMatch(handoff,/fetch\s*\(/);
assert.doesNotMatch(handoff,/innerHTML\s*=/);

assert.match(popup,/chrome\.scripting\.executeScript/);
assert.match(popup,/SCARLETT_ANALYZE/);
assert.match(popup,/SCARLETT_MODE/);
assert.match(popup,/representation-engine\.js/);
assert.match(popup,/deck-renderer\.js/);
assert.match(popupHtml,/data-mode="TRANSFORM"/);
assert.match(popup,/SCARLETT_SHIELD_STATUS/);
assert.match(popup,/SCARLETT_SHIELD_REQUEST/);
assert.match(popupHtml,/Turn on Data Faucet Protection/);
assert.match(popupHtml,/FTN receives nothing from it/,'popup must explain what FTN receives before requesting the Shield permission, per the product definition\'s explicit disclosure requirement');

// Search with Scarlett / Find with Scarlett: reuse the exact same canonical FTN ibis MCP endpoint
// and verified-real tool names (search, opportunity_scout) the shipped ftn-ibis-browser-extension
// already calls -- not a new, disconnected retrieval stack. Only ever called on an explicit form
// submit (never as the user types), and only ever sends a bare query string, never page content,
// page URL, browsing history or any identifier.
assert.match(searchClient,/jshmidfpqrajxtukzges\.supabase\.co\/functions\/v1\/ftn-ibis-mcp/,'must call the same canonical ibis MCP endpoint the shipped ibis extension uses, not a new stack');
assert.match(searchClient,/opportunity_scout/);
assert.match(searchClient,/classifyIntent/);
assert.doesNotMatch(searchClient,/\.title|\.headings|location\.href|document\./,'Search/Find must never send page content -- only the user-typed query');
assert.match(popup,/searchForm\.addEventListener\('submit'/);
assert.doesNotMatch(popup,/searchQuery\.addEventListener\('input'/,'Search/Find must never fire on keystroke, only on explicit submit');

for(const name of ['popup.html','popup.css','popup.js','background.js','page-understanding.js','transformation-policy.js','representation-engine.js','deck-renderer.js','shield.js','tracker-registry.js','ibis-search-client.js','entitlements.js','analytics.js','analytics-dashboard.html','analytics-dashboard.js','content.js','ibis-handoff.js','README.md']){
  assert.ok(fs.statSync(new URL(name,root)).size>20,`${name} should exist and be non-empty`);
}

// Analytics: real, local-only, privacy-bounded. Never a network call (this is the one guarantee
// that keeps "founder analytics" honest while there is no real backend) -- an explicit allowlist
// of event names, and a structural filter that drops anything that looks like a URL/query/content/
// identifier even if a call site passed one by mistake.
assert.match(analytics,/never makes a network call/);
assert.match(analytics,/KNOWN_EVENTS/);
assert.match(analytics,/url\|href\|query\|text\|content\|title\|email\|selector\|selection/,'the sanitize() filter must reject property names that could carry page content/URLs/queries/identifiers');
assert.doesNotMatch(analytics,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/);
assert.doesNotMatch(analyticsDashboard,/\bfetch\s*\(|XMLHttpRequest/);
const analyticsDashboardHtml=read('analytics-dashboard.html');
assert.match(analyticsDashboardHtml,/Nothing here has ever left your browser/);
assert.match(analyticsDashboardHtml,/Not connected to any backend/);
assert.match(background,/importScripts\(['"]tracker-registry\.js['"],\s*['"]shield\.js['"],\s*['"]analytics\.js['"]\)/);
assert.match(background,/chrome\.runtime\.onInstalled/);
assert.match(content,/function track\(/);
assert.match(content,/track\('transform_used'/);
assert.match(content,/track\('paywall_impression'/);
// Search/Find analytics must never log the query text -- only the local intent classification.
assert.match(popup,/logEvent\(searchMode===.FIND.\?'find_used':'search_used',\{intent:classification\.intent,resultCount:rows\.length\}\)/);

// chrome.storage.session defaults to TRUSTED_CONTEXTS (extension pages/background only) --
// content.js (a content script) calls chrome.storage.session.set() for the ibis/Headspace handoff,
// and ibis-handoff.js reads it back the same way on the destination page. Found live via a full
// click-through integration test (clicking "Ask ibis about this page" threw "Access to storage is
// not allowed from this context" and the handoff never opened ibis at all): without raising the
// access level once from the background worker, that entire path silently fails in real usage.
assert.match(background,/chrome\.storage\.session\.setAccessLevel\(\{\s*accessLevel:\s*'TRUSTED_AND_UNTRUSTED_CONTEXTS'\s*\}\)/,'background.js must raise chrome.storage.session access level so content scripts (content.js, ibis-handoff.js) can actually use it -- otherwise the entire ibis/Headspace handoff silently fails');

// Entitlements: a real, central data model -- but truth-in-labeling is mandatory. Only the free
// tier may be marked LIVE; every paid tier must say PLANNED (no checkout exists), and nothing this
// build actually implements may be gated behind a capability the free tier lacks.
assert.match(entitlements,/NOTHING in this file is connected to a real\s*\n\/\/\s*payment processor/,'entitlements.js must disclose, in its own header, that no real billing exists');
assert.match(entitlements,/status:\s*'LIVE'/);
const plannedTierCount=(entitlements.match(/status:\s*'PLANNED'/g)||[]).length;
assert(plannedTierCount>=3,'every paid tier (plus/intelligence/pro) must be marked PLANNED, not LIVE');
assert.doesNotMatch(entitlements,/\bfetch\s*\(|XMLHttpRequest|stripe|paypal/i,'entitlements.js must not itself talk to any payment processor');
assert.match(popupHtml,/Scarlett Free/);
assert.match(popupHtml,/ftnplatform\.org\/ibis\/pricing\//);
assert.match(popup,/entitlements\.js/,'popup.js should be reading the live entitlement data model, not restating it');
assert.match(content,/isPreviewOnly/,'the in-page Transform preview note must be driven by the entitlement model, not a hardcoded string with no data behind it');

// No source file in the extension makes any outbound network call, with the one disclosed
// exception (ibis-search-client.js, checked separately above) -- the other "leave the device"
// actions are the explicit, reviewed session-storage handoff, the background worker opening an
// ftnplatform.org tab, and the ephemeral local screenshot capture that never leaves the browser.
// Shield's network-layer blocking is declarative (declarativeNetRequest rules), not a fetch of its
// own, and observation is read-only (webRequest), so it belongs in this same no-fetch guarantee.
for(const [name,source] of Object.entries({understanding,policy,content,handoff,background,popup,representation,deckRenderer,shield,trackerRegistry})){
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/,`${name} must not make a network call`);
}

console.log('Scarlett audit: minimal permissions, local analysis, explicit policy contract (Original/Assist/Adapt/Transform/Compare/Blend), reversible ledger, grounded representation engine, accessibility layer, optional intent capture and review-before-send ibis/Headspace handoff verified.');
