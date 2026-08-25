// FTN Platform — Phase 4A ibis source/provider routing consolidation audit.
//
// Guards the specific gaps this pass found and closed: (1) js/ibis-provenance.js's shared envelope
// schema, additive and never fabricating a missing field; (2) js/ibis-client.js's two previously-
// missing default executors (CARIBBEAN_LANGUAGE_ID, LIVE_INTELLIGENCE) and its TIMEOUT-vs-real-
// network-error mislabeling fix; (3) js/ibis-ai-workspace.js's serverAI() now actually consulting
// the eligibility engine before calling supabase/functions/ibis-query, closing the real control-
// bypass this pass found (the registry's enabled/disabled flag did not previously gate that call
// path at all); (4) the five Edge Function fetch calls that had no timeout now have one; (5) the
// registry's new additive timeoutMs/privacyClassification/attributionRequired defaults.
//
// No real network call is made anywhere in this file -- everything is either pure local logic
// (ibis-provenance.js, ibis-client.js's dispatch/routing) or a static source-content assertion.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// vm contexts have their own realm (own Array/Object constructors) -- deepEqual against a
// cross-realm array/object can behave inconsistently, the same gotcha other ibis test files
// document (e.g. tests/ibis-project-graph-audit.mjs). Normalize through JSON round-trip before
// comparing, same fix used elsewhere in this suite.
function plain(v) { return JSON.parse(JSON.stringify(v)); }

function loadFabric(context) {
  vm.createContext(context);
  for (const file of ['js/product-registry-data.js', 'js/ftn-node-registry.js', 'js/ibis-capability-taxonomy.js', 'js/ibis-provider-registry.js', 'js/ibis-eligibility.js', 'js/ibis-provenance.js', 'js/ibis-audio-analysis.js', 'js/ibis-caribbean-language-id.js', 'js/ibis-client.js']) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  }
}

// --- 1. js/ibis-provenance.js: schema, additive, never-fabricated defaults. ---
{
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/ibis-provenance.js', 'utf8'), context);
  const Provenance = context.window.FTN.IbisProvenance;

  const empty = Provenance.build();
  assert.equal(empty.nodeId, null, 'unset nodeId must default to null, never fabricated');
  assert.equal(empty.provider, null);
  assert.equal(empty.sourceIdentity, null);
  assert.equal(empty.sourceUrl, null);
  assert.equal(empty.publisher, null);
  assert.equal(empty.sourceRetrievedAt, null);
  assert.equal(empty.sourceReferenceDate, null);
  assert.equal(empty.retrievalMethod, null);
  assert.equal(empty.model, null);
  assert.deepEqual(plain(empty.routingPath), [], 'no attempts supplied -> empty routing path, not fabricated');
  assert.equal(empty.transformation, null);
  assert.equal(empty.confidenceBasis, 'NOT_ASSESSED', 'confidence must default to the explicit NOT_ASSESSED sentinel, never a guessed value');
  assert.equal(empty.licensingNote, null);
  assert.equal(empty.degradedState, null);

  const populated = Provenance.build({
    capability: 'LIVE_INTELLIGENCE', provider: 'ibis-local-live-research', costToIbis: 'ZERO_COST_TO_IBIS',
    sourceIdentity: 'Hacker News thread #123', sourceUrl: 'https://news.ycombinator.com/item?id=123',
    publisher: 'Hacker News', retrievalMethod: 'LIVE_API_FETCH', confidenceBasis: 'MODERATE',
    attempts: [{ providerId: 'ibis-local-live-research', success: true, errorType: null }],
  });
  assert.equal(populated.sourceIdentity, 'Hacker News thread #123');
  assert.deepEqual(plain(populated.routingPath), ['ibis-local-live-research'], 'routingPath must derive from the real attempts array, not be hand-set separately');
  assert.equal(populated.confidenceBasis, 'MODERATE');
}

