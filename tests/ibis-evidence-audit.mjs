// FTN Platform — Phase 4B ibis evidence disclosure audit (static/local, no browser, no network).
//
// Guards js/ibis-evidence.js's evidence-display decision matrix and its mapping of
// js/ibis-provenance.js's envelope into js/trust-card.js's existing data shape. DOM-rendering
// behavior (safe HTML escaping in the real browser, keyboard/ARIA interaction, visual states) is
// covered separately in tests/ibis-evidence-release.mjs, a real Playwright suite -- this file is
// pure logic: given an input, what decision/data comes out.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-provider-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-provenance.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-evidence.js', 'utf8'), context);
const Evidence = context.window.FTN.IbisEvidence;
const Provenance = context.window.FTN.IbisProvenance;

// --- 1. Evidence-display decision matrix --------------------------------------------------------

// Rule 1 (absolute): a degraded/incomplete/fallback state always requires evidence, regardless of
// capability -- even a "clearly labelled deterministic tool" capability, which is otherwise
// evidence-optional.
assert.equal(Evidence.isEvidenceRequired({ capability: 'BPM_DETECTION', degradedState: 'ALL_PROVIDERS_FAILED' }), true, 'a degraded state must always require evidence, even for an otherwise-optional deterministic tool');
assert.equal(Evidence.isEvidenceRequired({ capability: 'TEXT', degradedState: 'NO_ELIGIBLE_PROVIDER' }), true);
assert.equal(Evidence.isEvidenceRequired({ capability: 'TEXT', routingPath: ['provider-a', 'provider-b'] }), true, 'a real fallback (more than one provider attempted) must require evidence even on eventual success');
assert.equal(Evidence.isEvidenceRequired({ capability: 'TEXT', routingPath: ['provider-a'] }), false, 'a single-attempt success on a casual TEXT prompt must not force evidence just because routingPath exists');

// Rule 2: inherently external-evidence-bearing capabilities/results.
assert.equal(Evidence.isEvidenceRequired({ capability: 'LIVE_INTELLIGENCE' }), true, 'LIVE_INTELLIGENCE must always require evidence -- current facts/live conditions');
assert.equal(Evidence.isEvidenceRequired({ capability: 'TEXT', sources: [{ url: 'https://example.com' }] }), true, 'a result carrying real external sources must require evidence regardless of capability');
assert.equal(Evidence.isEvidenceRequired({ capability: 'TEXT', sources: [] }), false, 'an empty sources array must not force evidence');

// Rule 3: clearly labelled deterministic tools are evidence-optional by design.
for (const cap of Evidence.DETERMINISTIC_TOOL_CAPABILITIES) {
  assert.equal(Evidence.isEvidenceRequired({ capability: cap, prompt: 'make it happen' }), false, `${cap} is a clearly labelled deterministic tool and must be evidence-optional by default`);
}

// Rule 4: TEXT/creative capability, content-dependent on the user's own prompt.
const EVIDENCE_REQUIRED_PROMPTS = [
  'What does the government say about the new parliament bill?',
  'What percentage of the population voted in the last election?',
  'Is it safe to drink the tap water right now?',
  'What is the current interest rate on a mortgage here?',
  'Do I have legal rights if my landlord breaks the lease?',
  'What is happening in Port of Spain right now?',
  'Which of these two providers should I recommend to a client?',
];
for (const prompt of EVIDENCE_REQUIRED_PROMPTS) {
  assert.equal(Evidence.isEvidenceRequired({ capability: 'TEXT', prompt }), true, `should require evidence: "${prompt}"`);
}
const EVIDENCE_OPTIONAL_PROMPTS = [
  'Write me a short poem about a Caribbean sunset.',
  'Give me three brainstorm ideas for a birthday party theme.',
  'Can you help me rephrase this sentence to sound friendlier?',
  'Tell me a joke.',
];
for (const prompt of EVIDENCE_OPTIONAL_PROMPTS) {
  assert.equal(Evidence.isEvidenceRequired({ capability: 'TEXT', prompt }), false, `should be evidence-optional: "${prompt}"`);
}

// Creative visual generation and deterministic-router matches are never forced into evidence
// (no capability string reaches isEvidenceRequired for them at all in the real UI wiring -- this
// just confirms an unrecognized/absent capability defaults to optional, not required).
assert.equal(Evidence.isEvidenceRequired({}), false, 'no capability/degradedState/sources at all must default to evidence-optional');

// --- 2. Provenance envelope -> Trust Card data mapping -------------------------------------------

