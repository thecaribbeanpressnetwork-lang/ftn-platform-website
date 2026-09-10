// FTN Platform — universal IBIS provider fabric extension.
// Purpose: every provider-backed capability enters the same route: capability -> eligibility ->
// ranked provider -> adapter -> artifact validation -> provenance. This file extends the shipped
// IbisClient without changing its permission/economics gates.
(function (global) {
  'use strict';
  var FTN = global.FTN = global.FTN || {};
  if (!FTN.IbisClient || !FTN.IbisEligibility) return;

  var PUBLISHABLE_KEY = 'sb_publishable_-1v6ZXAU3sXc7Z0L2VnFgw_638Qxu3z';
  var SUPABASE = 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/';
  var DEFAULT_TIMEOUT_MS = 20000;

  var ENDPOINTS = {
    IMAGE_GENERATION: {
      'cloudflare-workers-ai-image-flux': SUPABASE + 'ibis-image-cloudflare',
      'cloudflare-workers-ai-image-sdxl': SUPABASE + 'ibis-image-cloudflare',
    },
    TEXT_TO_SPEECH: {
      'cloudflare-workers-ai-aura-tts': SUPABASE + 'ibis-speech-cloudflare',
    },
    SPEECH_TO_TEXT: {
      'cloudflare-workers-ai-whisper': SUPABASE + 'ibis-speech-cloudflare',
    },
    AUDIO_TRANSCRIPTION: {
      'cloudflare-workers-ai-whisper': SUPABASE + 'ibis-speech-cloudflare',
    },
    VIDEO_GENERATION: {
      'bytez-video-ltx': SUPABASE + 'ibis-video-bytez',
      'bytez-ltx-video': SUPABASE + 'ibis-video-bytez',
      'ibis-video-bytez': SUPABASE + 'ibis-video-bytez',
      'ltx-api': SUPABASE + 'ibis-video-ltx',
      'ltx-video-api': SUPABASE + 'ibis-video-ltx',
    },
    TEXT_TO_VIDEO: {
      'bytez-video-ltx': SUPABASE + 'ibis-video-bytez',
      'bytez-ltx-video': SUPABASE + 'ibis-video-bytez',
      'ibis-video-bytez': SUPABASE + 'ibis-video-bytez',
      'ltx-api': SUPABASE + 'ibis-video-ltx',
      'ltx-video-api': SUPABASE + 'ibis-video-ltx',
    },
  };

  function timeoutSignal(ms) {
    if (typeof AbortController === 'undefined') return { signal: undefined, clear: function () {} };
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms || DEFAULT_TIMEOUT_MS);
    return { signal: controller.signal, clear: function () { clearTimeout(timer); } };
  }

  function asPrompt(payload) {
    if (!payload) return '';
    if (typeof payload.prompt === 'string') return payload.prompt.trim();
    if (typeof payload.text === 'string') return payload.text.trim();
    if (Array.isArray(payload.messages)) return payload.messages.map(function (m) { return (m && m.content) || ''; }).join('\n').trim();
    return '';
  }

  function postJson(url, body, timeoutMs) {
    var startedAt = Date.now();
    var t = timeoutSignal(timeoutMs || DEFAULT_TIMEOUT_MS);
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUBLISHABLE_KEY, authorization: 'Bearer ' + PUBLISHABLE_KEY },
      body: JSON.stringify(body || {}),
      signal: t.signal,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) { return { ok: r.ok, status: r.status, body: body, latencyMs: Date.now() - startedAt }; });
    }).catch(function (err) {
      return { ok: false, status: 0, body: { error: err && err.name === 'AbortError' ? 'timeout' : 'network' }, latencyMs: Date.now() - startedAt };
    }).finally(t.clear);
  }

  function providerEndpoints(capability) {
    var endpoints = Object.assign({}, ENDPOINTS[capability] || {});
    var canon = FTN.CapabilityTaxonomy && FTN.CapabilityTaxonomy.canonicalEquivalent ? FTN.CapabilityTaxonomy.canonicalEquivalent(capability) : null;
    if (canon && ENDPOINTS[canon]) endpoints = Object.assign(endpoints, ENDPOINTS[canon]);
    return endpoints;
  }

  function validateImage(body) {
    if (!body || typeof body.image !== 'string' || body.image.length < 1000) return null;
    var mime = body.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    return { image: body.image, mimeType: mime, extension: body.extension || (mime === 'image/png' ? 'png' : 'jpg'), model: body.model || null, generatedAt: body.generatedAt || null };
  }

  function validateAudio(body) {
    if (!body) return null;
    if (typeof body.audio === 'string' && body.audio.length > 1000) return { audio: body.audio, mimeType: body.mimeType || 'audio/mpeg', extension: body.extension || 'mp3', model: body.model || null, generatedAt: body.generatedAt || null };
    if (typeof body.text === 'string') return { text: body.text, segments: body.segments || [], vtt: body.vtt || null, wordCount: body.wordCount || null, model: body.model || null, generatedAt: body.generatedAt || null };
    return null;
  }

  function validateVideo(body) {
    if (!body) return null;
    if (typeof body.videoUrl === 'string' && /^https:\/\//i.test(body.videoUrl)) return { videoUrl: body.videoUrl, provider: body.provider || null, model: body.model || null, modelLicense: body.modelLicense || null, generatedAt: body.generatedAt || body.submittedAt || null, nativeTextToVideo: true, jobId: body.jobId || null, status: body.status || 'ready' };
    if (typeof body.video === 'string' && body.video.length > 1000) return { video: body.video, mimeType: body.mimeType || 'video/mp4', extension: body.extension || 'mp4', provider: body.provider || null, model: body.model || null, generatedAt: body.generatedAt || null, nativeTextToVideo: true };
    if (typeof body.jobId === 'string') return { jobId: body.jobId, status: body.status || 'submitted', provider: body.provider || null, model: body.model || null, quote: body.quote || null, nativeTextToVideo: true, generatedAt: body.submittedAt || null };
    return null;
  }

  function callImage(provider, payload, endpoint) {
    var prompt = asPrompt(payload);
    if (!prompt) return Promise.resolve({ success: false, errorType: 'INVALID_REQUEST' });
    return postJson(endpoint, { prompt: prompt, providerId: provider.id }, provider.timeoutMs).then(function (r) {
      var data = r.ok ? validateImage(r.body) : null;
      if (data) return { success: true, latencyMs: r.latencyMs, data: data };
      return { success: false, latencyMs: r.latencyMs, errorType: r.status === 401 || r.status === 403 ? 'AUTH_FAILURE' : r.status === 429 ? 'RATE_LIMIT' : r.status === 402 ? 'QUOTA' : 'SERVER_ERROR' };
    });
  }

  function callSpeech(provider, payload, endpoint, capability) {
    var body = capability === 'TEXT_TO_SPEECH' ? { mode: 'speak', text: asPrompt(payload) } : { mode: 'transcribe', audio: payload && payload.audio };
    if ((body.mode === 'speak' && !body.text) || (body.mode === 'transcribe' && !body.audio)) return Promise.resolve({ success: false, errorType: 'INVALID_REQUEST' });
    return postJson(endpoint, body, provider.timeoutMs).then(function (r) {
      var data = r.ok ? validateAudio(r.body) : null;
      if (data) return { success: true, latencyMs: r.latencyMs, data: data };
      return { success: false, latencyMs: r.latencyMs, errorType: r.status === 401 || r.status === 403 ? 'AUTH_FAILURE' : r.status === 429 ? 'RATE_LIMIT' : r.status === 402 ? 'QUOTA' : 'SERVER_ERROR' };
    });
  }

  function callVideo(provider, payload, endpoint) {
    var prompt = asPrompt(payload);
    if (!prompt) return Promise.resolve({ success: false, errorType: 'INVALID_REQUEST' });
    var body;
    if (/ibis-video-bytez$/.test(endpoint)) {
      body = { action: payload && payload.confirmFreeCreditUse ? 'prove_open_model' : 'generate', prompt: prompt, confirmFreeCreditUse: !!(payload && payload.confirmFreeCreditUse) };
    } else {
      body = { action: 'generate', prompt: prompt, duration: (payload && payload.duration) || 6, resolution: (payload && payload.resolution) || '1280x720', approvedCostUsd: payload && payload.approvedCostUsd, confirmPaidGeneration: payload && payload.confirmPaidGeneration === true };
    }
    return postJson(endpoint, body, Math.max(provider.timeoutMs || DEFAULT_TIMEOUT_MS, 180000)).then(function (r) {
      var data = r.ok || r.status === 202 ? validateVideo(r.body) : null;
      if (data) return { success: true, latencyMs: r.latencyMs, data: data };
      return { success: false, latencyMs: r.latencyMs, errorType: r.status === 401 || r.status === 403 ? 'AUTH_FAILURE' : r.status === 429 ? 'RATE_LIMIT' : r.status === 402 ? 'QUOTA' : r.status === 409 ? 'INVALID_REQUEST' : r.status === 503 ? 'UNSUPPORTED' : 'SERVER_ERROR' };
    });
  }

  function executorFor(capability, payload) {
    var endpoints = providerEndpoints(capability);
    if (!Object.keys(endpoints).length) return null;
    return function (provider) {
      var endpoint = endpoints[provider.id];
      if (!endpoint) return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
      if (capability === 'IMAGE_GENERATION' || capability === 'TEXT_TO_IMAGE') return callImage(provider, payload, endpoint);
      if (capability === 'TEXT_TO_SPEECH' || capability === 'SPEECH_TO_TEXT' || capability === 'AUDIO_TRANSCRIPTION') return callSpeech(provider, payload, endpoint, capability);
      if (capability === 'VIDEO_GENERATION' || capability === 'TEXT_TO_VIDEO') return callVideo(provider, payload, endpoint);
      return Promise.resolve({ success: false, errorType: 'UNSUPPORTED' });
    };
  }

  var originalRequest = FTN.IbisClient.request;
  var originalDefaultExecutorFor = FTN.IbisClient.defaultExecutorFor;

  FTN.IbisClient.defaultExecutorFor = function (capability, payload) {
    return executorFor(capability, payload) || originalDefaultExecutorFor(capability, payload);
  };

  FTN.IbisClient.request = function (spec) {
    spec = Object.assign({}, spec || {});
    if (!spec.executor) {
      var ex = executorFor(spec.capability, spec.payload);
      if (ex) spec.executor = ex;
    }
    return originalRequest(spec);
  };

  FTN.IbisProviderFabric = { version: '0.1.0', endpoints: ENDPOINTS, executorFor: executorFor, validateImage: validateImage, validateAudio: validateAudio, validateVideo: validateVideo };
})(typeof window !== 'undefined' ? window : globalThis);