// --- 2a. ibis-client.js request() now uses the shared provenance builder and carries the new fields. ---
{
  const context = { window: {} };
  loadFabric(context);
  const IbisClient = context.window.FTN.IbisClient;
  const result = await IbisClient.request({ nodeId: 'riddim', capability: 'BPM_DETECTION', payload: { samples: syntheticClickTrack(120), sampleRate: 44100 } });
  assert.equal(result.success, true, 'real local BPM_DETECTION must still succeed end-to-end after the provenance refactor');
  assert.equal(result.provenance.provider, 'ibis-local-dsp', 'the pre-existing, tested provenance.provider field must be unchanged');
  assert.equal(result.provenance.costToIbis, 'ZERO_COST_TO_IBIS', 'the pre-existing, tested provenance.costToIbis field must be unchanged');
  assert.equal(result.provenance.confidenceBasis, 'NOT_ASSESSED', 'new schema field must be present on a real result, defaulted honestly since BPM detection does not itself assess claim confidence');
  assert.deepEqual(plain(result.provenance.routingPath), ['ibis-local-dsp'], 'new routingPath field must reflect the real attempt path');
}

function syntheticClickTrack(bpm) {
  const sampleRate = 44100, seconds = 4, n = sampleRate * seconds;
  const samples = new Float32Array(n);
  const interval = Math.round((60 / bpm) * sampleRate);
  for (let i = 0; i < n; i += interval) for (let j = 0; j < 200 && i + j < n; j++) samples[i + j] = Math.sin(j * 0.9) * (1 - j / 200);
  return Array.from(samples);
}

// --- 2b. Two previously-missing default executors now exist and are wired. ---
{
  const context = { window: {} };
  loadFabric(context);
  const IbisClient = context.window.FTN.IbisClient;

  // CARIBBEAN_LANGUAGE_ID: real, local, synchronous -- executed for real, no mock needed.
  const langResult = await IbisClient.request({ capability: 'CARIBBEAN_LANGUAGE_ID', payload: { text: 'We go lime by the bacchanal tonight.' } });
  assert.equal(langResult.success, true, 'CARIBBEAN_LANGUAGE_ID is enabled:true in the registry and must now have a working default executor, not UNSUPPORTED');
  assert.equal(langResult.provenance.provider, 'ibis-local-caribbean-language-id');
  assert.equal(langResult.result.evidenceType, 'RESEARCH_DERIVED');

  // LIVE_INTELLIGENCE: the real module makes live network calls, which CI must not depend on --
  // FTN.LiveResearch is stubbed here to prove the CLIENT's dispatch/wiring is correct without
  // touching the network, exactly the same substitution tests/ibis-eligibility-audit.mjs already
  // uses for its own failover proof.
  context.window.FTN.LiveResearch = {
    research: async (query) => ({ synthesis: 'stubbed for CI, query=' + query, sources: [], claimConfidence: { confidence: 'UNSUPPORTED', corroboration: 0 }, sourceCredibilityNote: 'stub', retrievedAt: new Date().toISOString() }),
  };
  const liveResult = await IbisClient.request({ capability: 'LIVE_INTELLIGENCE', payload: { query: 'ferry schedule today' } });
  assert.equal(liveResult.success, true, 'LIVE_INTELLIGENCE is enabled:true in the registry and must now have a working default executor, not UNSUPPORTED');
  assert.equal(liveResult.provenance.provider, 'ibis-local-live-research');
  assert.match(liveResult.result.synthesis, /ferry schedule today/);
}