// Complete provenance: every mapped field present and correctly translated to plain language.
{
  const provenance = Provenance.build({
    capability: 'LIVE_INTELLIGENCE', provider: 'ibis-local-live-research', costToIbis: 'ZERO_COST_TO_IBIS',
    sourceIdentity: 'Port of Spain ferry schedule thread', sourceUrl: 'https://news.ycombinator.com/item?id=999',
    publisher: 'Hacker News', sourceReferenceDate: '2026-08-20', sourceRetrievedAt: '2026-08-25T10:00:00Z',
    retrievalMethod: 'LIVE_API_FETCH', confidenceBasis: 'MODERATE', licensingNote: 'Public post, linked not reproduced',
  });
  const data = Evidence.toTrustCardData(provenance, { limitations: 'Community-discussion tier only.' });
  assert.equal(data.title, 'Port of Spain ferry schedule thread');
  assert.equal(data.publisher, 'Hacker News');
  assert.equal(data.externalSourceUrl, 'https://news.ycombinator.com/item?id=999');
  assert.equal(data.referenceDate, '2026-08-20');
  assert.equal(data.lastUpdated, '2026-08-25T10:00:00Z');
  assert.match(data.retrievalMethod, /live request/i);
  assert.match(data.confidenceBasis, /MODERATE/);
  assert.equal(data.licensingNote, 'Public post, linked not reproduced');
  assert.equal(data.limitations, 'Community-discussion tier only.');
}

// Incomplete provenance: unset fields stay explicitly null/absent, never fabricated.
{
  const provenance = Provenance.build({ capability: 'TEXT', provider: 'ibis-query-gemini' });
  const data = Evidence.toTrustCardData(provenance, {});
  assert.equal(data.publisher, null, 'unset publisher must stay null, never invented');
  assert.equal(data.externalSourceUrl, undefined, 'no source context at all -> no external source key set');
  assert.equal(data.licensingNote, null);
  assert.equal(data.confidenceBasis, 'Not assessed', 'unset confidence must render the explicit Not assessed sentinel, never a fabricated value');
}

// Unknown reference date: a real external source exists, but its own reference date is unknown --
// the key must be PRESENT (so trust-card.js's referenceDateRow renders the honest
// "not published by the source" state) with value null, not omitted entirely.
{
  const provenance = Provenance.build({ capability: 'LIVE_INTELLIGENCE', sourceUrl: 'https://example.com/post', sourceReferenceDate: null });
  const data = Evidence.toTrustCardData(provenance, {});
  assert('referenceDate' in data, 'referenceDate key must be present when a real external source exists, even if its own date is unknown');
  assert.equal(data.referenceDate, null);
}

// Degraded provider fallback (partial failure, eventual success) and total provider failure both
// produce a real, plain-language degradedState -- never silently dropped.
{
  const fallback = Provenance.build({ capability: 'TEXT', degradedState: 'ALL_PROVIDERS_FAILED' });
  assert.match(Evidence.toTrustCardData(fallback, {}).degradedState, /every available route failed/i);
  const noProvider = Provenance.build({ capability: 'TEXT', degradedState: 'NO_ELIGIBLE_PROVIDER' });
  assert.match(Evidence.toTrustCardData(noProvider, {}).degradedState, /no eligible route/i);
  const clean = Provenance.build({ capability: 'TEXT' });
  assert.equal(Evidence.toTrustCardData(clean, {}).degradedState, null, 'a clean, non-degraded result must not show a degraded notice');
}

// Deterministic calculation with a real formula (e.g. RUNTIME_ESTIMATION's word-count arithmetic)
// -- passed through extra, not fabricated by this module itself.
{
  const provenance = Provenance.build({ capability: 'RUNTIME_ESTIMATION', provider: 'ibis-local-script-runtime-estimator', costToIbis: 'ZERO_COST_TO_IBIS' });
  const data = Evidence.toTrustCardData(provenance, { formula: 'minutes = wordCount / 235', formulaSubstitution: 'minutes = 7050 / 235 = 30' });
  assert.equal(data.formula, 'minutes = wordCount / 235');
  assert.equal(data.formulaSubstitution, 'minutes = 7050 / 235 = 30');
}

// Cost class translated to plain language, never the raw internal enum.
{
  const paid = Provenance.build({ capability: 'TEXT', costToIbis: 'PAID_BY_IBIS_PRE_EXISTING' });
  assert.match(Evidence.toTrustCardData(paid, {}).costNote, /provider FTN already pays for/i);
  const local = Provenance.build({ capability: 'BPM_DETECTION', costToIbis: 'ZERO_COST_TO_IBIS' });
  assert.match(Evidence.toTrustCardData(local, {}).costNote, /no provider was paid/i);
  const unrecognized = Provenance.build({ capability: 'TEXT', costToIbis: 'SOME_FUTURE_UNRECOGNIZED_CLASS' });
  assert.equal(Evidence.toTrustCardData(unrecognized, {}).costNote, null, 'an unrecognized cost class must render as absent, not a fabricated guess');
}

// --- 3. No private routing details ever leak into the rendered data object -----------------------
{
  const provenance = Provenance.build({
    capability: 'TEXT', nodeId: 'ibis-ai', provider: 'ibis-query-gemini',
    attempts: [{ providerId: 'ibis-assistant-anthropic', success: false, errorType: 'NETWORK_ERROR' }, { providerId: 'ibis-query-gemini', success: true, errorType: null }],
  });
  const data = Evidence.toTrustCardData(provenance, {});
  const forbiddenKeys = ['attempts', 'routingPath', 'nodeId', 'prompt'];
  for (const key of forbiddenKeys) {
    assert(!(key in data), `toTrustCardData() must never expose internal routing detail "${key}" in the rendered card data`);
  }
}

console.log('Phase 4B ibis evidence: decision matrix, provenance mapping, never-fabricated defaults, and no-private-routing-details all verified.');
