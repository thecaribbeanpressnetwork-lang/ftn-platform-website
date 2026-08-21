// Real correctness test for js/ibis-client.js -- the universal "node -> IBIS -> capability ->
// provider -> result -> provenance" entry point (Phase 5). Proves the permission boundary, the
// capability-recognition gate, real local end-to-end execution (BPM detection, no network call),
// and honest blocked states for every other capability -- against the REAL, current registries,
// not fixtures.
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
vm.runInContext(fs.readFileSync('js/ibis-audio-analysis.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ibis-client.js', 'utf8'), context);

const IbisClient = context.window.FTN.IbisClient;
const NodeRegistry = context.window.FTN.NodeRegistry;

// -- Absolute scope boundary: Community Connect must never be reachable through IBIS Client -----
const ccResult = await IbisClient.request({ nodeId: 'community-connect', capability: 'TEXT' });
assert.equal(ccResult.success, false);
assert.equal(ccResult.blocked, true);
assert.equal(ccResult.code, 'NODE_EXCLUDED', 'Community Connect must be blocked at the node-permission stage, before capability/eligibility are even checked');

// -- Unknown node must fail safely, not throw or silently proceed -------------------------------
const unknownNode = await IbisClient.request({ nodeId: 'does-not-exist-node', capability: 'TEXT' });
assert.equal(unknownNode.success, false);
assert.equal(unknownNode.code, 'UNKNOWN_NODE');

// -- Private/vaulted nodes must not be authorized to call IBIS capabilities ----------------------
for (const privateId of ['mission-control', 'love', 'health']) {
  const result = await IbisClient.request({ nodeId: privateId, capability: 'TEXT' });
  assert.equal(result.success, false);
  assert.equal(result.code, 'NODE_NOT_AUTHORIZED', `${privateId} must not be authorized to call IBIS capabilities`);
}

// -- Unrecognized capability must fail closed, never silently accepted --------------------------
const badCapability = await IbisClient.request({ nodeId: 'ibis-ai', capability: 'NOT_A_REAL_CAPABILITY' });
assert.equal(badCapability.success, false);
assert.equal(badCapability.code, 'UNKNOWN_CAPABILITY');

// -- Real, working, local, zero-cost end-to-end execution through the universal fabric ----------
// A different node (Riddim, not ibis-ai itself) requests BPM_DETECTION -- proving a node other
// than IBIS's own page can genuinely execute a capability through this layer, not just IBIS-ai.
function synthesizeClickTrack(bpm, seconds, sampleRate) {
  const total = Math.floor(seconds * sampleRate);
  const samples = new Float32Array(total);
  const interval = (60 / bpm) * sampleRate;
  for (let i = 0; i < total; i++) {
    const t = (i % interval) / sampleRate;
    samples[i] = Math.sin(2 * Math.PI * 58 * t) * Math.exp(-t / 0.28);
  }
  return samples;
}
const sampleRate = 44100;
const samples = synthesizeClickTrack(120, 8, sampleRate);
const bpmResult = await IbisClient.request({
  nodeId: 'riddim',
  capability: 'BPM_DETECTION',
  payload: { samples, sampleRate },
});
assert.equal(bpmResult.success, true, 'BPM_DETECTION must genuinely execute through the universal fabric for an authorized node');
assert(Math.abs(bpmResult.result.bpm - 120) < 2, `Expected a real ~120 BPM detection, got ${bpmResult.result.bpm}`);
assert.equal(bpmResult.provenance.provider, 'ibis-local-dsp');
assert.equal(bpmResult.provenance.capability, 'BPM_DETECTION');
assert.equal(bpmResult.provenance.nodeId, 'riddim');
assert.equal(bpmResult.provenance.costToIbis, 'ZERO_COST_TO_IBIS');
assert(typeof bpmResult.provenance.requestedAt === 'string' && typeof bpmResult.provenance.respondedAt === 'string');

