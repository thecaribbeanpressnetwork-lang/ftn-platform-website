import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-provider-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-eligibility.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-capability-taxonomy.js', 'utf8'), context);

const Providers = context.window.FTN.IbisProviders;
const Eligibility = context.window.FTN.IbisEligibility;
const Taxonomy = context.window.FTN.CapabilityTaxonomy;

// -- Registry shape --------------------------------------------------------
const all = Providers.all();
assert(all.length >= 15, 'Expected 12 prior candidates plus cogvideox-2b, ibis-local-dsp, and ftn-fire-local-procedural (Phase 4 real-code investigation finding)');
for (const p of all) {
  assert(Array.isArray(p.capabilities) && p.capabilities.length > 0, `${p.id} must declare at least one capability`);
  assert(typeof p.costToIbis === 'string' && p.costToIbis.length > 0, `${p.id} must declare costToIbis`);
  for (const cap of p.capabilities) {
    assert(Taxonomy.isRecognized(cap), `${p.id} declares unrecognized capability "${cap}" -- must be canonical (js/ibis-capability-taxonomy.js) or a documented legacy alias, never an ad hoc string`);
  }
}
// Real values, not decoration: prove the taxonomy module is actually load-bearing.
assert(Taxonomy.isCanonical('TEXT_TO_IMAGE') && !Taxonomy.isCanonical('IMAGE_GENERATION'), 'IMAGE_GENERATION is a legacy alias, not itself canonical');
assert.equal(Taxonomy.canonicalEquivalent('IMAGE_GENERATION'), 'TEXT_TO_IMAGE');
assert.equal(Taxonomy.isRecognized('NOT_A_REAL_CAPABILITY'), false, 'An unrecognized capability string must fail closed, not be silently accepted');
assert.equal(Taxonomy.groupOf('BPM_DETECTION'), 'AUDIO');
assert(Providers.byCategory('image').length >= 4, 'byCategory() must keep working -- ibis-creative-studio.js depends on it -- now pixverse, kling, plus the two Cloudflare image candidates');
assert.equal(Providers.byCapability('TEXT').length, 3, 'ibis-query-gemini, ibis-assistant-anthropic and cloudflare-workers-ai-text declare TEXT today');
assert.equal(Providers.byCapability('IMAGE_GENERATION').length, 4, 'pixverse, kling, cloudflare-workers-ai-image-flux and cloudflare-workers-ai-image-sdxl declare IMAGE_GENERATION today');
assert.equal(Providers.byCapability('VIDEO_GENERATION').length, 3, 'pixverse, kling and the new cogvideox-2b self-host candidate declare VIDEO_GENERATION today');
assert.equal(Providers.byCapability('BPM_DETECTION').length, 1, 'ibis-local-dsp is the one real BPM_DETECTION provider');
assert.equal(Providers.get('does-not-exist'), null);
assert.equal(Providers.get('cogvideox-2b').costToIbis, 'WOULD_REQUIRE_IBIS_COMPUTE_SPEND', 'Open licensing (Apache 2.0 on the 2B variant) must not be conflated with zero cost -- it still needs a real GPU');
assert.equal(Providers.get('cogvideox-2b').enabled, false, 'No self-hosted VIDEO route is eligible until a founder makes a budgeted GPU-infrastructure decision');

// -- Core economic invariant: this is the one test that matters most -------
// A provider that could cause IBIS to incur an unapproved charge must never be enabled.
// ZERO_COST_TO_IBIS was missing from this list until the open-source audit pass added the first
// enabled provider that actually carries it (ibis-local-dsp -- real, deterministic, client-side,
// no network call at all). That was a genuine gap: ZERO_COST_TO_IBIS is the *safest* possible
// classification for an enabled provider, strictly safer than the two narrow PAID_BY_IBIS_*
// founder-approved exceptions already allowed here -- there was never a reason to exclude it.
const COST_ALLOWED_WHEN_ENABLED = ['ZERO_COST_TO_IBIS', 'ZERO_CUSTOMER_FUNDED', 'PAID_BY_IBIS_PRE_EXISTING', 'PAID_BY_IBIS_FOUNDER_APPROVED'];
for (const p of all) {
  if (p.enabled) {
    assert(
      COST_ALLOWED_WHEN_ENABLED.includes(p.costToIbis),
      `${p.id} is enabled with costToIbis="${p.costToIbis}" -- an enabled provider must carry an explicitly reviewed cost classification, not an unverified or IBIS-compute-spend one`
    );
  }
}

