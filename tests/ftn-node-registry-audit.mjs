// Real correctness test for js/ftn-node-registry.js -- proves the derivation rules produce
// honest results against the actual, current js/product-registry-data.js (not a fixture copy),
// so this test breaks loudly if a future product-registry change silently changes what IBIS
// believes it can route into.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/product-registry-data.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/ftn-node-registry.js', 'utf8'), context);

const NodeRegistry = context.window.FTN.NodeRegistry;
const all = NodeRegistry.all();

assert(all.length >= 20, 'Expected the node registry to derive a node for every real product-registry-data.js entry');
assert.equal(NodeRegistry.get('does-not-exist'), null);

// The brain itself.
assert.equal(NodeRegistry.get('ibis-ai').IBISRole, 'BRAIN', 'ibis-ai is the one BRAIN node');

// Private/vaulted products must never be presented as something ibis can honestly route a public
// guest into -- this is the same public/private boundary those products' own pages already
// enforce (js/product-registry-data.js visibility field), just asserted here from ibis's side too.
for (const privateId of ['mission-control', 'love', 'health']) {
  const node = NodeRegistry.get(privateId);
  assert(node, `${privateId} must exist in product-registry-data.js`);
  assert.equal(node.canIbisRouteInto, false, `${privateId} must not be a routable destination for ibis`);
  assert.equal(node.IBISRole, 'PRIVATE_NOT_ROUTABLE', `${privateId} must be marked PRIVATE_NOT_ROUTABLE`);
}

// A representative real public product must be routable.
const communityConnect = NodeRegistry.get('community-connect');
assert(communityConnect, 'community-connect must exist');
assert.equal(communityConnect.canIbisRouteInto, true, 'community-connect is a real, live, public product ibis may route into');

// Heuristic input/output type inference must reflect real declared capabilities, not guesses --
// riddim/daw/dj-tube all declare real audio-handling capabilities in product-registry-data.js.
assert(NodeRegistry.get('riddim').outputTypes.includes('AUDIO'), 'riddim declares audio-related capabilities and must infer AUDIO output');
assert(NodeRegistry.get('daw').inputTypes.includes('AUDIO'), 'daw declares local-audio-import and must infer AUDIO input');
assert(NodeRegistry.get('dj-tube').inputTypes.includes('AUDIO'), 'dj-tube declares local-deck-loading and must infer AUDIO input');

// routable() must be a strict subset of all() containing only canIbisRouteInto:true nodes.
const routable = NodeRegistry.routable();
assert(routable.length > 0 && routable.length < all.length, 'Some but not all nodes should be routable -- private/vaulted nodes exist for a reason');
for (const node of routable) assert.equal(node.canIbisRouteInto, true);

console.log(`ftn-node-registry-audit: ${all.length} nodes derived from the real product registry, ${routable.length} routable, private/vaulted boundary and capability-type inference verified.`);
