// Real correctness test for js/ibis-project-graph.js against the two exact scenarios the Phase 4
// directive named: "Change only Scene 4" (unrelated scenes must stay untouched) and "Change this
// one lyric" (real, honestly cascading dependents). This proves the selective-regeneration
// property structurally -- it does not claim any real generation happened.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/ibis-project-graph.js', 'utf8'), context);
const Graph = context.window.FTN.IbisProjectGraph;

// -- Scenario: PROJECT / LYRICS v1 / SONG v1 (VOCALS v1 + INSTRUMENTAL v1) / VIDEO v1 / SCENE 1-4
const g = Graph.createGraph();
const projectId = 'proj-reggae-demo';

const lyricsV1 = g.addAsset({ projectId, assetType: 'LYRICS', operation: 'LYRICS_TO_MUSIC' });
const instrumentalV1 = g.addAsset({ projectId, assetType: 'INSTRUMENTAL', operation: 'INSTRUMENTAL_GENERATION' });
const vocalsV1 = g.addAsset({ projectId, assetType: 'VOCALS', operation: 'TEXT_TO_SPEECH', dependencies: [lyricsV1.assetId] });
const songV1 = g.addAsset({ projectId, assetType: 'SONG', operation: 'ARRANGEMENT', dependencies: [vocalsV1.assetId, instrumentalV1.assetId] });
const videoV1 = g.addAsset({ projectId, assetType: 'VIDEO', operation: 'IMAGE_TO_VIDEO', dependencies: [songV1.assetId] });
const scene1 = g.addAsset({ projectId, assetType: 'SCENE', operation: 'VIDEO_EDIT', dependencies: [videoV1.assetId] });
const scene2 = g.addAsset({ projectId, assetType: 'SCENE', operation: 'VIDEO_EDIT', dependencies: [videoV1.assetId] });
const scene3 = g.addAsset({ projectId, assetType: 'SCENE', operation: 'VIDEO_EDIT', dependencies: [videoV1.assetId] });
const scene4 = g.addAsset({ projectId, assetType: 'SCENE', operation: 'VIDEO_EDIT', dependencies: [videoV1.assetId] });

// Version numbering: a fresh asset with no parent is v1.
assert.equal(lyricsV1.version, 1);

// -- "Change only Scene 4" -------------------------------------------------
// Note: regenerationSet() executes inside the vm context, so it returns a vm-realm Array whose
// prototype differs from this file's own Array -- assert.deepEqual/deepStrictEqual on such a
// value fails even when the contents are identical (a known cross-realm gotcha, not a real bug).
// .length/.includes() are safe: they're value comparisons, not prototype-identity checks.
const scene4RegenSet = g.regenerationSet(scene4.assetId);
assert.equal(scene4RegenSet.length, 1, 'Nothing depends on an individual scene -- regenerating Scene 4 must touch only Scene 4');
assert(scene4RegenSet.includes(scene4.assetId), 'The regeneration set for Scene 4 must contain Scene 4 itself');
const scene4Preserved = g.assetsToPreserve(projectId, scene4.assetId);
for (const untouched of [scene1.assetId, scene2.assetId, scene3.assetId, lyricsV1.assetId, vocalsV1.assetId, instrumentalV1.assetId, songV1.assetId, videoV1.assetId]) {
  assert(scene4Preserved.includes(untouched), `${untouched} must be preserved when only Scene 4 changes`);
}
assert(!scene4Preserved.includes(scene4.assetId), 'Scene 4 itself is the one asset NOT preserved (it is the one being changed)');

// -- "Change this one lyric" -----------------------------------------------
// A real edit creates a NEW version (never mutates history), linked via parentAssetId.
const lyricsV2 = g.addAsset({ projectId, assetType: 'LYRICS', parentAssetId: lyricsV1.assetId, operation: 'TEXT_GENERATION' });
assert.equal(lyricsV2.version, 2, 'Editing lyrics must produce version 2, not overwrite version 1');
assert.equal(g.getAsset(lyricsV1.assetId).version, 1, 'The original version must remain intact and unchanged');

// Real cascading dependents: vocals were built from the OLD lyrics, so they -- and everything
// downstream of them -- are honest candidates for regeneration. This is real cascade, not scene
// isolation: unlike Scene 4, a lyric change legitimately reaches the video and all four scenes,
// because they really do descend from the song that descends from the vocals that descend from
// the lyrics. The directive's own example ("Potentially: LYRICS v2, VOCAL REGENERATION, SONG v2,
// DEPENDENT VIDEO SCENE(S)") is exactly this transitive closure.
const lyricsV1RegenSet = g.regenerationSet(lyricsV1.assetId);
for (const shouldCascade of [lyricsV1.assetId, vocalsV1.assetId, songV1.assetId, videoV1.assetId, scene1.assetId, scene2.assetId, scene3.assetId, scene4.assetId]) {
  assert(lyricsV1RegenSet.includes(shouldCascade), `${shouldCascade} genuinely depends (directly or transitively) on the changed lyrics and must be in the regeneration set`);
}
// instrumentalV1 does not depend on lyrics at all -- it must NOT be swept in.
assert(!lyricsV1RegenSet.includes(instrumentalV1.assetId), 'The instrumental has no dependency on lyrics and must not be falsely included');

// -- Unknown asset must fail closed, not silently return an empty/fabricated set -----------------
assert.throws(() => g.regenerationSet('does-not-exist'), /Unknown assetId/);

console.log(`ibis-project-graph-audit: Scene-4 isolation verified (regen set = 1 asset, ${scene4Preserved.length} preserved), lyric-change cascade verified (regen set = ${lyricsV1RegenSet.length + 1} assets including the instrumental correctly excluded), version history verified (v1 intact, v2 created).`);
