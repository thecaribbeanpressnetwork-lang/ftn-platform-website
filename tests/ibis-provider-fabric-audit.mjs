// IBIS provider fabric acceptance: provider-backed capabilities must use one router, automatic
// failover, real artifact validation, and provenance. This is deliberately fixture-backed: it
// proves routing behavior without spending provider credits.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function loadBase(fetchImpl) {
  const context = { window: {}, fetch: fetchImpl, setTimeout, clearTimeout, AbortController, Date, console };
  vm.createContext(context);
  for (const file of [
    'js/product-registry-data.js',
    'js/ftn-node-registry.js',
    'js/ibis-provider-registry.js',
    'js/ibis-eligibility.js',
    'js/ibis-capability-taxonomy.js',
    'js/ibis-client.js',
    'js/ibis-provider-fabric.js',
  ]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context;
}

function installRegistry(context, providers) {
  const all = () => providers.map(p => Object.assign({ timeoutMs: 20000, userAuthorizationRequired: false }, p));
  context.window.FTN.IbisProviders = {
    all,
    byCapability: capability => all().filter(p => (p.capabilities || []).includes(capability)),
    byCategory: category => all().filter(p => (p.categories || []).includes(category)),
    get: id => all().find(p => p.id === id) || null,
  };
}

function eligible(id, capability, extra = {}) {
  return Object.assign({
    id,
    name: id,
    enabled: true,
    capabilities: [capability],
    categories: [],
    costToIbis: 'ZERO_COST_TO_IBIS',
    integration: 'NATIVE_API_CANDIDATE',
    apiStatus: 'LIVE',
    modelId: id + '-model',
  }, extra);
}

const jpeg = 'x'.repeat(2048);
const mp3 = 'm'.repeat(2048);
const video = 'v'.repeat(2048);

// IMAGE_GENERATION: first eligible provider fails, second succeeds; provenance records both.
{
  const calls = [];
  const context = loadBase(async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    if (calls.length === 1) return { ok: false, status: 502, json: async () => ({ error: 'upstream down' }) };
    return { ok: true, status: 200, json: async () => ({ image: jpeg, mimeType: 'image/jpeg', extension: 'jpg', model: 'flux-test' }) };
  });
  installRegistry(context, [
    eligible('cloudflare-workers-ai-image-flux', 'IMAGE_GENERATION'),
    eligible('cloudflare-workers-ai-image-sdxl', 'IMAGE_GENERATION'),
  ]);
  const result = await context.window.FTN.IbisClient.request({ nodeId: 'ibis-ai', capability: 'IMAGE_GENERATION', payload: { prompt: 'red ibis over Tobago' } });
  assert.equal(result.success, true);
  assert.equal(result.provenance.provider, 'cloudflare-workers-ai-image-sdxl');
  assert.deepEqual(result.provenance.attempts.map(a => [a.providerId, a.success]), [
    ['cloudflare-workers-ai-image-flux', false],
    ['cloudflare-workers-ai-image-sdxl', true],
  ]);
  assert.equal(result.result.mimeType, 'image/jpeg');
  assert.equal(calls.length, 2, 'Image generation must not stop after the first provider failure');
}

// TEXT_TO_SPEECH: generic speech is routed through the same fabric and validates a real artifact
// shape before returning success.
{
  const calls = [];
  const context = loadBase(async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ audio: mp3, mimeType: 'audio/mpeg', extension: 'mp3', model: '@cf/deepgram/aura-2-en' }) };
  });
  installRegistry(context, [eligible('cloudflare-workers-ai-aura-tts', 'TEXT_TO_SPEECH')]);
  const result = await context.window.FTN.IbisClient.request({ nodeId: 'ibis-ai', capability: 'TEXT_TO_SPEECH', payload: { text: 'FTN Platform connects the Caribbean.' } });
  assert.equal(result.success, true);
  assert.equal(result.provenance.provider, 'cloudflare-workers-ai-aura-tts');
  assert.equal(result.result.mimeType, 'audio/mpeg');
  assert.equal(calls[0].body.mode, 'speak');
}

