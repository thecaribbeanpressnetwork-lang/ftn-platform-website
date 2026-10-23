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

assert.equal(manifest.manifest_version,3);
assert.equal(manifest.name,'Scarlett by FTN');
assert.deepEqual([...manifest.permissions].sort(),['activeTab','scripting','storage'].sort());
for(const forbidden of ['<all_urls>','history','cookies','webRequest','geolocation','clipboardRead','clipboardWrite']){
  assert(!manifest.permissions.includes(forbidden),`Scarlett must not request ${forbidden}`);
}
assert.deepEqual([...manifest.host_permissions].sort(),[
  'https://ftnplatform.org/ibis-ai/*',
  'https://www.ftnplatform.org/ibis-ai/*',
  'https://ftnplatform.org/ibis-headspace-preview/*',
  'https://www.ftnplatform.org/ibis-headspace-preview/*'
].sort());
assert.equal(manifest.background.service_worker,'background.js');
assert.equal(manifest.content_scripts.length,1,'Scarlett must ship exactly one content script definition in V1');
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
assert.doesNotMatch(understanding,/fetch\s*\(/);
assert.doesNotMatch(understanding,/XMLHttpRequest/);

// Transformation policy: full explicit contract per the V1 spec (requested vs effective mode,
// reason, risk, preserved regions, allowed/blocked operation classes) -- not just a bare mode string.
assert.match(policy,/SENSITIVE_SURFACE_ASSIST_ONLY/);
assert.match(policy,/COMPLEX_APP_MUSCLE_MEMORY/);
assert.match(policy,/\['ORIGINAL','ASSIST','ADAPT'\]/);
assert.match(policy,/requestedMode/);
assert.match(policy,/effectiveMode/);
assert.match(policy,/preservedRegions/);
assert.match(policy,/allowedOperations/);
assert.match(policy,/blockedOperations/);
assert.match(policy,/ALWAYS_BLOCKED/);
assert.doesNotMatch(policy,/TRANSFORM|COMPARE|BLEND/);

// Content/renderer: reversible ledger with real operation metadata, accessibility layer, optional
// intent capture, and the conditional Headspace escalation -- still no network call, no innerHTML,
// no cookie/history access.
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
assert.doesNotMatch(content,/fetch\s*\(/);
assert.doesNotMatch(content,/document\.cookie|chrome\.history|chrome\.cookies/);
assert.doesNotMatch(content,/innerHTML\s*=/);
assert.doesNotMatch(content,/TRANSFORM|COMPARE|BLEND/);

// Background: routes the two escalation targets, still only ever ftnplatform.org destinations.
assert.match(background,/ibis-headspace-preview/);
assert.match(background,/ibis-ai/);
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

for(const name of ['popup.html','popup.css','popup.js','background.js','page-understanding.js','transformation-policy.js','content.js','ibis-handoff.js','README.md']){
  assert.ok(fs.statSync(new URL(name,root)).size>20,`${name} should exist and be non-empty`);
}

// No source file in the extension makes any outbound network call -- the only two "leave the
// device" actions are the explicit, reviewed session-storage handoff plus the background worker
// opening an ftnplatform.org tab, both gated on an explicit user click.
for(const [name,source] of Object.entries({understanding,policy,content,handoff,background,popup})){
  assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/,`${name} must not make a network call`);
}

console.log('Scarlett V1 audit: minimal permissions, local analysis, explicit policy contract, reversible ledger, accessibility layer, optional intent capture and review-before-send ibis/Headspace handoff verified.');
