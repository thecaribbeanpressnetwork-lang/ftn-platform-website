// Investor-critical regression test (2026-09-19): proves the canonical orchestrator-level request
// deadline actually bounds a never-resolving child call, rather than letting the whole Headspace
// UI hang indefinitely. This reproduces the exact production failure mode found live -- a natural
// funding/opportunity-strategy query hung for 90+ seconds with no degraded state -- by configuring
// FTN.MultiAgentOrchestrator with an executor that never resolves, then asserting
// FTN.IbisRuntime.ask() still resolves, within budget, with a truthful degraded result.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function load(path, ctx) { vm.runInContext(fs.readFileSync(path, 'utf8'), ctx, { filename: path }); }

const ctx = vm.createContext({
  console, Date, Math, JSON, Set, Map, Promise, setTimeout, clearTimeout,
  crypto: { randomUUID: () => `id-${Math.random()}` },
});
ctx.globalThis = ctx; ctx.window = ctx; ctx.FTN = {};

load('js/ibis-universal-router.js', ctx);
load('js/ibis-multi-agent-orchestrator.js', ctx);
load('js/ibis-runtime.js', ctx);

// A synthetic 300ms budget keeps this test fast and deterministic without touching the real,
// shipped 25000ms production constant (see js/ibis-runtime.js's configureDeadline()).
ctx.FTN.IbisRuntime.configureDeadline(300);

// The never-resolving child: a specialist/provider call that hangs forever, exactly like the
// unbounded FTN.MultiAgentOrchestrator.execute() task loop and FTN.ConnectionFabric.invoke() calls
// found live. This never settles -- the test would time out (not just fail) if the deadline logic
// were broken and truly waited on it.
let executorCalls = 0;
ctx.FTN.MultiAgentOrchestrator.configure({
  router: ctx.FTN.UniversalRouter,
  permissionLedger: { check: async () => ({ decision: 'ALLOW' }) },
  executor: async () => { executorCalls += 1; return new Promise(() => {}); },
  persistence: { saveRun: async (x) => x, saveTask: async (x) => x },
});

const startedAt = Date.now();
const result = await ctx.FTN.IbisRuntime.ask('How should FTN position ibis for funding without vendor lock-in?', {});
const elapsedMs = Date.now() - startedAt;

assert.equal(executorCalls > 0, true, 'The never-resolving child executor must actually have been invoked (proves this is a real hang, not a routing failure).');
assert.equal(result.success, false, 'A canonical request that timed out must never report success.');
assert.equal(result.errorType, 'ORCHESTRATION_TIMEOUT', 'Timeout must be recorded with the canonical, recognizable degraded reason.');
assert.equal(result.degraded, true, 'The evidence/result state must be marked degraded -- never grounded/verified -- when the deadline expires.');
assert.equal(result.run, null, 'A timed-out request must not fabricate a completed run/result.');
assert.ok(elapsedMs < 5000, `ask() must resolve within its configured deadline, not hang; took ${elapsedMs}ms`);
assert.ok(elapsedMs >= 250, `ask() must actually wait out the deadline rather than resolving instantly; took ${elapsedMs}ms`);

// A second, independent never-resolving call: FTN.ConnectionFabric.invoke(), the other unbounded
// path found live (js/ibis-headspace-opportunities.js's sources() calls this directly, bypassing
// the orchestrator entirely -- the same canonical deadline must still bound it).
ctx.FTN.ConnectionFabric = { invoke: async () => new Promise(() => {}) };
const invokeStartedAt = Date.now();
const invokeResult = await ctx.FTN.IbisRuntime.invokeApp('ftn-opportunities', 'SEARCH', {}, {});
const invokeElapsedMs = Date.now() - invokeStartedAt;
assert.equal(invokeResult.success, false, 'A timed-out invokeApp() must never report success.');
assert.equal(invokeResult.errorType, 'ORCHESTRATION_TIMEOUT', 'invokeApp() must use the same canonical timeout reason as ask().');
assert.ok(invokeElapsedMs < 5000, `invokeApp() must resolve within its configured deadline, not hang; took ${invokeElapsedMs}ms`);

// A real (non-hanging) request must still resolve normally and quickly, proving the deadline is a
// ceiling, not an artificial floor imposed on every request.
ctx.FTN.MultiAgentOrchestrator.configure({
  router: ctx.FTN.UniversalRouter,
  permissionLedger: { check: async () => ({ decision: 'ALLOW' }) },
  executor: async () => ({ success: true, data: { answer: 'Bridgetown is the capital of Barbados.' } }),
  persistence: { saveRun: async (x) => x, saveTask: async (x) => x },
});
const fastStartedAt = Date.now();
const fastResult = await ctx.FTN.IbisRuntime.ask('What is the capital of Barbados?', {});
const fastElapsedMs = Date.now() - fastStartedAt;
assert.equal(fastResult.success, true, 'A real, promptly-resolving request must not be penalized or degraded by the deadline mechanism.');
assert.ok(fastElapsedMs < 250, `A real request must resolve immediately, not wait out the deadline; took ${fastElapsedMs}ms`);

console.log('ibis Runtime canonical request deadline: never-resolving orchestrator and connection-fabric children are bounded, truthfully degraded, and never block a real request. PASS.');
