import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../config/public-runtime.json', import.meta.url), 'utf8'));
const base = config.supabase?.url;
const key = config.supabase?.publishableKey;
const endpoint = `${base}/functions/v1/ibis-assistant`;
if (!base || !key) throw new Error('Public Supabase runtime configuration is incomplete.');

async function post(body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { origin: 'https://ftnplatform.org', apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
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

console.log(JSON.stringify({ ok: true, endpoint, version: health.version, configuredProviders: health.configuredProviders, availableProviders: health.availableProviders, deterministicRequestId: arithmetic.requestId }));
