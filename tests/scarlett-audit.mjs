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
assert.doesNotMatch(background,/chrome\.storage/,'the capture reply must go straight back to the tab, never be persisted');
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

for(const name of ['popup.html','popup.css','popup.js','background.js','page-understanding.js','transformation-policy.js','representation-engine.js','deck-renderer.js','content.js','ibis-handoff.js','README.md']){
  assert.ok(fs.statSync(new URL(name,root)).size>20,`${name} should exist and be non-empty`);
}

// No source file in the extension makes any outbound network call -- the only "leave the device"
// actions are the explicit, reviewed session-storage handoff, the background worker opening an
// ftnplatform.org tab, and the ephemeral local screenshot capture that never leaves the browser.
for(const [name,source] of Object.entries({understanding,policy,content,handoff,background,popup,representation,deckRenderer})){
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/,`${name} must not make a network call`);
}

console.log('Scarlett audit: minimal permissions, local analysis, explicit policy contract (Original/Assist/Adapt/Transform/Compare/Blend), reversible ledger, grounded representation engine, accessibility layer, optional intent capture and review-before-send ibis/Headspace handoff verified.');
