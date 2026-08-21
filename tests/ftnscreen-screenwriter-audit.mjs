// Real correctness test for js/ftnscreen-screenwriter.js. Two distinct things are proven here,
// deliberately not conflated:
//   1. The REAL, current, unmocked state of the fabric: every creative stage honestly reports
//      NO_ELIGIBLE_PROVIDER for a guest today (no TEXT provider is deployed) -- this is the true
//      state, not a test failure to work around.
//   2. The PIPELINE ORCHESTRATION LOGIC is correct: stage sequencing, project-graph asset
//      creation, dependency wiring, and selective revision -- proven with an injected mock
//      executor. This is explicitly a code-path/structural test, not a claim that real text
//      generation succeeded (see IBIS-MAP.md Sec 0.13 and this repository's "no false positives"
//      discipline).
// The one stage that genuinely executes for real, end-to-end, with no mock of any kind:
// RUNTIME_ESTIMATION, via js/ibis-runtime-estimator.js.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/product-registry-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ftn-node-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-provider-registry.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-eligibility.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-capability-taxonomy.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-runtime-estimator.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-client.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-project-graph.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ftnscreen-screenwriter.js', 'utf8'), context);

const Screenwriter = context.window.FTN.FtnScreenScreenwriter;

// -- Dialect/context resolution mirrors the same priority order as voice (independently verified,
// same contract) ----------------------------------------------------------------------------------
const explicit = Screenwriter.resolveContext({ explicitRequest: { country: 'Jamaica', dialect: 'Jamaican Creole' }, accountContext: { country: 'Trinidad & Tobago' } });
assert.equal(explicit.source, 'explicitRequest');
assert.equal(explicit.country, 'Jamaica');
const fallback = Screenwriter.resolveContext({});
assert.equal(fallback.source, 'default');

// -- Honest failure: no idea supplied must throw, not silently create an empty project ----------
assert.throws(() => Screenwriter.createProject(''), /idea/i);

// -- Part 1: the REAL, unmocked, current state of the fabric ------------------------------------
// No executor is injected here -- this exercises the real defaultExecutorFor() path against the
// real, current provider registry (no guest TEXT provider is deployed today).
{
  const project = Screenwriter.createProject('A young detective in Trinidad uncovers a smuggling operation.', {
    dialectParams: { explicitRequest: { country: 'Trinidad & Tobago', dialect: 'Trinidadian English' } },
  });
  const conceptResult = await Screenwriter.runStage(project, 'concept');
  assert.equal(conceptResult.success, false, 'STORY_DEVELOPMENT must honestly report unavailable -- no TEXT provider is deployed for guests today');
  assert.equal(conceptResult.code, 'NO_ELIGIBLE_PROVIDER');

  // developPilot() must stop honestly at the first real failure, never fabricating later stages.
  const project2 = Screenwriter.createProject('A soca artist trying to make it before Carnival.');
  const fullRun = await Screenwriter.developPilot(project2);
  assert.equal(fullRun.length, 1, 'developPilot() must stop at the first honestly-failed stage, not proceed to fabricate downstream stages');
  assert.equal(fullRun[0].success, false);
}

// -- Part 2: real, live, end-to-end RUNTIME_ESTIMATION (no mock at all) -------------------------
// A project with a real screenplay asset manually seeded (simulating what a real, eligible TEXT
// provider would have produced), proving the RUNTIME_ESTIMATION stage genuinely executes through
// the real fabric end to end.
{
  const project = Screenwriter.createProject('A Trinidad Carnival heist pilot.', { runtimeTargetMinutes: 30 });
  const screenplayText = new Array(235 * 30).fill('word').join(' ');
  const seededAsset = project.graph.addAsset({ projectId: project.projectId, assetType: 'SCREENPLAY', operation: 'SCREENPLAY', provenance: { text: screenplayText } });
  project.stageAssets.SCREENPLAY = seededAsset.assetId;

  const runtimeResult = await Screenwriter.runStage(project, 'runtime');
  assert.equal(runtimeResult.success, true, 'RUNTIME_ESTIMATION must genuinely execute -- it is a real, live, zero-cost local capability, not gated on any undeployed provider');
  assert(Math.abs(runtimeResult.asset.provenance.data.minutes - 30) < 1, `Expected ~30 minutes, got ${runtimeResult.asset.provenance.data.minutes}`);
  assert.equal(project.log[project.log.length - 1].success, true);
}

// -- Part 3: pipeline orchestration logic, proven via an injected mock executor -----------------
// This proves stage sequencing, project-graph wiring and dependency propagation are correct --
// NOT that real text generation works. The mock is deliberately obvious (fixed strings), never
// presented as if it were a real model's output.
{
  function mockTextExecutor(provider) {
    return Promise.resolve({ success: true, data: { answer: 'MOCK OUTPUT for ' + provider.id } });
  }
  // Force TEXT-capability stages down a path where SOME provider is eligible by using an
  // authenticated context (ibis-query-gemini is eligible once authenticated) with an injected
  // executor standing in for the real network call.
  const project = Screenwriter.createProject('A dancehall producer chasing one more hit before retirement.');
  const opts = { context: { authenticated: true }, executor: mockTextExecutor };

  const results = await Screenwriter.developPilot(project, opts);
  assert.equal(results.length, 7, 'All 7 stages must run when every stage has an eligible provider (mocked)');
  for (const r of results) assert.equal(r.success, true, `Stage ${r.stage} unexpectedly failed with a mocked executor and an authenticated context`);

  // Real project-graph wiring: SCREENPLAY must depend on OUTLINE's real asset id, not a guess.
  const screenplayAssetId = project.stageAssets.SCREENPLAY;
  const screenplayAsset = project.graph.getAsset(screenplayAssetId);
  const outlineAssetId = project.stageAssets.OUTLINE;
  assert(screenplayAsset.dependencies.includes(outlineAssetId), 'SCREENPLAY asset must genuinely depend on the real OUTLINE asset produced this run');

  // -- Selective revision: reusing js/ibis-project-graph.js's real dependency computation --------
  const conceptAssetIdBefore = project.stageAssets.CONCEPT;
  const revised = await Screenwriter.revise(project, 'OUTLINE', opts);
  // Revising OUTLINE must cascade to SCREENPLAY, CONTINUITY_REPORT and RUNTIME_ESTIMATE (real
  // dependents), but must NOT touch CONCEPT or CHARACTERS (real non-dependents).
  const revisedStageIds = revised.map((r) => r.stage);
  assert(revisedStageIds.includes('outline'));
  assert(revisedStageIds.includes('screenplay'));
  assert(!revisedStageIds.includes('concept'), 'Revising OUTLINE must not re-run CONCEPT -- CONCEPT does not depend on OUTLINE');
  assert(!revisedStageIds.includes('characters'), 'Revising OUTLINE must not re-run CHARACTERS -- CHARACTERS does not depend on OUTLINE');
  assert.equal(project.stageAssets.CONCEPT, conceptAssetIdBefore, 'The original CONCEPT asset must be untouched by an OUTLINE revision');
}

console.log('ftnscreen-screenwriter-audit: real current fabric state verified (creative stages honestly unavailable to guests today), real end-to-end RUNTIME_ESTIMATION execution verified, pipeline orchestration and selective-revision logic verified via an explicitly-labeled mock executor.');