// -- Eligibility engine: fail-closed behavior -------------------------------
assert.equal(Eligibility.evaluate('does-not-exist', 'TEXT', {}).status, 'UNKNOWN', 'Unknown provider id must fail closed to UNKNOWN, never ELIGIBLE');
assert.equal(Eligibility.evaluate('pixverse', 'IMAGE_GENERATION', {}).status, 'INELIGIBLE', 'pixverse is not enabled yet');
assert.equal(Eligibility.evaluate('pixverse', 'INSTRUMENTAL_GENERATION', {}).status, 'INELIGIBLE', 'Capability mismatch must be rejected even if a provider were enabled');
assert.equal(Eligibility.evaluate('ibis-query-gemini', 'TEXT', { authenticated: false }).status, 'USER_AUTH_REQUIRED', 'ibis-query must require sign-in -- this mirrors the CI-enforced boundary in tests/backend-source-audit.mjs');
assert.equal(Eligibility.evaluate('ibis-query-gemini', 'TEXT', { authenticated: true }).status, 'ELIGIBLE', 'ibis-query becomes eligible once authenticated, with a clean health record');
assert.equal(Eligibility.evaluate('ibis-assistant-anthropic', 'TEXT', { authenticated: false }).status, 'INELIGIBLE', 'ibis-assistant is not enabled until the function is actually deployed');
assert.equal(Eligibility.evaluate('cloudflare-workers-ai-text', 'TEXT', { authenticated: false }).status, 'INELIGIBLE', 'cloudflare-workers-ai-text is not enabled until real Cloudflare credentials exist');
assert.equal(Eligibility.evaluate('cloudflare-workers-ai-image-flux', 'IMAGE_GENERATION', {}).status, 'INELIGIBLE', 'cloudflare-workers-ai-image-flux is not enabled until real Cloudflare credentials exist and the function is deployed');
assert.equal(Eligibility.evaluate('cloudflare-workers-ai-image-sdxl', 'IMAGE_GENERATION', {}).status, 'INELIGIBLE', 'cloudflare-workers-ai-image-sdxl is not enabled until real Cloudflare credentials exist and the function is deployed');
assert.equal(Eligibility.find('IMAGE_GENERATION', {}).length, 0, 'No IMAGE_GENERATION provider is eligible right now -- this is the honest current state, not a bug, exactly mirroring TEXT before ibis-assistant/ibis-text-cloudflare were deployed');
assert.equal(Eligibility.evaluate('cogvideox-2b', 'VIDEO_GENERATION', {}).status, 'INELIGIBLE', 'cogvideox-2b is a documented self-host candidate only -- open licensing is not zero cost, and IBIS has no GPU infrastructure');

// -- The one genuinely live provider from the open-source audit pass: real, deterministic,
// client-side, zero network calls of any kind. This is the one case where ELIGIBLE should be
// true for an unauthenticated guest with no deployment step required.
assert.equal(Eligibility.evaluate('ibis-local-dsp', 'BPM_DETECTION', { authenticated: false }).status, 'ELIGIBLE', 'ibis-local-dsp is real and live today -- no server, no secrets, no deployment step');
assert.equal(Eligibility.find('BPM_DETECTION', {}).length, 1, 'Exactly one BPM_DETECTION provider is eligible: ibis-local-dsp');

// ftn-fire-local-procedural: real and zero-cost, but correctly INELIGIBLE until it has an actual
// callable adapter -- being real and free does not automatically make a capability orchestrable.
assert.equal(Eligibility.evaluate('ftn-fire-local-procedural', 'INSTRUMENTAL_GENERATION', {}).status, 'INELIGIBLE', 'FTN Fire\'s local engine is real and live at its own page, but has no shared adapter yet -- must stay ineligible for attemptInOrder() until one exists');

// -- find(): only returns providers that pass every gate -------------------
assert.equal(Eligibility.find('TEXT', { authenticated: false }).length, 0, 'No TEXT provider is eligible for a guest right now -- this is the honest current state, not a bug');
const authedText = Eligibility.find('TEXT', { authenticated: true });
assert.equal(authedText.length, 1, 'Exactly one TEXT provider (ibis-query-gemini) is eligible once authenticated');
assert.equal(authedText[0].provider.id, 'ibis-query-gemini');

// -- Health tracking: real observed data, not fabricated scores ------------
const freshHealth = Eligibility.getHealth('ibis-assistant-anthropic');
assert.equal(freshHealth.recentOutcomes.length, 0, 'A provider with no calls yet must have an empty history, not a made-up default');
Eligibility.recordOutcome('test-provider-xyz', { success: true, latencyMs: 120 });
Eligibility.recordOutcome('test-provider-xyz', { success: false, latencyMs: 80, errorType: 'TIMEOUT' });
Eligibility.recordOutcome('test-provider-xyz', { success: false, latencyMs: 90, errorType: 'SERVER_ERROR' });
Eligibility.recordOutcome('test-provider-xyz', { success: false, latencyMs: 95, errorType: 'SERVER_ERROR' });
const h = Eligibility.getHealth('test-provider-xyz');
assert.equal(h.successes, 1);
assert.equal(h.failures, 3);
// evaluate() treats 3 consecutive failures as TEMPORARILY_UNAVAILABLE, but only if the provider
// would otherwise be eligible -- prove this against a real registry entry with a clean record so
// it can never be ELIGIBLE by coincidence.
for (let i = 0; i < 3; i++) Eligibility.recordOutcome('ibis-query-gemini', { success: false, errorType: 'SERVER_ERROR' });
assert.equal(Eligibility.evaluate('ibis-query-gemini', 'TEXT', { authenticated: true }).status, 'TEMPORARILY_UNAVAILABLE', 'Three straight observed failures must demote an otherwise-eligible provider');

