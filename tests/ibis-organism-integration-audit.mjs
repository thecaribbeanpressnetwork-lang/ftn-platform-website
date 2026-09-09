import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

function load(path, context) {
  vm.runInContext(fs.readFileSync(path, 'utf8'), context, { filename: path });
}

function storage() {
  const rows = new Map();
  return {
    getItem: key => rows.has(key) ? rows.get(key) : null,
    setItem: (key, value) => rows.set(key, String(value)),
    removeItem: key => rows.delete(key),
  };
}

const context = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Set,
  Map,
  Promise,
  TextEncoder,
  crypto: webcrypto,
  localStorage: storage(),
  navigator: {},
  fetch: async (url, options) => ({
    ok: true,
    json: async () => ({ source: 'official-fixture', opportunities: [{ id: 'live-1', title: 'Official Caribbean opportunity' }] }),
  }),
});
context.globalThis = context;
context.window = context;
context.FTN = {};

for (const file of [
  'js/ibis-personal-context.js',
  'js/ibis-permission-ledger.js',
  'js/ibis-app-registry.js',
  'js/ibis-connection-fabric.js',
  'js/ibis-native-connections.js',
  'js/ibis-founder-cognitive-layer.js',
  'js/ibis-funding-strategy.js',
  'js/ibis-universal-router.js',
  'js/ibis-multi-agent-orchestrator.js',
  'js/ibis-runtime.js',
]) load(file, context);

await context.FTN.PersonalContext.upsert('founder', 'funding-policy', {
  homeCountry: 'Trinidad and Tobago',
  payoutRequirement: 'Receivable through a Trinidad and Tobago bank',
  preferFreeToApply: true,
  protectOwnership: true,
  weights: { strategicValue: 18, probability: 14 },
}, { pinned: true, source: 'founder' });

const cognitive = await context.FTN.FounderCognitiveLayer.snapshot();
const publicCognitive = await context.FTN.FounderCognitiveLayer.publicSnapshot();
assert.equal(cognitive.schemaVersion, 1);
assert.match(cognitive.integrity.digest, /^[a-f0-9]{64}$/);
assert.equal(await context.FTN.FounderCognitiveLayer.verify(cognitive), true);
assert.equal(publicCognitive.profile.visibility, 'PUBLIC_FOUNDER_REASONING_MODEL');
assert.deepEqual(Array.from(publicCognitive.profile.decisionGate), ['user value', 'ecosystem value', 'ownership', 'data value', 'revenue and economic value', 'execution cost', 'future optionality']);
assert.equal(await context.FTN.FounderCognitiveLayer.verify(publicCognitive), true);

const liveRoute = await context.FTN.ConnectionFabric.resolve('ftn-opportunities', 'SEARCH');
assert.equal(liveRoute.success, true);
assert.equal(liveRoute.path, 'REST');
const liveResult = await context.FTN.ConnectionFabric.invoke('ftn-opportunities', 'SEARCH', { refresh: true });
assert.equal(liveResult.success, true);
assert.equal(liveResult.path, 'REST');
assert.equal(liveResult.data.source, 'official-fixture');
const altered = JSON.parse(JSON.stringify(cognitive));
altered.profile.funding.preferFreeToApply = false;
assert.equal(await context.FTN.FounderCognitiveLayer.verify(altered), false, 'an altered founder snapshot must fail its integrity check');

const route = context.FTN.UniversalRouter.route('Find the strongest funding opportunity for FTN');
assert(route.capabilityCandidates.includes('FUNDING_SEARCH'));
assert.deepEqual(Array.from(route.lifecycle), ['UNDERSTAND', 'RESEARCH', 'WATCH', 'PREDICT', 'MATCH', 'ACT']);

