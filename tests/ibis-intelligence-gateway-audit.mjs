import assert from 'node:assert/strict';
import { deterministicAnswer, gatewayHealth, runGateway } from '../supabase/functions/_shared/ibis-intelligence-gateway.ts';

assert.equal(deterministicAnswer('What is 2 plus 2?').answer, '2 + 2 = 4.');
assert.equal(deterministicAnswer('10 divided by 0').answer, 'Division by zero is undefined.');
assert.match(deterministicAnswer('What is FTN ibis?').answer, /Caribbean-first intelligence/);
assert.match(deterministicAnswer('What does FTN Riddim do?', [{ name: 'FTN Riddim', route: '/riddim/', tagline: 'Powering Caribbean music.' }]).answer, /\/riddim\//);

let modelCalls = 0;
const deterministic = await runGateway({
  text: 'What is 7 times 8?',
  requestId: 'deterministic-request',
  providers: [{ id: 'must-not-run', label: 'must not run', configured: true, async run() { modelCalls += 1; return { answer: 'wrong', model: 'wrong' }; } }],
});
assert.equal(deterministic.answer, '7 * 8 = 56.');
assert.equal(modelCalls, 0, 'deterministic questions must never spend model calls');
assert.equal(deterministic.evidenceState, 'DETERMINISTIC');
assert.equal(deterministic.confidence, 'HIGH');
assert.match(deterministic.gatewayVersion, /^ibis-gateway-/);

const order = [];
const fallback = await runGateway({
  text: 'Give me one useful planning principle.',
  requestId: 'fallback-request',
  providers: [
    { id: 'failing-a', label: 'A', configured: true, async run() { order.push('a'); throw new Error('provider down'); } },
    { id: 'working-b', label: 'B', configured: true, async run() { order.push('b'); return { answer: 'Preserve optionality while evidence is incomplete.', model: 'b-1' }; } },
  ],
});
assert.deepEqual(order, ['a', 'b']);
assert.equal(fallback.provider, 'B');
assert.equal(fallback.fallbackUsed, true);
assert.equal(fallback.answerClass, 'MODEL_RESPONSE');
assert.equal(fallback.evidenceState, 'MODEL_GENERATED');

let skippedCalls = 0;
const alwaysFails = { id: 'circuit-test', label: 'Circuit test', configured: true, async run() { skippedCalls += 1; throw new Error('down'); } };
await runGateway({ text: 'Unknown request one', requestId: 'circuit-1', providers: [alwaysFails] });
await runGateway({ text: 'Unknown request two', requestId: 'circuit-2', providers: [alwaysFails] });
await runGateway({ text: 'Unknown request three', requestId: 'circuit-3', providers: [alwaysFails] });
assert.equal(skippedCalls, 2, 'provider circuit must open after two consecutive failures');

const unavailable = await runGateway({ text: 'An unhandled question', requestId: 'unavailable-request', providers: [] });
assert.equal(unavailable.requestId, 'unavailable-request');
assert.equal(unavailable.answerClass, 'DEGRADED');
assert.equal(unavailable.evidenceState, 'NO_ANSWER_GENERATED');
assert.match(unavailable.answer, /could not reach an answer provider/i, 'an outage must return a useful non-empty answer');
assert.equal(unavailable.provider, 'FTN ibis gateway');
assert.equal(unavailable.model, 'none');
assert.equal(unavailable.confidence, 'UNAVAILABLE');
assert.equal(unavailable.fallbackState, 'EXHAUSTED');
assert.deepEqual(unavailable.providerFailures, []);

const diagnosed = await runGateway({
  text: 'Diagnose a provider outage',
  requestId: 'diagnostic-request',
  providers: [
    { id: 'unauthorized', label: 'Unauthorized', configured: true, async run() { throw new Error('HTTP_401'); } },
    { id: 'opaque', label: 'Opaque', configured: true, async run() { throw new Error('secret provider response must not escape'); } },
  ],
});
assert.deepEqual(diagnosed.providerFailures, [
  { provider: 'unauthorized', code: 'HTTP_401' },
  { provider: 'opaque', code: 'PROVIDER_ERROR' },
]);
assert.doesNotMatch(JSON.stringify(diagnosed), /secret provider response/);

const health = gatewayHealth([
  { id: 'configured', label: 'Configured', configured: true, async run() { return { answer: 'ok', model: 'x' }; } },
  { id: 'disabled', label: 'Disabled', configured: false, async run() { return { answer: 'no', model: 'x' }; } },
]);
assert.equal(health.gateway, 'ready');
assert.equal(health.deterministic, true);
assert.equal(health.configuredProviders, 1);
assert.match(health.version, /^ibis-gateway-/);
assert.deepEqual(health.providers, [
  { id: 'configured', label: 'Configured', configured: true, available: true, model: null },
  { id: 'disabled', label: 'Disabled', configured: false, available: false, model: null },
]);

console.log('ibis-intelligence-gateway-audit: deterministic answers, zero-cost bypass, provider failover, circuit breaker, health summary and honest total-failure contract verified.');