// -- Real failover (Phase 3's specific acceptance scenario) ----------------
// The live registry has zero simultaneously-eligible guest TEXT providers today (that's the
// honest current state, asserted above), so failover between two real ones can't be observed
// against it yet. What CAN be tested for real, right now: js/ibis-eligibility.js's failover
// logic itself, against a minimal controlled provider pair -- the engine has no hardcoded
// knowledge of which registry it reads, so this exercises the actual attemptInOrder() code path,
// not a re-implementation of it.
const failoverContext = { window: {} };
vm.createContext(failoverContext);
failoverContext.window.FTN = {
  IbisProviders: {
    get(id) { return this.all().find((p) => p.id === id) || null; },
    byCapability(capability) { return this.all().filter((p) => p.capabilities.includes(capability)); },
    all() {
      return [
        { id: 'provider-a', capabilities: ['TEXT'], enabled: true, costToIbis: 'ZERO_COST_TO_IBIS', apiStatus: 'LIVE' },
        { id: 'provider-b', capabilities: ['TEXT'], enabled: true, costToIbis: 'ZERO_COST_TO_IBIS', apiStatus: 'LIVE' },
      ];
    },
  },
};
vm.runInContext(fs.readFileSync('js/ibis-eligibility.js', 'utf8'), failoverContext);
const FailoverEligibility = failoverContext.window.FTN.IbisEligibility;

// Provider A always fails, Provider B always succeeds -- A must be tried first (registry order,
// both start with clean health) and B must be the one that actually delivers the result.
const failoverResult = await FailoverEligibility.attemptInOrder('TEXT', {}, (provider) => {
  if (provider.id === 'provider-a') return Promise.resolve({ success: false, errorType: 'SERVER_ERROR' });
  return Promise.resolve({ success: true, data: { from: provider.id } });
});
assert.equal(failoverResult.success, true, 'Failover must succeed when a healthy fallback exists');
assert.equal(failoverResult.provider.id, 'provider-b', 'The result must come from the provider that actually succeeded');
assert.equal(failoverResult.attempts.length, 2, 'Both providers must be recorded as attempted');
assert.equal(failoverResult.attempts[0].providerId, 'provider-a');
assert.equal(failoverResult.attempts[0].success, false);
assert.equal(failoverResult.attempts[1].providerId, 'provider-b');
assert.equal(failoverResult.attempts[1].success, true);
assert.equal(FailoverEligibility.getHealth('provider-a').failures, 1, 'The real failure must be recorded, not just observed');
assert.equal(FailoverEligibility.getHealth('provider-b').successes, 1);

// A repeat call with a healthier B should now rank B first -- this is what makes it real routing
// rather than a fixed try-A-then-B script.
await FailoverEligibility.attemptInOrder('TEXT', {}, (provider) => Promise.resolve({ success: provider.id === 'provider-b' }));
const secondRoundOrder = FailoverEligibility.find('TEXT', {}).map((r) => r.provider.id);
assert.equal(secondRoundOrder[0], 'provider-b', 'Provider B must now rank first: it has 2 successes and 0 failures vs A\'s 0 successes and 2 failures');

// All-providers-fail must be reported honestly, not silently swallowed.
const allFail = await FailoverEligibility.attemptInOrder('TEXT', {}, () => Promise.resolve({ success: false, errorType: 'TIMEOUT' }));
assert.equal(allFail.success, false);
assert.equal(allFail.attempts.length, 2);

// No eligible provider at all must short-circuit before ever calling the executor.
let executorCalled = false;
const noneEligible = await FailoverEligibility.attemptInOrder('IMAGE_GENERATION', {}, () => { executorCalled = true; return Promise.resolve({ success: true }); });
assert.equal(noneEligible.attempts.length, 0);
assert.equal(executorCalled, false, 'attemptInOrder must not call the executor when nothing is eligible for the capability');

console.log('ibis-eligibility-audit: registry shape, economic invariant, fail-closed evaluation, real health tracking, and real A-fails/B-succeeds failover all verified.');
