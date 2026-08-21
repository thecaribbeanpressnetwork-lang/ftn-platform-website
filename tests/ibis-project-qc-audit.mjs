// Real correctness test for js/ibis-project-qc.js -- deterministic, no AI model. Proves it
// reports the directive's own exact status vocabulary (READY_FOR_REVIEW /
// NOT_READY_ISSUES_REQUIRE_ATTENTION) against real project-graph asset state, never a fabricated
// pass.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-project-graph.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-project-qc.js', 'utf8'), context);
const Graph = context.window.FTN.IbisProjectGraph;
const QC = context.window.FTN.IbisProjectQC;

function buildProject(projectId) {
  return { projectId, graph: Graph.createGraph(), stageAssets: {}, runtimeTargetMinutes: 30 };
}

// -- Empty project: honestly NOT_READY, every real gap listed -----------------------------------
{
  const project = buildProject('proj-empty');
  const result = QC.run(project);
  assert.equal(result.status, 'NOT_READY_ISSUES_REQUIRE_ATTENTION');
  assert.equal(result.completeness.complete, false);
  // Note: missingStages is a vm-realm Array (a known cross-realm gotcha already documented in
  // tests/ibis-project-graph-audit.mjs) -- .length/.includes() are safe value checks,
  // deepEqual/deepStrictEqual are not.
  assert.equal(result.completeness.missingStages.length, 5);
  ['CONCEPT', 'CHARACTERS', 'BEAT_SHEET', 'OUTLINE', 'SCREENPLAY'].forEach((stage) => {
    assert(result.completeness.missingStages.includes(stage), `${stage} must be listed as missing`);
  });
  assert.equal(result.runtime.checked, false);
  assert.equal(result.continuity.checked, false);
  assert(result.blockers.length >= 3, 'Missing stages, missing runtime and missing continuity must all be listed as real blockers');
}

// -- No project supplied: fails closed, never silently "ready" ----------------------------------
{
  const result = QC.run(null);
  assert.equal(result.status, 'NOT_READY_ISSUES_REQUIRE_ATTENTION');
}

// -- Fully populated project, runtime within target: genuinely READY_FOR_REVIEW -----------------
{
  const project = buildProject('proj-complete');
  const g = project.graph;
  const concept = g.addAsset({ projectId: project.projectId, assetType: 'CONCEPT', provenance: { text: 'A detective uncovers a smuggling ring.' } });
  project.stageAssets.CONCEPT = concept.assetId;
  const characters = g.addAsset({ projectId: project.projectId, assetType: 'CHARACTERS', dependencies: [concept.assetId], provenance: { text: 'Detective Ana Marchand, ambitious, guarded.' } });
  project.stageAssets.CHARACTERS = characters.assetId;
  const beats = g.addAsset({ projectId: project.projectId, assetType: 'BEAT_SHEET', dependencies: [characters.assetId], provenance: { text: 'Beat 1: Ana finds the ledger. Beat 2: ...' } });
  project.stageAssets.BEAT_SHEET = beats.assetId;
  const outline = g.addAsset({ projectId: project.projectId, assetType: 'OUTLINE', dependencies: [beats.assetId], provenance: { text: 'Scene 1: Port of Spain docks at night...' } });
  project.stageAssets.OUTLINE = outline.assetId;
  const screenplay = g.addAsset({ projectId: project.projectId, assetType: 'SCREENPLAY', dependencies: [outline.assetId], provenance: { text: new Array(235 * 30).fill('word').join(' ') } });
  project.stageAssets.SCREENPLAY = screenplay.assetId;
  const continuity = g.addAsset({ projectId: project.projectId, assetType: 'CONTINUITY_REPORT', dependencies: [screenplay.assetId], provenance: { text: 'No continuity errors found.' } });
  project.stageAssets.CONTINUITY_REPORT = continuity.assetId;
  const runtime = g.addAsset({ projectId: project.projectId, assetType: 'RUNTIME_ESTIMATE', dependencies: [screenplay.assetId], provenance: { data: { minutes: 30, targetMinutes: 30, withinTarget: true } } });
  project.stageAssets.RUNTIME_ESTIMATE = runtime.assetId;

  const result = QC.run(project);
  assert.equal(result.status, 'READY_FOR_REVIEW', `Expected READY_FOR_REVIEW with all real stages present and runtime within target, got blockers: ${JSON.stringify(result.blockers)}`);
  assert.equal(result.completeness.complete, true);
  assert.equal(result.runtime.checked, true);
  assert.equal(result.runtime.withinTarget, true);
  assert.equal(result.continuity.checked, true);
  assert.equal(result.continuity.weakSignal, 'no-issues-phrase-detected');
  assert.equal(result.blockers.length, 0);
}

// -- Complete stages but runtime outside target: honestly NOT_READY, not silently accepted ------
{
  const project = buildProject('proj-runtime-off');
  const g = project.graph;
  ['CONCEPT', 'CHARACTERS', 'BEAT_SHEET', 'OUTLINE', 'SCREENPLAY'].forEach(function (assetType) {
    const asset = g.addAsset({ projectId: project.projectId, assetType: assetType, provenance: { text: 'placeholder content for ' + assetType } });
    project.stageAssets[assetType] = asset.assetId;
  });
  const runtime = g.addAsset({ projectId: project.projectId, assetType: 'RUNTIME_ESTIMATE', provenance: { data: { minutes: 8, targetMinutes: 30, withinTarget: false } } });
  project.stageAssets.RUNTIME_ESTIMATE = runtime.assetId;
  const continuity = g.addAsset({ projectId: project.projectId, assetType: 'CONTINUITY_REPORT', provenance: { text: 'Issue: Ana\'s eye colour changes between scenes 2 and 9.' } });
  project.stageAssets.CONTINUITY_REPORT = continuity.assetId;

  const result = QC.run(project);
  assert.equal(result.status, 'NOT_READY_ISSUES_REQUIRE_ATTENTION');
  assert(result.blockers.some((b) => /outside the target tolerance/.test(b)));
  assert.equal(result.continuity.weakSignal, 'review-report-text', 'A report describing a real issue must not be misread as "no issues found"');
}

console.log('ibis-project-qc-audit: empty-project and null-project fail-closed verified, fully-populated project correctly READY_FOR_REVIEW, out-of-target runtime correctly NOT_READY, continuity weak-signal detection verified on both a clean and an issue-flagging report.');
