// FTN Platform -- regression guard for the freshness-grounding routing correction.
//
// Live-confirmed investor-demo blocker: asking the deployed public UI "What are the latest major
// business developments in Trinidad and Tobago?" (a freshness-sensitive question,
// FTN.UniversalRouter classifies it epistemicMode:'CURRENT_FACT_REQUIRED' and additively requests
// the LIVE_INTELLIGENCE capability) returned a fabricated, unsourced answer that falsely claimed
// "I've checked the latest information... According to FTN Parliament...". Root cause: js/ibis-
// multi-agent-orchestrator.js's defaultExecutor() silently substitutes a bare TEXT completion
// whenever a requested capability (e.g. LIVE_INTELLIGENCE) fails, with no signal that happened.
//
// This test proves two things:
//   1. defaultExecutor() (via FTN.MultiAgentOrchestrator.execute(), loaded for real in a Node VM,
//      same pattern as tests/ibis-runtime-foundation-audit.mjs) now tags a real LIVE_INTELLIGENCE
//      failure -> TEXT substitution with fallbackFromCapability, and does NOT tag a genuine
//      LIVE_INTELLIGENCE success or an ordinary non-freshness TEXT-only query.
//   2. Both caller files that decide whether to trust a runtime answer (js/ibis-ai-workspace.js,
//      js/ibis-headspace-universal.js) still contain the guard that refuses a freshness-required
//      answer once that tag is present, falling through to the canonical/SearXNG-grounded path
//      instead -- extracted and evaluated as an isolated pure function, not a text-pattern match,
//      so this fails if the guard's actual boolean logic is ever weakened, not just deleted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

function load(path, ctx) { vm.runInContext(fs.readFileSync(path, 'utf8'), ctx, { filename: path }); }
function repoPath(rel) { return fileURLToPath(new URL('../' + rel, import.meta.url)); }

// --- Part 1: the orchestrator's own fallback tagging, exercised for real -----------------------
const ctx = vm.createContext({ console, Date, Math, JSON, Set, Map, Promise, crypto: { randomUUID: () => `id-${Math.random()}` } });
ctx.globalThis = ctx; ctx.window = ctx; ctx.FTN = {};
load(repoPath('js/ibis-universal-router.js'), ctx);
load(repoPath('js/ibis-multi-agent-orchestrator.js'), ctx);

// A freshness query where LIVE_INTELLIGENCE genuinely succeeds -- must never be tagged.
ctx.FTN.HeadspaceFabric = { request: async (cap) => cap === 'LIVE_INTELLIGENCE' ? { success: true, answer: 'Real headline data.' } : { success: true, answer: 'unused' } };
let run = await ctx.FTN.MultiAgentOrchestrator.execute('What is happening in Trinidad and Tobago today?', {});
assert.equal(run.status, 'COMPLETED');
let outputs = run.run.result.outputs;
assert.ok(outputs.some((o) => o.output.answer === 'Real headline data.'), 'a genuine LIVE_INTELLIGENCE success must be used as-is');
assert.ok(outputs.every((o) => !o.output.fallbackFromCapability), 'a genuinely successful LIVE_INTELLIGENCE call must never be tagged as a fallback');

// A freshness query where LIVE_INTELLIGENCE fails -- must fall back to TEXT AND be tagged.
ctx.FTN.HeadspaceFabric = { request: async (cap) => cap === 'LIVE_INTELLIGENCE' ? { success: false, errorType: 'NO_MATCHING_ARTICLES' } : { success: true, answer: 'Fabricated business news guess.' } };
run = await ctx.FTN.MultiAgentOrchestrator.execute('What are the latest major business developments in Trinidad and Tobago?', {});
assert.equal(run.status, 'COMPLETED');
outputs = run.run.result.outputs;
assert.ok(outputs.some((o) => o.output.fallbackFromCapability === 'LIVE_INTELLIGENCE'), 'a silent LIVE_INTELLIGENCE -> TEXT fallback must be tagged with the capability that failed');
assert.ok(outputs.some((o) => o.output.answer === 'Fabricated business news guess.'), 'the fallback answer must still be returned (the caller decides whether to trust it, not the orchestrator)');

// An ordinary, non-freshness query must never even attempt LIVE_INTELLIGENCE.
let liveIntelligenceCalls = 0;
ctx.FTN.HeadspaceFabric = { request: async (cap) => { if (cap === 'LIVE_INTELLIGENCE') liveIntelligenceCalls++; return { success: true, answer: 'ordinary answer' }; } };
run = await ctx.FTN.MultiAgentOrchestrator.execute('I want to start a small food business in Trinidad.', {});
assert.equal(run.status, 'COMPLETED');
assert.equal(liveIntelligenceCalls, 0, 'a non-freshness query must never attempt LIVE_INTELLIGENCE at all, so it can never be tagged either');
assert.ok(run.run.result.outputs.every((o) => !o.output.fallbackFromCapability));

// --- Part 2: the caller-side trust guard, extracted and evaluated as an isolated pure function --
function extractGroundingGuard(sourcePath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const match = source.match(/function runtimeGroundingDegraded\(result\)\{.*\}/);
  assert.ok(match, `runtimeGroundingDegraded() must still exist in ${sourcePath}`);
  // eslint-disable-next-line no-new-func
  return new Function(`return (${match[0].replace('function runtimeGroundingDegraded', 'function')})`)();
}

for (const file of ['js/ibis-ai-workspace.js', 'js/ibis-headspace-universal.js']) {
  const guard = extractGroundingGuard(repoPath(file));
  assert.equal(guard({ run: { result: { outputs: [{ output: { fallbackFromCapability: 'LIVE_INTELLIGENCE' } }] } } }), true, `${file}: must detect a tagged fallback`);
  assert.equal(guard({ run: { result: { outputs: [{ output: { answer: 'real headline' } }] } } }), false, `${file}: a genuine, untagged answer must never be treated as degraded`);
  assert.equal(guard({ run: { result: { outputs: [] } } }), false, `${file}: no outputs at all must not be treated as degraded`);
  assert.equal(guard(null), false, `${file}: a missing/malformed result must not throw or be treated as degraded`);
}

// The actual freshness-gate condition (epistemicMode + the guard) must still be present in both
// caller files' source, wired to the canonical/SearXNG fallback -- a text-pattern check on top of
// the behavioral one above, guarding against the wiring itself being removed.
for (const file of ['js/ibis-ai-workspace.js', 'js/ibis-headspace-universal.js']) {
  const source = fs.readFileSync(repoPath(file), 'utf8');
  assert.match(source, /CURRENT_FACT_REQUIRED/, `${file}: must still gate on the router's freshness classification`);
  assert.match(source, /runtimeGroundingDegraded/, `${file}: must still call the grounding-degradation guard`);
}

console.log('ibis-freshness-grounding-audit: a silently-degraded LIVE_INTELLIGENCE->TEXT fallback is now tagged, a genuine success is never tagged, non-freshness queries never attempt LIVE_INTELLIGENCE, and both regular-IBIS and Headspace still refuse a tagged fallback on a freshness-required query.');
