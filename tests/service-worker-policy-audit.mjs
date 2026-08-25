// FTN Platform — service-worker route-policy drift audit (Phase 3 consolidation).
//
// Guards the guarantee scripts/sync-service-worker.mjs exists to provide: service-worker.js's
// PRIVATE/NEVER regexes never quietly diverge from js/product-registry-data.js's own
// publicVisibility/status/authRequirement fields or from data/route-policy.mjs. Also guards the
// specific "not a security boundary" documentation requirement and a real classification bug this
// pass caught while building this audit (authRequirement:'none' -- fully public, no account at
// all -- must never be treated the same as 'mixed' and swept into the private-cache exclusion).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// --- 1. Drift check: service-worker.js must already match the registry / data/route-policy.mjs. ---
try {
  execFileSync('node', ['scripts/sync-service-worker.mjs', '--check'], { stdio: 'pipe' });
} catch (err) {
  const output = (err.stdout || '').toString() + (err.stderr || '').toString();
  throw new Error(`service-worker.js route policy has drifted from the Product Registry / data/route-policy.mjs:\n${output}`);
}

// --- 2. Independent verification. ---
const swSource = fs.readFileSync('service-worker.js', 'utf8');
const privateMatch = swSource.match(/var PRIVATE=(\/\^\\\/\([^)]+\)\(\\\/\|\$\)\/);/);
const neverMatch = swSource.match(/var NEVER=(\/\^\\\/\([^)]+\)\(\\\/\|\$\)\/);/);
assert(privateMatch, 'Could not locate var PRIVATE=... in service-worker.js');
assert(neverMatch, 'Could not locate var NEVER=... in service-worker.js');
const PRIVATE = new Function('return ' + privateMatch[1])();
const NEVER = new Function('return ' + neverMatch[1])();

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/product-registry-data.js', 'utf8'), context);
const products = context.window.FTN.ProductRegistryData;

const CACHE_UNSAFE_AUTH_REQUIREMENTS = ['mixed', 'authenticated', 'private'];
const expectedPrivateIds = products.filter((p) =>
  p.publicVisibility === false || ['PRIVATE', 'VAULTED'].includes(p.status) || CACHE_UNSAFE_AUTH_REQUIREMENTS.includes(p.authRequirement));
for (const p of expectedPrivateIds) {
  const segment = p.route.replace(/^\/+/, '').replace(/\/+$/, '');
  assert(PRIVATE.test('/' + segment + '/'), `${p.id} (${p.route}) needs service-worker cache exclusion (publicVisibility=${p.publicVisibility}, status=${p.status}, authRequirement=${p.authRequirement}) but PRIVATE does not match it`);
}

// Regression guard for the exact bug this pass caught: authRequirement:'none' (FTN Screen's
// Display Mode -- fully public, no account, MORE open than 'guest', not less) must never be
// treated as cache-unsafe. A naive "authRequirement !== 'guest'" filter would incorrectly sweep it
// into PRIVATE; this is exactly why CACHE_UNSAFE_AUTH_REQUIREMENTS is an explicit allowlist.
const display = products.find((p) => p.id === 'display');
assert.equal(display.authRequirement, 'none', 'FTN Display\'s authRequirement changed -- re-check whether this guard is still meaningful');
assert(!PRIVATE.test('/display/'), 'FTN Display (authRequirement:\'none\', fully public) must never be swept into the PRIVATE service-worker exclusion');

// Spot-check genuinely public products are never excluded.
for (const id of ['kaiso', 'tv', 'parliament', 'riddim', 'ftn-live']) {
  const p = products.find((x) => x.id === id);
  const segment = p.route.replace(/^\/+/, '').replace(/\/+$/, '');
  assert(!PRIVATE.test('/' + segment + '/'), `${id} is a genuinely public product and must not be excluded from the service-worker cache`);
  assert(!NEVER.test('/' + segment + '/'), `${id} is a genuinely public product and must not be excluded from the service-worker cache`);
}

// Every route classified in this pass (see GOVERNANCE/FTN_Repair_Ledger_2026-08-24.md) must still
// be excluded somewhere -- "preserve every legitimate existing exclusion" is a hard requirement,
// not merely "the generator's own output is internally consistent".
const mustStillBeExcluded = ['/account/', '/health/', '/ibis-ai/', '/love/', '/mission-control/', '/api/', '/auth/', '/community-connect/app/', '/god-mode/'];
for (const path of mustStillBeExcluded) {
  assert(PRIVATE.test(path) || NEVER.test(path), `${path} must still be excluded from the service-worker cache (PRIVATE or NEVER) -- an existing exclusion was dropped`);
}

// /functions/v1/ is enforced by its own separate line (a 'contains' match, not a prefix-anchored
// route like everything else) -- documented in data/route-policy.mjs, verified present here rather
// than trusted from that comment alone.
assert(swSource.includes("/\\/functions\\/v1\\//.test(url.pathname)"), 'The separate /functions/v1/ Edge Function cache exclusion (documented in data/route-policy.mjs as a non-generated, contains-match exception) is missing from the fetch handler');

// The fetch handler must actually consult both regexes before ever caching a response.
assert(/PRIVATE\.test\(url\.pathname\)/.test(swSource), 'fetch handler no longer checks PRIVATE');
assert(/NEVER\.test\(url\.pathname\)/.test(swSource), 'fetch handler no longer checks NEVER');

// Explicit "not a security boundary" documentation requirement.
assert(/not an authorization boundary/i.test(swSource), 'service-worker.js must explicitly document that PRIVATE/NEVER are a caching policy, not an authorization boundary');
assert(/Row Level\s+Security/i.test(swSource), 'service-worker.js must point to server-side (Supabase RLS) enforcement as the real authorization boundary');

const routePolicySource = fs.readFileSync('data/route-policy.mjs', 'utf8');
assert(/NOT A SECURITY BOUNDARY/i.test(routePolicySource), 'data/route-policy.mjs must carry the same "not a security boundary" statement');

console.log(`Service-worker route policy is registry-driven and drift-free: PRIVATE covers ${expectedPrivateIds.length} product route(s), NEVER covers ${mustStillBeExcluded.length - expectedPrivateIds.length} non-product route(s).`);