// SPEECH_TO_TEXT / AUDIO_TRANSCRIPTION: transcription routes use mode=transcribe and return text,
// not a fake audio artifact.
{
  const calls = [];
  const context = loadBase(async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ text: 'FTN platform connects the Caribbean.', segments: [], vtt: 'WEBVTT', model: '@cf/openai/whisper-large-v3-turbo' }) };
  });
  installRegistry(context, [eligible('cloudflare-workers-ai-whisper', 'SPEECH_TO_TEXT')]);
  const result = await context.window.FTN.IbisClient.request({ nodeId: 'ibis-ai', capability: 'SPEECH_TO_TEXT', payload: { audio: 'base64-audio' } });
  assert.equal(result.success, true);
  assert.equal(result.result.text, 'FTN platform connects the Caribbean.');
  assert.equal(calls[0].body.mode, 'transcribe');
}

// VIDEO_GENERATION: Bytez can fail and IBIS must fall through to the next eligible video route.
// This proves the product contract: Bytez is a route, not the route.
{
  const calls = [];
  const context = loadBase(async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    if (/ibis-video-bytez/.test(url)) return { ok: false, status: 502, json: async () => ({ error: 'Bytez upstream rejected model' }) };
    return { ok: true, status: 200, json: async () => ({ video: video, mimeType: 'video/mp4', extension: 'mp4', provider: 'FallbackVideo', model: 'fallback-open-video' }) };
  });
  installRegistry(context, [
    eligible('ibis-video-bytez', 'VIDEO_GENERATION'),
    eligible('ltx-video-api', 'VIDEO_GENERATION', { costToIbis: 'ZERO_CUSTOMER_FUNDED' }),
  ]);
  const result = await context.window.FTN.IbisClient.request({ nodeId: 'ibis-ai', capability: 'VIDEO_GENERATION', payload: { prompt: 'scarlet ibis over Buccoo Reef', confirmFreeCreditUse: true } });
  assert.equal(result.success, true);
  assert.equal(result.provenance.provider, 'ltx-video-api');
  assert.deepEqual(result.provenance.attempts.map(a => [a.providerId, a.success]), [
    ['ibis-video-bytez', false],
    ['ltx-video-api', true],
  ]);
  assert.equal(result.result.nativeTextToVideo, true);
  assert.equal(calls.length, 2, 'Video must continue after Bytez fails when another eligible provider exists');
}

// VIDEO_GENERATION must fail honestly when every eligible route fails, with all attempts retained.
{
  const context = loadBase(async () => ({ ok: false, status: 503, json: async () => ({ error: 'not configured' }) }));
  installRegistry(context, [
    eligible('ibis-video-bytez', 'VIDEO_GENERATION'),
    eligible('ltx-video-api', 'VIDEO_GENERATION'),
  ]);
  const result = await context.window.FTN.IbisClient.request({ nodeId: 'ibis-ai', capability: 'VIDEO_GENERATION', payload: { prompt: 'scarlet ibis over Tobago', confirmFreeCreditUse: true } });
  assert.equal(result.success, false);
  assert.equal(result.code, 'ALL_PROVIDERS_FAILED');
  assert.deepEqual(result.provenance.attempts.map(a => a.providerId), ['ibis-video-bytez', 'ltx-video-api']);
}

// Unsupported provider ids must not be relabeled as working just because the capability is known.
{
  const context = loadBase(async () => { throw new Error('network should not be called'); });
  installRegistry(context, [eligible('unknown-video-provider', 'VIDEO_GENERATION')]);
  const result = await context.window.FTN.IbisClient.request({ nodeId: 'ibis-ai', capability: 'VIDEO_GENERATION', payload: { prompt: 'test' } });
  assert.equal(result.success, false);
  assert.equal(result.code, 'ALL_PROVIDERS_FAILED');
  assert.equal(result.provenance.attempts[0].errorType, 'UNSUPPORTED');
}

console.log('ibis-provider-fabric-audit: image, speech, transcription and video all route through one failover fabric; Bytez failure falls through; unsupported routes fail honestly.');
