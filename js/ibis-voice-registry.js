// FTN Platform — the IBIS voice identity registry (Phase 6). Exactly two authorized IBIS voice
// identities exist: IAN and SARAFINA. This module deliberately does NOT generate speech and does
// NOT include a reference audio ingestion path yet -- per the directive's own explicit ordering
// ("DO NOT ASK THE USER FOR VOICE SAMPLES YET"), that step only follows engine selection, license
// verification and deployment, none of which have happened (no GPU infrastructure exists in this
// environment -- see the VOICE_ENGINE_CANDIDATES note below). What this module DOES do, correctly
// scoped to what's real today: define the two authorized identities, keep voice, country, region,
// dialect and delivery style as separate, independent request parameters (never a second voice
// per dialect -- one IAN, one SARAFINA, each usable with any resolved dialect context), and
// implement the real, deterministic parameter-resolution priority order the directive specifies.
(function (global) {
  'use strict';

  var VOICES = [
    { id: 'ian', label: 'IAN', gender: 'male', status: 'AUTHORIZED_IDENTITY_NO_REFERENCE_AUDIO_YET' },
    { id: 'sarafina', label: 'SARAFINA', gender: 'female', status: 'AUTHORIZED_IDENTITY_NO_REFERENCE_AUDIO_YET' },
  ];

  // Real, primary-source-verified open-weight voice-cloning TTS candidates researched this pass.
  // Neither is deployed -- both require a GPU this environment does not have. Recorded here so a
  // founder infrastructure decision has real, current options rather than starting from zero.
  var VOICE_ENGINE_CANDIDATES = [
    {
      id: 'chatterbox', name: 'Chatterbox (Resemble AI)', license: 'MIT', licenseVerified: true,
      verificationSource: 'https://huggingface.co/ResembleAI/chatterbox', lastVerified: '2026-08-21',
      cloningMethod: 'Reference-audio voice cloning (pass an audio prompt file to generate())',
      hardware: 'GPU required (CUDA), ~500M parameters (0.5B Llama backbone); exact VRAM not quantified by the primary source fetched this pass',
      note: 'Commercial use, modification and redistribution all explicitly permitted under MIT. The realistic path to a Caribbean-accented IAN/SARAFINA voice is cloning FROM a real Trinidadian-accented reference recording, not a pretrained "Trinidadian English" model -- no such pretrained model exists (Phase 3B/4 research already established this).',
    },
    {
      id: 'qwen3-tts', name: 'Qwen3-TTS (Alibaba Cloud / Qwen team)', license: 'Apache-2.0', licenseVerified: true,
      verificationSource: 'https://github.com/QwenLM/Qwen3-TTS/blob/main/LICENSE', lastVerified: '2026-08-21',
      cloningMethod: '3-second reference-audio voice cloning (per official repository README)',
      hardware: 'GPU required; 0.6B (faster) and 1.7B (higher quality) variants; exact VRAM not quantified by the primary source fetched this pass',
      note: 'Apache 2.0 explicitly permits commercial use; carries the standard Apache 2.0 NOTICE-file obligation if redistributed. A viable alternative to Chatterbox, not evaluated as deeply this pass -- recorded as a real candidate, not a runner-up assumption.',
    },
  ];

  function get(id) { return VOICES.filter(function (v) { return v.id === id; })[0] || null; }
  function all() { return VOICES.slice(); }
  function engineCandidates() { return VOICE_ENGINE_CANDIDATES.slice(); }

  // The real, deterministic resolution order the directive specifies (Sec 32):
  //   explicit request > UI selection > account context > project context > default
  // Each layer is optional; the first one present wins. Never mutates any of the inputs (in
  // particular, never writes back to account settings from a single request -- the directive's
  // own explicit prohibition).
  function resolveDialectContext(params) {
    params = params || {};
    var layers = ['explicitRequest', 'uiSelection', 'accountContext', 'projectContext'];
    for (var i = 0; i < layers.length; i++) {
      var layer = params[layers[i]];
      if (layer && (layer.country || layer.dialect)) {
        return { source: layers[i], country: layer.country || null, region: layer.region || null, dialect: layer.dialect || null, deliveryStyle: layer.deliveryStyle || null };
      }
    }
    return { source: 'default', country: null, region: null, dialect: null, deliveryStyle: params.defaultDeliveryStyle || 'neutral' };
  }

  // A voice request is always {voiceId, ...resolved dialect context} -- voice identity and
  // dialect context are represented separately and combined only at the point of request, never
  // pre-baked into a per-dialect voice variant (Sec 25's explicit requirement).
  function buildVoiceRequest(voiceId, dialectParams) {
    var voice = get(voiceId);
    if (!voice) return { valid: false, reason: 'Unknown voice id "' + voiceId + '". Only "ian" and "sarafina" are authorized.' };
    var context = resolveDialectContext(dialectParams);
    return { valid: true, voiceId: voice.id, voiceLabel: voice.label, country: context.country, region: context.region, dialect: context.dialect, deliveryStyle: context.deliveryStyle, contextSource: context.source };
  }

  global.FTN = global.FTN || {};
  global.FTN.IbisVoiceRegistry = { all: all, get: get, engineCandidates: engineCandidates, resolveDialectContext: resolveDialectContext, buildVoiceRequest: buildVoiceRequest };
})(typeof window !== 'undefined' ? window : globalThis);
