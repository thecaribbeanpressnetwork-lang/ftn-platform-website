// Real correctness test for js/ibis-runtime-estimator.js -- deterministic, no AI model.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-runtime-estimator.js', 'utf8'), context);
const Estimator = context.window.FTN.IbisRuntimeEstimator;

// A screenplay of exactly 235*30 = 7050 words should estimate to ~30 minutes.
const words = new Array(235 * 30).fill('word').join(' ');
const result = Estimator.estimateRuntime(words);
assert.equal(result.reason, null);
assert(Math.abs(result.minutes - 30) < 0.5, `Expected ~30 minutes for a 30-page-equivalent script, got ${result.minutes}`);
assert(Math.abs(result.pages - 30) < 0.5);
assert.equal(result.wordCount, 235 * 30);

// Target-minutes comparison: within tolerance.
const withTarget = Estimator.estimateRuntime(words, { targetMinutes: 30 });
assert.equal(withTarget.withinTarget, true);
assert(Math.abs(withTarget.deltaMinutes) < 0.5);

// A script half the target length must honestly report it is NOT within target.
const shortWords = new Array(235 * 10).fill('word').join(' ');
const short = Estimator.estimateRuntime(shortWords, { targetMinutes: 30 });
assert.equal(short.withinTarget, false);
assert(short.deltaMinutes < -15);

// Empty/no text must fail closed, not fabricate a runtime.
const empty = Estimator.estimateRuntime('');
assert.equal(empty.minutes, null);
assert(typeof empty.reason === 'string' && empty.reason.length > 0);
const nullInput = Estimator.estimateRuntime(null);
assert.equal(nullInput.minutes, null);

console.log('ibis-runtime-estimator-audit: real deterministic word-count-based runtime estimation verified, target-comparison verified (both within and outside tolerance), fail-closed empty-input behavior verified.');