// --- 2c. TIMEOUT is no longer a catch-all mislabel for every fetch rejection. ---
// Both guest TEXT providers are enabled:false in the live registry today (per the registry's own
// honest state), so there is no eligible path to exercise this end-to-end without hand-authoring a
// synthetic provider -- the eligibility failover test already establishes that pattern separately.
// A direct source-content assertion is the honest, CI-safe way to verify this dead(disabled)-path
// fix without either calling a real network or fabricating a misleading "live" test.
{
  const clientSource = fs.readFileSync('js/ibis-client.js', 'utf8');
  assert.match(clientSource, /errorType: timedOut \? 'TIMEOUT' : 'NETWORK_ERROR'/, 'callTextProvider must distinguish a real timeout from every other fetch failure, not label both TIMEOUT');
  assert.match(clientSource, /new AbortController\(\)/, 'callTextProvider must use a real AbortController, not rely on an unbounded fetch');
  assert.match(clientSource, /Promise\.race\(\[/, 'callGeminiQuery must race against a real timeout since ftn-auth.js\'s invoke() has none of its own');
}

// --- 3. serverAI() now checks eligibility before calling supabase/functions/ibis-query. ---
{
  const workspaceSource = fs.readFileSync('js/ibis-ai-workspace.js', 'utf8');
  const serverAiBody = workspaceSource.slice(workspaceSource.indexOf('async function serverAI'), workspaceSource.indexOf('async function serverAI') + 1800);
  assert.match(serverAiBody, /ensureEligibility\(\)/, 'serverAI() must load the eligibility engine before calling ibis-query');
  assert.match(serverAiBody, /IbisEligibility\.evaluate\('ibis-query-gemini','TEXT'/, 'serverAI() must evaluate ibis-query-gemini\'s real eligibility before invoking the function -- this is the control-bypass fix');
  assert.match(serverAiBody, /!=='ELIGIBLE'/, 'serverAI() must fail closed (not proceed) unless the provider is genuinely ELIGIBLE');
  // Regression guard: the eligibility check must appear textually BEFORE the ibis-query invoke call.
  const evalIdx = serverAiBody.indexOf("IbisEligibility.evaluate");
  const invokeIdx = serverAiBody.indexOf("Auth.invoke('ibis-query'");
  assert(evalIdx !== -1 && invokeIdx !== -1 && evalIdx < invokeIdx, 'eligibility must be checked BEFORE the server function is invoked, not after or not at all');
}

// --- 4. All five previously-timeout-less Edge Function fetch calls now have one. ---
{
  const targets = [
    'supabase/functions/ibis-assistant/index.ts',
    'supabase/functions/ibis-text-cloudflare/index.ts',
    'supabase/functions/ibis-image-cloudflare/index.ts',
    'supabase/functions/ibis-speech-cloudflare/index.ts',
  ];
  for (const file of targets) {
    const source = fs.readFileSync(file, 'utf8');
    const count = (source.match(/AbortSignal\.timeout\(/g) || []).length;
    const fetchCount = (source.match(/await fetch\(/g) || []).length;
    assert.equal(count, fetchCount, `${file}: every outbound fetch() call must carry a real AbortSignal.timeout(), found ${count} timeout(s) for ${fetchCount} fetch call(s)`);
  }
  // ibis-query's own API-key-in-URL fix: key must travel as a header now, not a query parameter.
  const querySource = fs.readFileSync('supabase/functions/ibis-query/index.ts', 'utf8');
  assert(!/[?&]key=\$\{encodeURIComponent\(key\)\}/.test(querySource), 'Gemini API key must not travel as a URL query parameter (log/proxy exposure risk)');
  assert.match(querySource, /"x-goog-api-key":\s*key/, 'Gemini API key must travel as the x-goog-api-key header instead');
}

// --- 5. Registry additive defaults (timeoutMs/privacyClassification/attributionRequired). ---
{
  const context = { window: {} };
  vm.runInContext(fs.readFileSync('js/ibis-provider-registry.js', 'utf8'), vm.createContext(context));
  const Providers = context.window.FTN.IbisProviders;

  const local = Providers.get('ibis-local-dsp');
  assert.equal(local.timeoutMs, 20000, 'local provider must still get a default timeoutMs even though it makes no network call, for schema completeness');
  assert.equal(local.privacyClassification, 'LOCAL_NO_EXTERNAL_TRANSMISSION');
  assert.equal(local.attributionRequired, false);

  const network = Providers.get('ibis-query-gemini');
  assert.equal(network.timeoutMs, 20000);
  assert.equal(network.privacyClassification, 'THIRD_PARTY_NETWORK_CALL');
  assert.equal(network.attributionRequired, true);
}

console.log('Phase 4A ibis routing consolidation: provenance schema, new default executors, TIMEOUT/NETWORK_ERROR distinction, serverAI eligibility gate, Edge Function timeouts, and registry defaults all verified.');
