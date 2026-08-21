import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-provider-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-eligibility.js', 'utf8'), context);

const Providers = context.window.FTN.IbisProviders;
const Eligibility = context.window.FTN.IbisEligibility;

// -- Registry shape --------------------------------------------------------
const all = Providers.all();
assert(all.length >= 9, 'Expected the existing 7 creative-studio candidates plus the 2 text providers');
for (const p of all) {
  assert(Array.isArray(p.capabilities) && p.capabilities.length > 0, `${p.id} must declare at least one capability`);
  assert(typeof p.costToIbis === 'string' && p.costToIbis.length > 0, `${p.id} must declare costToIbis`);
}
assert(Providers.byCategory('image').length >= 2, 'byCategory() must keep working -- ibis-creative-studio.js depends on it');
assert.equal(Providers.byCapability('TEXT').length, 2, 'Exactly ibis-query-gemini and ibis-assistant-anthropic declare TEXT today');
assert.equal(Providers.get('does-not-exist'), null);

// -- Core economic invariant: this is the one test that matters most -------
// A provider that could cause IBIS to incur an unapproved charge must never be enabled.
const COST_ALLOWED_WHEN_ENABLED = ['ZERO_CUSTOMER_FUNDED', 'PAID_BY_IBIS_PRE_EXISTING', 'PAID_BY_IBIS_FOUNDER_APPROVED'];
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

console.log('ibis-eligibility-audit: registry shape, economic invariant, fail-closed evaluation, and real health tracking all verified.');
