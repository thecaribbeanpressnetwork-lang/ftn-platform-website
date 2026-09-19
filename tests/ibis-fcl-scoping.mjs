// Investor-critical regression test (2026-09-19): proves the Founder Cognitive Layer's decision-
// gate/framework text is only ever included in a STRATEGY task's prompt, never in an ordinary
// GENERAL/ENGINEERING/OPS/MARKETING/COMMS task's -- the exact bug found live, where "2 + 2" leaked
// js/ibis-founder-cognitive-layer.js's PUBLIC_DECISION_GATE vocabulary verbatim into its answer
// because js/ibis-multi-agent-orchestrator.js's taskFor() included it unconditionally for every
// task whenever a publicCognitiveContext existed on the request, regardless of that task's agent.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function load(path, ctx) { vm.runInContext(fs.readFileSync(path, 'utf8'), ctx, { filename: path }); }

const ctx = vm.createContext({ console, Date, Math, JSON, Set, Map, Promise, crypto: { randomUUID: () => `id-${Math.random()}` } });
ctx.globalThis = ctx; ctx.window = ctx; ctx.FTN = {};

load('js/ibis-universal-router.js', ctx);
load('js/ibis-multi-agent-orchestrator.js', ctx);

// A distinctive marker standing in for the real PUBLIC_DECISION_GATE text -- if this string ever
// appears in a task prompt it was NOT supposed to appear in, the test fails loudly and specifically,
// rather than relying on the real (much longer) production string.
const LEAK_MARKER = 'DECISION_GATE_MARKER: user value; ecosystem value; ownership; data value';
ctx.FTN.FounderCognitiveLayer = {
  publicPromptContext: () => LEAK_MARKER,
  promptContext: () => LEAK_MARKER,
};

const publicCognitiveContext = { profile: { decisionGate: ['user value'] } };

// "2 + 2" and "What is the capital of Barbados?" both match no RULES entry in
// js/ibis-universal-router.js, so they route to the GENERAL agent alone -- exactly the live-caught
// failure case.
for (const trivialQuery of ['2 + 2', 'What is the capital of Barbados?']) {
  const route = ctx.FTN.UniversalRouter.route(trivialQuery, {});
  // Array.from() normalizes a vm-context array (a different realm's Array, not instanceof this
  // realm's Array) into a plain host array before comparing -- assert.deepEqual across realms can
  // otherwise report a false mismatch even when the values are identical.
  assert.deepEqual(Array.from(route.agents), ['GENERAL'], `expected ${JSON.stringify(trivialQuery)} to route to GENERAL only (test assumption may be stale if router rules changed): ${JSON.stringify(Array.from(route.agents))}`);
  const plan = ctx.FTN.MultiAgentOrchestrator.buildPlan(trivialQuery, route, { publicCognitiveContext });
  assert.equal(plan.tasks.length, 1);
  assert.equal(plan.tasks[0].agent, 'GENERAL');
  assert.ok(!plan.tasks[0].prompt.includes(LEAK_MARKER), `GENERAL task prompt for ${JSON.stringify(trivialQuery)} must not include founder decision-gate text: ${plan.tasks[0].prompt}`);
}

// A genuine founder-strategy question (matches the "strategy|plan|business model" rule) must still
// route STRATEGY into the plan and that STRATEGY task's prompt must still receive the cognitive
// context -- FCL is scoped to STRATEGY tasks, not disabled outright.
const strategyQuery = 'What should our go to market strategy be for Community Connect?';
const strategyRoute = ctx.FTN.UniversalRouter.route(strategyQuery, {});
assert.ok(strategyRoute.agents.includes('STRATEGY'), `expected a strategy question to route STRATEGY: ${JSON.stringify(strategyRoute.agents)}`);
const strategyPlan = ctx.FTN.MultiAgentOrchestrator.buildPlan(strategyQuery, strategyRoute, { publicCognitiveContext });
const strategyTask = strategyPlan.tasks.find((t) => t.agent === 'STRATEGY');
assert.ok(strategyTask, 'expected a STRATEGY task to exist in the plan');
assert.ok(strategyTask.prompt.includes(LEAK_MARKER), 'a genuinely founder-consequential STRATEGY task must still receive the cognitive-layer context');

console.log('ibis FCL scoping: decision-gate/framework context reaches only STRATEGY tasks, never an ordinary GENERAL/factual/deterministic task. PASS.');