let observedPayload = null;
context.FTN.HeadspaceFabric = {
  request: async (capability, payload) => {
    observedPayload = payload;
    if (capability !== 'FUNDING_SEARCH') return { success: false, errorType: 'UNEXPECTED_CAPABILITY' };
    const result = context.FTN.IbisFundingStrategy.search(payload.opportunities, payload.fundingPolicy, { now: '2026-09-08T00:00:00Z' });
    return { success: result.success, result };
  },
};

const opportunities = [
  { id: 'weak', title: 'Generic paid accelerator', type: 'ACCELERATOR', geography: 'Global', fee: 500, ownershipImpact: 'equity required', strategicValue: 2, probability: 0.2, sourceUrl: 'https://example.test/weak', verifiedAt: '2026-09-01' },
  { id: 'strong', title: 'Caribbean AI grant', type: 'MONEY', geography: 'Trinidad and Tobago / Caribbean', fee: 0, ownershipImpact: 'no equity', strategicValue: 5, probability: 0.7, payoutCompatible: true, deadline: '2026-10-05', sourceUrl: 'https://example.test/strong', verifiedAt: '2026-09-07' },
];

context.FTN.Auth = {
  getVerifiedUser: async () => ({ id: 'verified-founder' }),
  ownerAccess: async () => ({ allowed: true, ownerIdentity: true, deviceApprovalRequired: false }),
};
context.FTN.PersonalContext.configure({ auth: { getVerifiedUser: async () => null }, storage: context.localStorage });

const answer = await context.FTN.IbisRuntime.ask('Find the strongest funding opportunity for FTN', {
  capabilityPayloads: { FUNDING_SEARCH: { opportunities } },
});
assert.equal(answer.success, true);
assert.equal(answer.run.result.outputs[0].output.result.matches[0].opportunity.id, 'strong');
assert.equal(observedPayload.fundingPolicy.homeCountry, 'Trinidad and Tobago');
assert.match(answer.run.tasks[0].prompt, /PUBLIC FOUNDER REASONING MODEL/);
assert.match(answer.run.tasks[0].prompt, /PRIVATE FOUNDER COGNITIVE CONTEXT/);
assert.match(answer.run.tasks[0].prompt, new RegExp(cognitive.integrity.digest.slice(0, 12)));
assert.equal(answer.cognitiveContext.integrity.digest, cognitive.integrity.digest);
assert.equal(answer.identity.founderAuthorized, true);

// Authentication alone is not private founder authorization. Every user receives the public
// Founder Reasoning Model, while private history and funding data remain owner/device-gated.
context.FTN.Auth = {
  getVerifiedUser: async () => ({ id: 'ordinary-user' }),
  ownerAccess: async () => ({ allowed: false, ownerIdentity: false }),
};
const publicAnswer = await context.FTN.IbisRuntime.ask('Find the strongest funding opportunity for FTN', {
  capabilityPayloads: { FUNDING_SEARCH: { opportunities } },
});
assert.match(publicAnswer.run.tasks[0].prompt, /PUBLIC FOUNDER REASONING MODEL/);
assert.doesNotMatch(publicAnswer.run.tasks[0].prompt, /PRIVATE FOUNDER COGNITIVE CONTEXT/);
assert.equal(observedPayload.cognitiveContext, null, 'the governed public model travels in the prompt, not as a raw cognitive payload');
assert.equal(observedPayload.fundingPolicy, null);
assert.equal(publicAnswer.identity.authenticated, true);
assert.equal(publicAnswer.identity.founderAuthorized, false);

context.FTN.Auth = { getVerifiedUser: async () => null };
const guarded = await context.FTN.IbisRuntime.ask('Apply for the strongest funding opportunity and submit it', {
  capabilityPayloads: { FUNDING_SEARCH: { opportunities } },
});
assert.equal(guarded.status, 'WAITING_PERMISSION');
assert(guarded.run.result.waitingPermissions.length > 0, 'submission must pause at the permission boundary');

console.log('ibis organism integration audit: founder cognition integrity, reasoning injection, funding ranking, lifecycle and permission boundary verified.');
