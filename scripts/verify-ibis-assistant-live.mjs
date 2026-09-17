import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../config/public-runtime.json', import.meta.url), 'utf8'));
const base = config.supabase?.url;
const key = config.supabase?.publishableKey;
const endpoint = `${base}/functions/v1/ibis-assistant`;
if (!base || !key) throw new Error('Public Supabase runtime configuration is incomplete.');

async function post(body, timeoutMs = 30_000) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { origin: 'https://ftnplatform.org', apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`ibis-assistant HTTP ${response.status}: ${payload.error || 'invalid response'}`);
  return payload;
}

const health = await post({ action: 'health' });
if (!/^ibis-gateway-/.test(health.version || '')) throw new Error(`Unexpected gateway version: ${health.version || 'missing'}`);
if (!Array.isArray(health.providers) || typeof health.configuredProviders !== 'number') throw new Error('Provider health detail is missing.');

const arithmetic = await post({ messages: [{ role: 'user', content: 'What is 7 times 8?' }], products: [] });
if (arithmetic.answer !== '7 * 8 = 56.' || arithmetic.evidenceState !== 'DETERMINISTIC' || arithmetic.provider !== 'FTN ibis deterministic') throw new Error(`Deterministic proof failed: ${JSON.stringify(arithmetic)}`);

// Investor-demo safety proof: the historical browser TEXT payload does not include
// action:"canonical_query". Freshness-sensitive questions on that compatibility route must still
// be forced through the canonical search-grounded path and must never be answered by a bare model.
const legacyFresh = await post({
  messages: [{ role: 'user', content: 'What are the latest major business developments in Trinidad and Tobago?' }],
  products: [],
}, 55_000);
if (legacyFresh.answerClass !== 'CURRENT_WEB_RESEARCH') throw new Error(`Legacy freshness classification failed: ${JSON.stringify(legacyFresh)}`);
if (legacyFresh.evidenceState !== 'SEARCH_GROUNDED') throw new Error(`Legacy freshness grounding failed: ${JSON.stringify(legacyFresh)}`);
if (!Array.isArray(legacyFresh.sources) || !legacyFresh.sources.length || legacyFresh.sources.some((source) => !/^https:\/\//.test(source?.url || ''))) throw new Error(`Legacy freshness sources missing or invalid: ${JSON.stringify(legacyFresh)}`);
if (/don['’]?t have real[- ]?time access|cannot access real[- ]?time/i.test(legacyFresh.answer || '')) throw new Error(`Legacy freshness answer incorrectly denied live access: ${JSON.stringify(legacyFresh)}`);

// Investor-demo safety proof #2: the authorized-fallback path (browser-local execution declared
// authorized, then reported failed) must resend the ACTUAL question to the fallback provider, not
// a bare system prompt. Confirmed live before this fix: a plain ordinary question here answered
// with a generic greeting ("Wah gwaan? How can I assist you today?") because the provider closures
// were built from the record_execution_receipt request's own (nonexistent) `messages` array.
const ordinaryPlan = await post({ action: 'canonical_query', messages: [{ role: 'user', content: 'What is photosynthesis?' }], products: [] });
if (ordinaryPlan.executionInstruction?.executionAuthorized !== true || !ordinaryPlan.executionInstruction?.planId) {
  throw new Error(`Expected an authorized local-execution plan for an ordinary question: ${JSON.stringify(ordinaryPlan)}`);
}
const fallback = await post({
  action: 'record_execution_receipt',
  receipt: {
    planId: ordinaryPlan.executionInstruction.planId,
    executionTarget: 'browser_local',
    provider: 'browser_local_language_model',
    success: false,
    text: 'What is photosynthesis?',
    products: [],
  },
}, 30_000);
if (!/photosynthes|chlorophyll|sunlight|plants?.{0,20}(energy|glucose|light)/i.test(fallback.answer || '')) {
  throw new Error(`Authorized-fallback answer did not actually address the question: ${JSON.stringify(fallback)}`);
}

console.log(JSON.stringify({
  ok: true,
  endpoint,
  version: health.version,
  configuredProviders: health.configuredProviders,
  availableProviders: health.availableProviders,
  deterministicRequestId: arithmetic.requestId,
  legacyFreshnessRequestId: legacyFresh.requestId,
  legacyFreshnessEvidenceState: legacyFresh.evidenceState,
  legacyFreshnessSourceCount: legacyFresh.sources.length,
  legacyFreshnessProvider: legacyFresh.provider,
  authorizedFallbackRequestId: fallback.requestId,
  authorizedFallbackAnswerPreview: (fallback.answer || '').slice(0, 120),
}));