// -- TEXT with no eligible guest provider today must fail honestly, not fabricate an answer -----
const textResult = await IbisClient.request({ nodeId: 'ibis-ai', capability: 'TEXT', context: { authenticated: false } });
assert.equal(textResult.success, false);
assert.equal(textResult.code, 'NO_ELIGIBLE_PROVIDER', 'No guest TEXT provider is deployed yet -- this must be reported honestly, not faked');

// -- Sitewide callers (js/ibis-widget.js) deliberately omit nodeId -- must skip the node-permission
// gate entirely, not be silently blocked, and reach the exact same honest capability-stage outcome.
const noNodeIdResult = await IbisClient.request({ capability: 'TEXT', context: { authenticated: false } });
assert.equal(noNodeIdResult.code, 'NO_ELIGIBLE_PROVIDER', 'Omitting nodeId must skip the permission gate cleanly, landing on the same real eligibility outcome as an authorized node');

// -- describeNode(): real, current data only, never a fabricated capability list -----------------
const ccDescribed = IbisClient.describeNode('community-connect');
assert.equal(ccDescribed.canCallIbisCapabilities, false);
assert(typeof ccDescribed.excludedReason === 'string' && ccDescribed.excludedReason.length > 0);
const riddimDescribed = IbisClient.describeNode('riddim', {});
assert.equal(riddimDescribed.canCallIbisCapabilities, true);
assert(riddimDescribed.eligibleCapabilitiesNow.includes('BPM_DETECTION'), 'riddim must show BPM_DETECTION as genuinely eligible right now');
assert(!riddimDescribed.eligibleCapabilitiesNow.includes('IMAGE_GENERATION'), 'riddim must NOT claim IMAGE_GENERATION is eligible -- no provider is deployed yet');

// -- Every registered, IBIS-authorized node must resolve permission correctly (realistic path) --
// This is the "test at least one realistic request path through every registered node" proof:
// each authorized node reaches the SAME honest NO_ELIGIBLE_PROVIDER/blocked-by-capability outcome
// for a capability with no live provider, never a fabricated success, and never a permission
// false-positive/false-negative.
const allNodes = NodeRegistry.all();
assert(allNodes.length >= 20, 'Sanity check: the real product registry must still be loaded');
let authorizedChecked = 0;
let excludedOrPrivateChecked = 0;
for (const node of allNodes) {
  const result = await IbisClient.request({ nodeId: node.id, capability: 'IMAGE_GENERATION' });
  if (node.id === 'community-connect') {
    assert.equal(result.code, 'NODE_EXCLUDED');
    excludedOrPrivateChecked += 1;
    continue;
  }
  if (!node.canCallIbisCapabilities) {
    assert.equal(result.code, 'NODE_NOT_AUTHORIZED', `${node.id} is private/vaulted and must not be authorized`);
    excludedOrPrivateChecked += 1;
    continue;
  }
  // Authorized node: must get past the permission gate and land on the honest, real, current
  // state of IMAGE_GENERATION (no provider deployed yet) -- never NODE_EXCLUDED/NODE_NOT_AUTHORIZED.
  assert.equal(result.success, false);
  assert.equal(result.code, 'NO_ELIGIBLE_PROVIDER', `${node.id} should reach the eligibility stage and get an honest "no provider" answer, not a permission block`);
  authorizedChecked += 1;
}
assert(authorizedChecked >= 15, 'Most real nodes should be IBIS-authorized');
assert(excludedOrPrivateChecked >= 3, 'community-connect + at least 3 private/vaulted nodes must be correctly gated');

console.log(`ibis-client-audit: Community Connect exclusion verified, unknown-node/unknown-capability fail-closed, real local BPM_DETECTION execution verified end-to-end through the universal fabric (provider=ibis-local-dsp, cost=ZERO_COST_TO_IBIS), and all ${allNodes.length} real registered nodes resolved the correct permission outcome (${authorizedChecked} authorized, ${excludedOrPrivateChecked} correctly gated).`);
